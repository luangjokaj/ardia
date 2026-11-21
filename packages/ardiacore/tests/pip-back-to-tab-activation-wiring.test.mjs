import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const read = (name) => readFileSync(fileURLToPath(new URL(name, import.meta.url)), "utf8");
const controller = read("../ios/ArdiaPiPController.mm");
const pip = read("../ios/ArdiaPictureInPicture.mm");
const webView = read("../ios/ArdiaWebView+PictureInPicture.mm");
const webKit = read("../ios/WebKitTab+UIDelegate.swift");
const host = read("../ios/ArdiaChromeWindowHost.h");

const body = (source, header) => {
  const start = source.indexOf(header);
  assert.ok(start >= 0, `missing ${header}`);
  const end = source.indexOf("\n}\n", start);
  return source.slice(start, end < 0 ? source.length : end);
};

test("Back to Tab activates the app over the frontmost app, as Chromium does, not with a cooperative request macOS can decline", () => {
  const activate = body(pip, "BOOL ActivateApp(NSString *why)");
  assert.match(activate, /\[NSApp activateIgnoringOtherApps:YES\]/);
  assert.doesNotMatch(activate, /\[NSApp activate\]/);
  const mark = activate.indexOf("MarkBackToTabActivation()");
  assert.ok(mark >= 0 && mark < activate.indexOf("activateIgnoringOtherApps:YES"));
  assert.match(activate, /fromOtherApp = !NSApp\.isActive/);
});

test("every way back to the tab goes through the one activation and says whether another app was in front", () => {
  assert.match(body(controller, "- (void)backToTab {"), /fromOtherApp = ActivateApp\(@"Back to Tab \(menu\)"\);[\s\S]*@"fromOtherApp" : @\(fromOtherApp\)/);
  assert.match(body(pip, "BOOL TabRequestedActivation(ArdiaWebView *view, BOOL *fromOtherApp)"), /if \(window\.hasShadow\) continue;\s*\*fromOtherApp = ActivateApp\(@"Back to Tab \(Chrome's button\)"\);\s*return YES;[\s\S]*return NO;/);
  assert.match(body(pip, "+ (BOOL)activateForPictureInPictureReturn"), /return ActivateApp\(/);
  assert.match(host, /\+ \(BOOL\)activateForPictureInPictureReturn;/);
  assert.match(webView, /backToTab = ardia_pip::TabRequestedActivation\(self, &fromOtherApp\);[\s\S]*@"reason" : backToTab \? @"pictureInPicture" : reason[\s\S]*@"fromOtherApp" : @\(fromOtherApp\)/);
  const webKitBack = body(webKit, "func webViewFullscreenMayReturnToInline");
  assert.match(webKitBack, /ArdiaChromeWindowHost\.activateForPictureInPictureReturn\(\)/);
  assert.doesNotMatch(webKitBack, /NSApp\.activate\(\)/);
  assert.match(webKitBack, /"fromOtherApp": fromOtherApp/);
});
