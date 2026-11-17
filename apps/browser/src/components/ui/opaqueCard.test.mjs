import assert from "node:assert/strict";
import { test } from "node:test";
const { themeFor, profileTheme } = await import("./theme.ts");
const { opaqueCard, prePaintColor } = await import("./opaqueCard.ts");

test("a tab's pre-paint colour is the card over an active window, with no warm cast in a neutral profile", () => {
  assert.equal(prePaintColor(themeFor("neutral:dark")), "#161616");
  assert.equal(prePaintColor(themeFor("plum:dark")), "#221C1D");
  assert.equal(prePaintColor(themeFor("neutral:light")), "#FBFBFB");
  assert.equal(prePaintColor(themeFor("plum:light")), "#F9F4F5");
});

test("the inactive window tint stays as it was for everything else", () => {
  assert.deepEqual(themeFor("neutral:dark").windowTint, ["#1F1B1A", "#231F1E"]);
  assert.equal(opaqueCard(themeFor("neutral:dark")), "#191717");
});

test("a custom theme's pre-paint colour is its card over its own opaque tint", () => {
  const custom = { stops: [{ color: { r: 0.2, g: 0.4, b: 0.8, a: 1 }, x: 0.5, y: 0.5 }], intensity: 0.6, grain: 0, texture: "grain", translucency: 1, mode: "dark" };
  const theme = profileTheme({ color: "plum", theme: custom }, true, "own");
  assert.equal(prePaintColor(theme), opaqueCard(theme));
});
