import { Platform, StyleSheet } from "react-native";
import { State } from "react-native-gesture-handler";
import { fireGestureHandler, getByGestureTestId } from "react-native-gesture-handler/jest-utils";
import { getAnimatedStyle } from "react-native-reanimated";
import { act, type ReactTestInstance } from "react-test-renderer";
import { DECK_PULL, pullPagePose, pullShrink } from "../lib/deckPull";
import { framesUntil, renderSurface, unmount, withTabs } from "../../test/render/harness";

const mockMotion = { reduced: false };

jest.mock("../state/app/systemLook", () => ({ ...jest.requireActual("../state/app/systemLook"), useReduceMotion: () => mockMotion.reduced }));

const { Surfaces } = require("../App") as typeof import("../App");
const { tabsMotion } = require("../components/ui") as typeof import("../components/ui");
const { pages } = require("../platform/pages") as typeof import("../platform/pages");
const system = require("../platform/system") as typeof import("../platform/system");
const perf = require("../state/app/interactionPerf") as typeof import("../state/app/interactionPerf");
const pull = require("../state/browse/deckPull") as typeof import("../state/browse/deckPull");
const { runDeckPullScript, DECK_PULL_SCRIPT } = require("../state/browse/deckPullScript") as typeof import("../state/browse/deckPullScript");
const deckGrid = require("../state/browse/deckGrid") as typeof import("../state/browse/deckGrid");
const browse = require("../state/browse/store") as typeof import("../state/browse/store");
const { setRootSize } = require("../state/app/rootSize") as typeof import("../state/app/rootSize");
const { writePreference } = require("../state/store/browserDatabase") as typeof import("../state/store/browserDatabase");
const { browserDatabase } = require("../state/store/database") as typeof import("../state/store/database");
const telemetry = require("../state/telemetry/telemetry") as typeof import("../state/telemetry/telemetry");
const { currentTabs, useTabs } = require("../state/tabs/store") as typeof import("../state/tabs/store");

const lookModule = require("@ardia/phone-native/src/look") as typeof import("@ardia/phone-native/src/look");

const { deckPull, PULL_STAGE } = pull;

const onIPhone = Platform.OS === "ios" ? test : test.skip;
const onAndroid = Platform.OS === "android" ? test : test.skip;

const SCREEN = { width: 393, height: 873 };
const AWAY = 100_000;

const mounted: ReturnType<typeof renderSurface>[] = [];

let counted: jest.SpyInstance;
let renders: string[] = [];

beforeEach(() => {
  jest.useFakeTimers();
  mockMotion.reduced = false;
  withTabs(5);
  writePreference(browserDatabase(), deckGrid.DECK_GRID_KEY, null);
  act(() => deckGrid.forgetDeckGrid());
  act(() => setRootSize(SCREEN.width, SCREEN.height));
  browse.useBrowse.setState({ surface: "browsing", sheet: null, deckEntrance: null, frozenOrder: null, opening: null, veiled: null, covered: null, leaving: null });
  renders = [];
  counted = jest.spyOn(telemetry, "countUsage").mockImplementation(() => undefined);
  jest.spyOn(perf, "countRender").mockImplementation((component: string) => {
    renders.push(component);
  });
  jest.spyOn(system, "prefetchImage").mockImplementation(async () => true);
  jest.spyOn(pages, "close").mockImplementation(async () => undefined);
});

afterEach(() => {
  for (const root of mounted.splice(0)) unmount(root);
  act(() => pull.endDeckPull());
  act(() => jest.runOnlyPendingTimers());
  act(() => setRootSize(0, 0));
  writePreference(browserDatabase(), deckGrid.DECK_GRID_KEY, null);
  act(() => deckGrid.forgetDeckGrid());
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type Root = ReturnType<typeof renderSurface>;

const host = (root: Root, testID: string) => root.root.findAll((node) => node.props.testID === testID && typeof node.type === "string")[0] ?? null;
const hosts = (root: Root, testID: string) => root.root.findAll((node) => node.props.testID === testID && typeof node.type === "string");
const pagesShown = (root: Root) => root.root.findAll((node) => (node.type as { name?: string })?.name === "BrowsingScreen");
const moved = (node: ReactTestInstance) => {
  const transform = (getAnimatedStyle(node).transform ?? []) as Record<string, number>[];
  return Object.assign({}, ...transform) as { translateX?: number; translateY?: number; scale?: number };
};
const opacity = (node: ReactTestInstance) => (getAnimatedStyle(node).opacity as number | undefined) ?? 1;
const frame = () => act(() => jest.advanceTimersByTime(16));
const caughtUp = () => act(() => jest.advanceTimersByTime(320));
const travelFor = (target: { reach: number; pull: number }, rise: number) => (rise * target.pull) / target.reach;
const surface = () => browse.useBrowse.getState().surface;

function app() {
  const root = renderSurface(<Surfaces />, { flushTimers: false });
  mounted.push(root);
  act(() => jest.advanceTimersByTime(tabsMotion.deckStandby + 50));
  frame();
  return root;
}

type Step = { dy: number; velocityY?: number };

function swipe(steps: Step[]) {
  const last = steps[steps.length - 1]!;
  act(() =>
    fireGestureHandler(getByGestureTestId("barSwipeUp"), [
      { state: State.BEGAN, translationX: 0, translationY: 0, velocityX: 0, velocityY: 0 },
      ...steps.map((step) => ({ state: State.ACTIVE, translationX: 0, translationY: step.dy, velocityX: 0, velocityY: step.velocityY ?? -300 })),
      { state: State.END, translationX: 0, translationY: last.dy, velocityX: 0, velocityY: last.velocityY ?? -300 },
    ]),
  );
  frame();
}

const order = (root: Root) =>
  root.root.findAll((node) => typeof node.type === "string" && (node.props.testID === "tabDeck" || node.props.testID === "pageBar")).map((node) => node.props.testID as string);

onIPhone("on iPhone the deck waits under the page, laid out and parked off screen rather than undrawn, so a swipe can show it without a layout pass", () => {
  const root = app();
  const deck = host(root, "tabDeck")!;
  expect(order(root)).toEqual(["tabDeck", "pageBar"]);
  expect(StyleSheet.flatten(deck.props.style).display).toBeUndefined();
  expect(StyleSheet.flatten(deck.props.style).opacity).toBeUndefined();
  expect(moved(deck).translateX).toBe(AWAY);
  expect(deck.props.pointerEvents).toBe("none");
  expect(deck.props.accessibilityElementsHidden).toBe(true);
  expect(host(root, "pageLayer")).not.toBeNull();
  expect(host(root, "pagePull")).not.toBeNull();
  expect(deckPull.target.value?.id).toBe(currentTabs().selectedId);
});

onAndroid("Android keeps its page over nothing and its waiting deck undrawn above it: no page layer, no pull wrapper, no blocker, and nothing arms the pull", () => {
  const root = app();
  expect(order(root)).toEqual(["pageBar", "tabDeck"]);
  expect(StyleSheet.flatten(host(root, "tabDeck")!.props.style).display).toBe("none");
  for (const id of ["pageLayer", "pagePull", "pagePullShadow", "pagePullBlocker", "pullGlyphs"]) expect(hosts(root, id)).toHaveLength(0);
  expect(pull.deckPullArmed()).toBeNull();
  expect(pull.deckStandbyId()).toBeNull();
});

onIPhone("the page follows the finger with no React render: every move sets where the live page is heading, it eases there over a few frames instead of jumping, its bottom edge rising with the finger's travel and its frame heading for its own card's, over the deck's backdrop alone", () => {
  const root = app();
  const id = currentTabs().selectedId!;
  const target = deckPull.target.value!;
  renders = [];
  act(() => void expect(pull.beginDeckPull(id, -22)).toBe(true));
  expect(target.pull).toBeGreaterThan(target.reach * 2);
  expect(Math.abs(target.centerX - SCREEN.width / 2)).toBeLessThan(2);
  expect(target.centerX - target.width / 2).toBeGreaterThan(0);
  expect(target.centerX + target.width / 2).toBeLessThan(SCREEN.width);
  let last = 1;
  for (const travel of [6, 18, 40, 64, 90, 180, target.pull]) {
    act(() => pull.trackDeckPull(-22 - travel));
    frame();
    const pose = pullPagePose(target, pullShrink(travel, target.pull));
    const soon = moved(host(root, "pagePull")!).scale ?? 1;
    expect(soon).toBeLessThan(last);
    expect(soon).toBeGreaterThan(pose.scale);
    caughtUp();
    const page = moved(host(root, "pagePull")!);
    expect(page.scale).toBeCloseTo(pose.scale, 4);
    expect(page.translateX).toBeCloseTo(pose.x - SCREEN.width / 2, 3);
    const bottom = SCREEN.height / 2 + (page.translateY ?? 0) + (SCREEN.height * (page.scale ?? 1)) / 2;
    expect(bottom).toBeCloseTo(SCREEN.height - (travel * target.reach) / target.pull, 2);
    last = page.scale ?? 1;
  }
  expect(last * SCREEN.width).toBeCloseTo(target.width, 2);
  expect(renders).toEqual([]);
  expect(surface()).toBe("browsing");
  expect(moved(host(root, "tabDeck")!).translateX).toBe(0);
  expect(opacity(host(root, "deckCards")!)).toBe(1);
  const tucked = hosts(root, "deckCard").filter((card) => opacity(card) === 1);
  expect(hosts(root, "deckCard").filter((card) => opacity(card) === 0)).toHaveLength(1);
  expect(tucked.length).toBeGreaterThan(0);
  for (const card of tucked) expect(moved(card).scale).toBeCloseTo(DECK_PULL.tuckScale, 5);
  expect(new Set(tucked.map((card) => moved(card).translateX)).size).toBe(1);
  expect(moved(host(root, "pagePullBlocker")!).translateX).toBe(0);
  act(() => pull.resetDeckPull());
  frame();
  expect(moved(host(root, "tabDeck")!).translateX).toBe(AWAY);
  expect(moved(host(root, "pagePullBlocker")!).translateX).toBe(AWAY);
});

onIPhone("let go past the commit point, the page lands in its own card and only then does the deck take over: the page stays mounted through the landing, the swipe is counted, and the card it lands on is the selected one", () => {
  const root = app();
  const id = currentTabs().selectedId!;
  const before = new Set(hosts(root, "deckCard"));
  swipe([{ dy: -22 }, { dy: -60 }, { dy: -150 }]);
  expect(surface()).toBe("browsing");
  expect(pagesShown(root)).toHaveLength(1);
  expect(deckPull.stage.value).toBe(PULL_STAGE.landing);
  expect(counted).toHaveBeenCalledWith("deck_bar_swipes");
  expect(counted).not.toHaveBeenCalledWith("deck_bar_swipes_returned");
  framesUntil(() => surface() === "deck", 240);
  expect(surface()).toBe("deck");
  frame();
  frame();
  expect(pagesShown(root)).toHaveLength(0);
  expect(deckPull.stage.value).toBe(PULL_STAGE.idle);
  const deck = host(root, "tabDeck")!;
  expect(moved(deck).translateX).toBe(0);
  expect(deck.props.pointerEvents).toBe("auto");
  expect(opacity(host(root, "deckCards")!)).toBe(1);
  expect(hosts(root, "deckCard").every((card) => before.has(card))).toBe(true);
  expect(hosts(root, "deckCard").every((card) => opacity(card) === 1)).toBe(true);
  expect(currentTabs().selectedId).toBe(id);
  expect(browse.useBrowse.getState().leaving).toBeNull();
  expect(browse.useBrowse.getState().deckEntrance).toBeNull();
});

onIPhone("let go early, or dragged back down, the page grows back and nothing on the browsing surface has changed: the same screen, no render, the deck parked again, and the swipe counted as returned", () => {
  for (const steps of [[{ dy: -22 }, { dy: -70, velocityY: 0 }], [{ dy: -22 }, { dy: -190 }, { dy: -170, velocityY: 420 }]] as Step[][]) {
    const root = app();
    const screen = pagesShown(root)[0]!;
    counted.mockClear();
    renders = [];
    swipe(steps);
    expect([PULL_STAGE.returning, PULL_STAGE.idle]).toContain(deckPull.stage.value);
    framesUntil(() => deckPull.stage.value === PULL_STAGE.idle, 240);
    frame();
    expect(deckPull.stage.value).toBe(PULL_STAGE.idle);
    expect(surface()).toBe("browsing");
    expect(pagesShown(root)[0]).toBe(screen);
    expect(renders.filter((name) => name === "BrowsingScreen" || name === "PageCover" || name === "TabDeck" || name === "DeckCard")).toEqual([]);
    const page = moved(host(root, "pagePull")!);
    expect(page.scale).toBe(1);
    expect(page.translateY).toBe(0);
    expect(opacity(host(root, "pagePull")!)).toBe(1);
    expect(moved(host(root, "tabDeck")!).translateX).toBe(AWAY);
    expect(counted).toHaveBeenCalledWith("deck_bar_swipes_returned");
    expect(counted).not.toHaveBeenCalledWith("deck_bar_swipes");
    unmount(mounted.pop()!);
  }
});

onIPhone("a swipe in Incognito follows the finger too, and neither its landing nor its return is counted", () => {
  act(() => useTabs.setState({ incognito: true }));
  const root = app();
  swipe([{ dy: -22 }, { dy: -60, velocityY: 0 }]);
  framesUntil(() => deckPull.stage.value === PULL_STAGE.idle, 240);
  swipe([{ dy: -22 }, { dy: -150 }]);
  framesUntil(() => surface() === "deck", 240);
  expect(surface()).toBe("deck");
  expect(counted).not.toHaveBeenCalledWith("deck_bar_swipes");
  expect(counted).not.toHaveBeenCalledWith("deck_bar_swipes_returned");
});

onIPhone("a tap on the tabs button ends in the same landing as a released swipe, starting from rest, and isn't counted as a swipe", () => {
  const root = app();
  const button = root.root.findAll((node) => node.props.accessibilityLabel === "Tabs" && typeof node.props.onPress === "function")[0]!;
  act(() => void button.props.onPress());
  frame();
  expect(surface()).toBe("browsing");
  expect(deckPull.stage.value).toBe(PULL_STAGE.landing);
  expect(deckPull.shrink.value).toBeLessThan(0.5);
  framesUntil(() => surface() === "deck", 240);
  expect(surface()).toBe("deck");
  expect(counted).not.toHaveBeenCalledWith("deck_bar_swipes");
});

onIPhone("the handover waits for the fresh picture of the page: the capture starts with the pull, the waiting deck takes the new picture only once the landing has ended so its render can't stall the pull, and the deck takes over once it has painted in the card", async () => {
  const FRESH = "file:///snapshots/pulled-fresh.jpg";
  const id = currentTabs().selectedId!;
  act(() => browse.pageStateChanged(id, { url: "https://site0.example/", title: "Site 0", isLoading: false, isLive: true, canGoBack: false, canGoForward: false } as never));
  const snapped = jest.spyOn(pages, "snapshot").mockImplementation(async () => ({ uri: FRESH, width: 600, height: 1333 }) as never);
  const root = app();
  renders = [];
  swipe([{ dy: -22 }, { dy: -150 }]);
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  frame();
  expect(snapped).toHaveBeenCalledTimes(1);
  const picture = () => host(root, "deckCards")!.findAll((node) => node.props.source?.uri === FRESH && typeof node.props.onLoad === "function" && typeof node.type !== "string")[0];
  expect(picture()).toBeUndefined();
  expect(renders.filter((name) => name === "TabDeck" || name === "DeckCard")).toEqual([]);
  framesUntil(() => deckPull.stage.value === PULL_STAGE.landed, 240);
  await act(async () => {
    jest.advanceTimersByTime(16);
    await Promise.resolve();
    await Promise.resolve();
  });
  frame();
  expect(picture()).toBeDefined();
  expect(surface()).toBe("browsing");
  expect(pagesShown(root)).toHaveLength(1);
  act(() => picture()!.props.onLoad({ nativeEvent: { source: { width: 600, height: 1333 } } }));
  framesUntil(() => surface() === "deck", 12);
  expect(surface()).toBe("deck");
});

const BROWSING_GLASS = ["floatingBarTabs", "floatingBarAddress", "floatingBarPlus"];
const DECK_GLASS = ["deckBarIncognito", "deckSearchTabs", "deckBarPlus"];
const DECK_GLYPHS = ["deckBarIncognitoGlyph", "deckSearchTabsContent", "deckBarPlusGlyph"];

onIPhone("the bar is one bar throughout: its three glass shapes stay while the browsing glyphs cross-fade into the tab view's on them, the deck's bar takes the glass over in one commit once the page's bottom edge has cleared it, and gives it back if the finger comes down again", () => {
  jest.spyOn(lookModule, "glassIsNative").mockImplementation(() => true);
  const root = app();
  const id = currentTabs().selectedId!;
  const target = deckPull.target.value!;
  const glass = (ids: string[]) => root.root.findAll((node) => node.type === lookModule.Glass && ids.includes(node.props.testID)).map((node) => [node.props.shown !== false, node.props.shownMs]);
  const shown = (ids: string[]) => glass(ids).map(([on]) => on);
  expect(hosts(root, "pullGhost")).toHaveLength(3);
  expect(hosts(root, "pullGhost").map(opacity)).toEqual([0, 0, 0]);
  expect(shown(BROWSING_GLASS)).toEqual([true, true, true]);
  expect(shown(DECK_GLASS)).toEqual([false, false, false]);
  act(() => void pull.beginDeckPull(id, 0));
  act(() => pull.trackDeckPull(-travelFor(target, 40)));
  caughtUp();
  expect(pull.usePullBar.getState().deckOwns).toBe(false);
  for (const glyphs of hosts(root, "pullGlyphs")) {
    expect(opacity(glyphs)).toBeGreaterThan(0);
    expect(opacity(glyphs)).toBeLessThan(1);
  }
  for (const ghost of hosts(root, "pullGhost")) {
    expect(opacity(ghost)).toBeGreaterThan(0);
    expect(opacity(ghost)).toBeLessThan(1);
  }
  act(() => pull.trackDeckPull(-travelFor(target, DECK_PULL.ghostsWholeAt + 1)));
  caughtUp();
  expect(hosts(root, "pullGlyphs").map(opacity)).toEqual(hosts(root, "pullGlyphs").map(() => 0));
  expect(hosts(root, "pullGhost").map(opacity)).toEqual([1, 1, 1]);
  expect(pull.usePullBar.getState().deckOwns).toBe(false);
  expect(shown(BROWSING_GLASS)).toEqual([true, true, true]);
  expect(shown(DECK_GLASS)).toEqual([false, false, false]);
  expect(DECK_GLYPHS.map((glyphs) => opacity(host(root, glyphs)!))).toEqual([0, 0, 0]);
  act(() => pull.trackDeckPull(-travelFor(target, Math.min(target.reach, 100))));
  caughtUp();
  frame();
  expect(pull.usePullBar.getState().deckOwns).toBe(true);
  expect(glass(BROWSING_GLASS)).toEqual([[false, 0], [false, 0], [false, 0]]);
  expect(glass(DECK_GLASS)).toEqual([[true, 0], [true, 0], [true, 0]]);
  expect(hosts(root, "pullGhost")).toHaveLength(0);
  expect(DECK_GLYPHS.map((glyphs) => opacity(host(root, glyphs)!))).toEqual([1, 1, 1]);
  act(() => pull.trackDeckPull(-travelFor(target, 30)));
  caughtUp();
  frame();
  expect(pull.usePullBar.getState().deckOwns).toBe(false);
  expect(glass(BROWSING_GLASS)).toEqual([[true, 0], [true, 0], [true, 0]]);
  expect(shown(DECK_GLASS)).toEqual([false, false, false]);
  expect(hosts(root, "pullGhost")).toHaveLength(3);
  expect(DECK_GLYPHS.map((glyphs) => opacity(host(root, glyphs)!))).toEqual([0, 0, 0]);
  act(() => pull.resetDeckPull());
  frame();
});

onIPhone("with Reduce Motion nothing tracks the finger: the swipe cross-fades the page into the deck at rest, through the same handover", () => {
  mockMotion.reduced = true;
  const root = app();
  expect(pull.deckPullFades()).toBe(true);
  swipe([{ dy: -22 }, { dy: -150 }]);
  expect(deckPull.stage.value).toBe(PULL_STAGE.fading);
  expect(deckPull.reveal.value).toBe(1);
  const page = host(root, "pagePull")!;
  expect(moved(page).scale).toBe(1);
  expect(moved(page).translateY).toBe(0);
  expect(opacity(host(root, "deckCards")!)).toBe(1);
  act(() => jest.advanceTimersByTime(DECK_PULL.fadeMs / 2));
  expect(opacity(host(root, "pagePull")!)).toBeGreaterThan(0);
  expect(opacity(host(root, "pagePull")!)).toBeLessThan(1);
  expect(moved(host(root, "pagePull")!).scale).toBe(1);
  framesUntil(() => surface() === "deck", 120);
  expect(surface()).toBe("deck");
  expect(counted).toHaveBeenCalledWith("deck_bar_swipes");
});

onIPhone("with Grid chosen the waiting deck holds the grid, the page's target is its own tile, and the swipe lands there", () => {
  writePreference(browserDatabase(), deckGrid.DECK_GRID_KEY, "true");
  act(() => deckGrid.forgetDeckGrid());
  const root = app();
  expect(hosts(root, "deckCard")).toHaveLength(0);
  const cells = hosts(root, "tabGridCell");
  expect(cells).toHaveLength(5);
  const viewport = host(root, "tabGridScroll")!;
  act(() => viewport.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: SCREEN.width, height: 700 } } }));
  act(() => viewport.props.onContentSizeChange(SCREEN.width, 1400));
  const width = StyleSheet.flatten(cells[0]!.props.style).width as number;
  cells.forEach((cell, index) => act(() => cell.props.onLayout({ nativeEvent: { layout: { x: 16 + (index % 2) * (width + 14), y: 14 + Math.floor(index / 2) * 440, width, height: 420 } } })));
  frame();
  const target = deckPull.target.value!;
  expect(target.id).toBe(currentTabs().selectedId);
  expect(target.width).toBeCloseTo(width, 5);
  expect(target.height).toBeCloseTo(width / (SCREEN.width / SCREEN.height), 3);
  swipe([{ dy: -22 }, { dy: -150 }]);
  expect(deckPull.stage.value).toBe(PULL_STAGE.landing);
  framesUntil(() => surface() === "deck", 240);
  expect(surface()).toBe("deck");
  expect(hosts(root, "tabGridCell")).toHaveLength(5);
});

onIPhone("the scripted pull replays a fixed finger path through the gesture's own worklets: each pull commits and reopens the same tab, the last is let go early, and the log gets a line for tracking, one for landing and a last line", async () => {
  const lines: string[] = [];
  perf.enableInteractionPerf(true, (line) => lines.push(line));
  const root = app();
  const id = currentTabs().selectedId!;
  let done = false;
  act(() => void runDeckPullScript(2, (line) => lines.push(line)).then(() => (done = true)));
  for (let step = 0; step < 4000 && !done; step++) {
    await act(async () => {
      jest.advanceTimersByTime(16);
      await Promise.resolve();
    });
  }
  perf.enableInteractionPerf(false, () => undefined);
  expect(done).toBe(true);
  expect(lines.filter((line) => line.includes("script"))).toEqual(["PAGELAB deck pull script: pull 1 of 2", "PAGELAB deck pull script: pull 2 of 2", "PAGELAB deck pull script: early release", "PAGELAB deck pull script done: 2 of 2 committed, 1 returned"]);
  expect(lines.filter((line) => line.startsWith("PAGELAB perf deck pull ") && !line.includes("landing") && !line.includes("return"))).toHaveLength(3);
  expect(lines.filter((line) => line.startsWith("PAGELAB perf deck pull landing "))).toHaveLength(2);
  expect(lines[lines.length - 1]).toBe("PAGELAB deck pull script done: 2 of 2 committed, 1 returned");
  expect(surface()).toBe("browsing");
  expect(currentTabs().selectedId).toBe(id);
  expect(currentTabs().open).toHaveLength(5);
  expect(DECK_PULL_SCRIPT.commits.ms).toBe(350);
}, 60_000);

test("the scripted pull only logs when no page is showing", async () => {
  browse.useBrowse.setState({ surface: "start" });
  const lines: string[] = [];
  let done = false;
  act(() => void runDeckPullScript(1, (line) => lines.push(line)).then(() => (done = true)));
  for (let step = 0; step < 4000 && !done; step++) {
    await act(async () => {
      jest.advanceTimersByTime(100);
      await Promise.resolve();
    });
  }
  expect(done).toBe(true);
  expect(lines).toEqual(["PAGELAB deck pull script done: 0 of 1 committed, 0 returned, no page was showing with the deck waiting"]);
  expect(surface()).toBe("start");
});

onIPhone("a pull whose frames stalled is counted once it settles, and not in Incognito; a pull at the display's pace isn't", () => {
  const root = app();
  const id = currentTabs().selectedId!;
  swipe([{ dy: -22 }, { dy: -60, velocityY: 0 }]);
  framesUntil(() => deckPull.stage.value === PULL_STAGE.idle, 240);
  frame();
  expect(counted).not.toHaveBeenCalledWith("deck_pulls_hitched");
  act(() => browse.deckPullSettled(id, false, DECK_PULL.hitchMs));
  expect(counted).not.toHaveBeenCalledWith("deck_pulls_hitched");
  act(() => browse.deckPullSettled(id, false, DECK_PULL.hitchMs + 1));
  expect(counted).toHaveBeenCalledWith("deck_pulls_hitched");
  counted.mockClear();
  act(() => useTabs.setState({ incognito: true }));
  act(() => browse.deckPullSettled(id, false, 200));
  expect(counted).not.toHaveBeenCalledWith("deck_pulls_hitched");
  expect(root).toBeDefined();
});
