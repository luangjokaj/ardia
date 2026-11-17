import assert from "node:assert/strict";
import { test } from "node:test";
const native = await import("../../test-native/index.ts");
const { useBrowser } = await import("../browser/store.ts");
const { usePages } = await import("../tabs/pageState.ts");
const { useExtensions } = await import("./store.ts");
const { refreshActionStates } = await import("./actionStates.ts");
const panels = await import("./sidePanels.ts");
const { extensionMenuItems } = await import("./actions.ts");

const S = () => useBrowser.getState();
const E = () => useExtensions.getState();
const EXT = { id: "ext", name: "Ext", enabled: true, pinned: true, hasAction: true, incognito: false, sidePanel: "panel.html" };

function setup() {
  S().hydrate({});
  const w = S().createWindow({ url: "a.com" });
  const a = S().windows[w].tabIds[0];
  const b = S().newTab(w, { url: "b.com", background: true });
  usePages.setState({ ready: { [a]: 1, [b]: 2 } });
  useExtensions.setState({ lists: { "": [EXT] }, actions: {}, popup: null, sidePanels: {} });
  const asked = [];
  const ask = (what) => (tabId, _arg, profile) => new Promise((resolve) => asked.push({ what, tabId, profile, resolve }));
  native.extensionAnswers.actionStates = ask("states");
  native.extensionAnswers.sidePanelUrl = ask("panel");
  const answer = async (i, value) => {
    asked[i].resolve(value);
    await new Promise((r) => setImmediate(r));
  };
  return { w, a, b, asked, answer };
}

test("a tab switch while a tab's states are on their way gets its own states right after, with no timer", async () => {
  const { a, b, asked, answer } = setup();
  S().activate(a);
  const first = refreshActionStates();
  assert.deepEqual(asked.map((x) => x.tabId), [a]);
  S().activate(b);
  const second = refreshActionStates();
  assert.equal(asked.length, 1, "one pass at a time");
  await answer(0, { ext: { badgeText: "A" } });
  assert.deepEqual(asked.map((x) => x.tabId), [a, b], "the switch ran a pass as soon as the first ended");
  await answer(1, { ext: { badgeText: "B" } });
  await Promise.all([first, second]);
  assert.equal(E().actions[a].ext.badgeText, "A");
  assert.equal(E().actions[b].ext.badgeText, "B");
});

test("a profile switched into another profile's window asks for its tab's states and side panel in its own profile", async () => {
  const { w, answer, asked } = setup();
  const { engineProfile } = await import("../browser/model.ts");
  const aurum = S().createProfile({ name: "Aurum" });
  S().switchProfile(w, aurum);
  const tab = S().newTab(w, { url: "c.com" });
  const profile = engineProfile(S(), aurum);
  assert.notEqual(profile, "");
  usePages.setState({ ready: { ...usePages.getState().ready, [tab]: 3 } });
  useExtensions.setState({ lists: { "": [EXT], [profile]: [EXT] } });
  const states = refreshActionStates();
  const opened = panels.openSidePanel(w, "ext");
  assert.deepEqual(asked.map((x) => [x.what, x.tabId, x.profile]), [["states", tab, profile], ["panel", tab, profile]]);
  await answer(0, {});
  await answer(1, null);
  await Promise.all([states, opened]);
  panels.closeSidePanel(w);
});

test("A→B→A shows A's side panel whatever order Chrome answers in", async () => {
  const { w, a, b, asked, answer } = setup();
  const opened = panels.openSidePanel(w, "ext");
  await answer(0, "chrome-extension://ext/a.html");
  await opened;
  assert.equal(E().sidePanels[w].url, "chrome-extension://ext/a.html");
  S().activate(b);
  void panels.syncSidePanel(w);
  S().activate(a);
  void panels.syncSidePanel(w);
  assert.deepEqual(asked.map((x) => x.tabId), [a, b, a]);
  await answer(2, "chrome-extension://ext/a.html");
  await answer(1, "chrome-extension://ext/b.html");
  assert.equal(E().sidePanels[w].url, "chrome-extension://ext/a.html", "B's late answer is dropped");
  panels.closeSidePanel(w);
});

test("a second click on the side panel button while it opens closes it", async () => {
  const { w, asked, answer } = setup();
  const opening = panels.toggleSidePanel(w, "ext");
  panels.toggleSidePanel(w, "ext");
  await answer(0, "chrome-extension://ext/a.html");
  await opening;
  assert.equal(E().sidePanels[w], undefined);
  assert.deepEqual(panels.wantedSidePanels(), []);
  assert.equal(asked.length, 1);
});

test("closing the side panel while it opens keeps it closed", async () => {
  const { w, answer } = setup();
  const opening = panels.openSidePanel(w, "ext");
  panels.closeSidePanel(w, "ext");
  await answer(0, "chrome-extension://ext/a.html");
  await opening;
  assert.equal(E().sidePanels[w], undefined);
});

const G = { control: "⌃", option: "⌥", shift: "⇧", command: "⌘" };
const keys = (i) => (i.key ? ["control", "option", "shift", "command"].filter((m) => i.modifiers?.includes(m)).map((m) => G[m]).join("") + i.key.toUpperCase() : "");
const render = (items, depth = 0) =>
  items.flatMap((i) => [
    "  ".repeat(depth) + (i.separator ? "---" : [i.checked ? "✓" : "", i.title, keys(i), i.symbol ? `[${i.symbol}]` : "", i.swatch ? "(swatch)" : "", i.enabled === false ? "(off)" : "", i.children ? "›" : ""].filter(Boolean).join(" ")),
    ...(i.children ? render(i.children, depth + 1) : []),
  ]);

const ext = { name: "Dark Reader", enabled: true, pinned: false, optionsUrl: "chrome-extension://x/options.html", sidePanel: false, mayModify: true };

test("an extension's menu: its name, Options and Pin, Turn Off and Manage Extension, Remove Extension… last", () => {
  assert.deepEqual(render(extensionMenuItems(ext, false)), [
    "Dark Reader (off)",
    "---",
    "Options [gearshape]",
    "Pin to Toolbar [pin]",
    "---",
    "Turn Off [power]",
    "Manage Extension [puzzlepiece.extension]",
    "---",
    "Remove Extension… [trash]",
  ]);
  assert.deepEqual(render(extensionMenuItems({ ...ext, pinned: true, sidePanel: true, mayModify: false }, true)).slice(2, 5), [
    "Options [gearshape]",
    "Close Side Panel [sidebar.right]",
    "Unpin from Toolbar [pin.slash]",
  ]);
  const off = render(extensionMenuItems({ ...ext, enabled: false, sidePanel: true }, false));
  assert.deepEqual(off.slice(2, 4), ["Options [gearshape] (off)", "Pin to Toolbar [pin]"]);
  assert.equal(off[5], "Turn On [power]");
});

const { windowExtensions, pageProfile } = await import("./store.ts");
const { openOptions } = await import("./actions.ts");

function privateSetup() {
  S().hydrate({});
  const regular = S().createWindow({ url: "a.com" });
  const priv = S().createWindow({ kind: "private", url: "b.com" });
  const spanning = { ...EXT, id: "spanning", incognito: true, incognitoSplit: false, optionsUrl: "chrome-extension://spanning/options.html" };
  const split = { ...EXT, id: "split", incognito: true, incognitoSplit: true, optionsUrl: "chrome-extension://split/options.html" };
  const list = [spanning, split, { ...EXT, id: "kept-out" }, { ...EXT, id: "turned-off", incognito: true, enabled: false }];
  useExtensions.setState({ lists: { "": list }, actions: {}, popup: null, sidePanels: {} });
  const urls = (w) => S().windows[w].tabIds.map((id) => S().tabs[id].url);
  return { regular, priv, spanning, split, urls };
}

test("a private window shows the extensions allowed in incognito, spanning ones too (#909)", () => {
  const { regular, priv } = privateSetup();
  assert.deepEqual(windowExtensions(S(), priv).map((x) => x.id), ["spanning", "split"]);
  assert.deepEqual(windowExtensions(S(), regular).map((x) => x.id), ["spanning", "split", "kept-out"]);
  assert.equal(pageProfile(S(), priv), `incognito:${priv}@`, "Chrome picks the popup's profile from the private window's Browser");
});

test("Options from a private window: a spanning extension's page opens in its profile's regular window, as in Chrome", () => {
  const { regular, priv, spanning, split, urls } = privateSetup();
  openOptions(priv, split);
  assert.deepEqual(urls(priv).slice(1), [split.optionsUrl], "a split extension's page loads privately");
  openOptions(priv, spanning);
  assert.ok(!urls(priv).includes(spanning.optionsUrl), "a spanning extension's page can't load in incognito");
  assert.deepEqual(urls(regular).slice(1), [spanning.optionsUrl]);

  S().closeWindow(regular);
  const before = new Set(S().windowOrder);
  openOptions(priv, spanning);
  const made = S().windowOrder.filter((id) => !before.has(id));
  assert.equal(made.length, 1, "with no regular window of the profile open, one opens");
  assert.equal(S().windows[made[0]].kind, "main");
  assert.deepEqual(urls(made[0]), [spanning.optionsUrl]);
});

test("with several profiles, a private window lists and opens only its own profile's extensions", () => {
  S().hydrate({});
  const personal = S().createWindow({ url: "a.com" });
  const workId = S().createProfile({ name: "Work" });
  const work = S().createWindow({ profileId: workId, url: "b.com" });
  const privPersonal = S().createWindow({ kind: "private", profileId: "default", url: "c.com" });
  const privWork = S().createWindow({ kind: "private", profileId: workId, url: "d.com" });
  const shared = { ...EXT, id: "shared", incognito: true, optionsUrl: "chrome-extension://shared/options.html" };
  useExtensions.setState({
    lists: { "": [{ ...shared, incognito: false }, { ...EXT, id: "only-personal", incognito: true }], [workId]: [shared, { ...EXT, id: "only-work", incognito: true }] },
    actions: {}, popup: null, sidePanels: {},
  });
  assert.deepEqual(windowExtensions(S(), privPersonal).map((x) => x.id), ["only-personal"], "the same extension, allowed in Work alone");
  assert.deepEqual(windowExtensions(S(), privWork).map((x) => x.id), ["shared", "only-work"]);
  assert.equal(pageProfile(S(), privWork), `incognito:${privWork}@${workId}`);

  S().setFocusedWindow(personal);
  S().setFocusedWindow(privWork);
  openOptions(privWork, shared);
  const urls = (w) => S().windows[w].tabIds.map((id) => S().tabs[id].url);
  assert.deepEqual(urls(work).slice(1), [shared.optionsUrl], "Work's regular window, though Personal's was used last");
  assert.ok(!urls(personal).includes(shared.optionsUrl) && !urls(privWork).includes(shared.optionsUrl));
});

const { addFromWebStore, openInExtensionProfile, openWebStore, openWebStoreFor } = await import("./actions.ts");
const { SETTINGS_WINDOW_ID } = await import("../settings/settingsWindows.ts");

test("Settings › Extensions opens the store and an extension's pages in the profile it shows, whichever window is in front (FB-M5K5)", () => {
  S().hydrate({});
  const personal = S().createWindow({ url: "a.com" });
  const aurumId = S().createProfile({ name: "Aurum" });
  const aurum = S().createWindow({ profileId: aurumId, url: "b.com" });
  const urls = (w) => S().windows[w].tabIds.map((id) => S().tabs[id].url);
  const store = "https://chromewebstore.google.com/category/extensions";
  S().setFocusedWindow(aurum);
  S().setFocusedWindow(personal);

  openWebStoreFor(aurumId, aurumId);
  assert.deepEqual(urls(aurum).slice(1), [store], "Aurum's window, though Personal's was used last");
  assert.ok(!urls(personal).includes(store));
  assert.equal(S().ui.focusOrder[0], aurum, "and it comes to the front");

  openInExtensionProfile("chrome-extension://ext/options.html", aurumId);
  assert.deepEqual(urls(aurum).slice(2), ["chrome-extension://ext/options.html"]);

  addFromWebStore(SETTINGS_WINDOW_ID, "aeblfdkhhhdcdjpifhhbdiojplfjncoa", aurumId);
  assert.deepEqual(urls(aurum).slice(3), ["https://chromewebstore.google.com/detail/aeblfdkhhhdcdjpifhhbdiojplfjncoa"]);
  assert.equal(urls(personal).length, 1, "nothing opened in Personal");

  openWebStore(personal);
  assert.deepEqual(urls(personal).slice(1), [store], "the Extensions menu still opens the store in its own window");
});

test("with no window showing the profile, the store opens in a new window of that profile, not the one in front", () => {
  S().hydrate({});
  const personal = S().createWindow({ url: "a.com" });
  const aurumId = S().createProfile({ name: "Aurum" });
  S().setFocusedWindow(personal);
  const before = new Set(S().windowOrder);
  openWebStoreFor(aurumId, aurumId);
  const made = S().windowOrder.filter((id) => !before.has(id));
  assert.equal(made.length, 1);
  assert.equal(S().windows[made[0]].profileId, aurumId);
  assert.deepEqual(S().windows[made[0]].tabIds.map((id) => S().tabs[id].url), ["https://chromewebstore.google.com/category/extensions"]);
  assert.equal(S().windows[personal].tabIds.length, 1);
});

test("a private window's Extensions menu opens the store in that private window, as before", () => {
  S().hydrate({});
  S().createWindow({ url: "a.com" });
  const priv = S().createWindow({ kind: "private", profileId: "default", url: "c.com" });
  openWebStore(priv);
  assert.deepEqual(S().windows[priv].tabIds.map((id) => S().tabs[id].url).slice(1), ["https://chromewebstore.google.com/category/extensions"]);
});

test("Add on an install prompt the engine no longer holds says so in the dialog, and Cancel on one rejects nothing", async () => {
  const { showInstallPrompt, confirmInstall, cancelInstall } = await import("./actions.ts");
  const { ArdiaError } = await import("@ardia/core");
  const { w } = setup();
  const unhandled = [];
  const noteUnhandled = (reason) => unhandled.push(reason);
  process.on("unhandledRejection", noteUnhandled);
  const answers = [];
  native.extensionAnswers.resolveInstallPrompt = async (requestId, accepted) => {
    answers.push([requestId, accepted]);
    throw new ArdiaError("ERR_EXTENSION_PROMPT_STALE", "The prompt belongs to another window");
  };
  const prompt = { requestId: "install1", profile: "", id: "abc", name: "Ext", version: "1", type: "install", icon: null, permissions: [], tabId: null };
  try {
    showInstallPrompt(w, prompt);
    await confirmInstall();
    const install = E().install;
    assert.equal(install?.status, "error");
    assert.match(install.error, /install request has closed/);
    showInstallPrompt(w, { ...prompt, requestId: "install2" });
    showInstallPrompt(w, { ...prompt, requestId: "install3" });
    cancelInstall();
    await new Promise((r) => setImmediate(r));
    assert.deepEqual(answers, [["install1", true], ["install2", false], ["install3", false]]);
    assert.equal(E().install, null);
    assert.deepEqual(unhandled, []);
  } finally {
    process.off("unhandledRejection", noteUnhandled);
    native.extensionAnswers.resolveInstallPrompt = async () => null;
  }
});

test("Add and Cancel answer an install prompt in the profile that asked, not the window's own", async () => {
  const { showInstallPrompt, confirmInstall, cancelInstall } = await import("./actions.ts");
  const { w } = setup();
  const answers = [];
  native.extensionAnswers.resolveInstallPrompt = async (requestId, accepted, profile) => {
    answers.push([requestId, accepted, profile]);
    return null;
  };
  const prompt = { requestId: "install1", profile: "aurum", id: "abc", name: "Ext", version: "1", type: "install", icon: null, permissions: [], tabId: null };
  try {
    showInstallPrompt(w, prompt);
    await confirmInstall();
    showInstallPrompt(w, { ...prompt, requestId: "install2", profile: "" });
    cancelInstall();
    await new Promise((r) => setImmediate(r));
    assert.deepEqual(answers, [["install1", true, "aurum"], ["install2", false, ""]]);
    assert.equal(E().install, null);
  } finally {
    native.extensionAnswers.resolveInstallPrompt = async () => null;
  }
});

test("a failed Add doesn't replace an install prompt that arrived while it was waiting", async () => {
  const { showInstallPrompt, confirmInstall } = await import("./actions.ts");
  const { ArdiaError } = await import("@ardia/core");
  const { w } = setup();
  let fail;
  native.extensionAnswers.resolveInstallPrompt = (requestId, accepted) =>
    accepted ? new Promise((_, reject) => { fail = () => reject(new ArdiaError("ERR_EXTENSION_PROMPT_STALE", "The prompt belongs to another window")); }) : Promise.resolve(null);
  const prompt = { requestId: "first", profile: "", id: "abc", name: "Ext", version: "1", type: "install", icon: null, permissions: [], tabId: null };
  try {
    showInstallPrompt(w, prompt);
    const confirming = confirmInstall();
    showInstallPrompt(w, { ...prompt, requestId: "second" });
    fail();
    await confirming;
    const install = E().install;
    assert.equal(install?.status, "prompt");
    assert.equal(install.prompt.requestId, "second");
  } finally {
    native.extensionAnswers.resolveInstallPrompt = async () => null;
  }
});
