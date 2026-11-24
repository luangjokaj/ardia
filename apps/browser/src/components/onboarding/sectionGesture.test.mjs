import assert from "node:assert/strict";
import { test } from "node:test";
import { newWheelGesture, readWheel } from "./sectionGesture.ts";

const TUNE = { wheelCommit: 28, wheelFollow: 0.4, wheelFollowMax: 26, wheelGestureGapMs: 220, wheelNotchCooldownMs: 360, wheelLine: 28 };
const SHORT = { lo: 500, hi: 500 };
const TALL = { lo: 500, hi: 800 };

function run(steps, { range = SHORT, at = range.lo } = {}) {
  const g = newWheelGesture();
  let now = 1000;
  let pos = at;
  return steps.map(([phase, dy, extra = {}]) => {
    now += extra.gap ?? 16;
    const action = readWheel(g, { dy, phase, momentum: !!extra.momentum, precise: extra.precise ?? true }, pos, range, now, TUNE);
    if (action.kind === "place") pos = action.y;
    return action;
  });
}

const kinds = (actions) => actions.map((a) => (a.kind === "move" ? `move${a.direction}` : a.kind));

test("a swipe past the threshold moves once and ignores the rest of the gesture", () => {
  const out = run([["began", -10], ["changed", -10], ["changed", -10], ["changed", -10], ["ended", 0], ["none", -30, { momentum: true }]]);
  assert.deepEqual(kinds(out), ["place", "place", "move1", "none", "none", "none"]);
});

test("a short swipe follows the finger and settles back when the finger lifts", () => {
  const out = run([["began", -5], ["changed", -5], ["ended", 0]]);
  assert.deepEqual(kinds(out), ["place", "place", "settle"]);
  assert.equal(out[1].y, 500 + 10 * 0.4);
});

test("a lift that arrives after a pause still belongs to the same gesture", () => {
  const out = run([["began", -10], ["changed", -10], ["changed", -10], ["ended", 0, { gap: 600 }]]);
  assert.deepEqual(kinds(out), ["place", "place", "move1", "none"]);
});

test("each new swipe moves again, however soon it follows", () => {
  const out = run([["began", -15], ["changed", -15], ["ended", 0], ["began", -15, { gap: 40 }], ["changed", -15], ["ended", 0]]);
  assert.deepEqual(kinds(out), ["place", "move1", "none", "place", "move1", "none"]);
});

test("swiping back moves back", () => {
  const out = run([["began", 15], ["changed", 15]]);
  assert.deepEqual(kinds(out), ["place", "move-1"]);
});

test("a tall section scrolls inside before it moves on", () => {
  const out = run([["began", -100], ["changed", -100], ["changed", -100], ["changed", -100], ["ended", 0]], { range: TALL });
  assert.deepEqual(kinds(out), ["place", "place", "place", "none", "none"]);
  assert.equal(out[2].y, 800);
});

test("mouse notches move one section per cooldown", () => {
  const out = run([["none", -1, { precise: false }], ["none", -1, { precise: false, gap: 100 }], ["none", -1, { precise: false, gap: 400 }]]);
  assert.deepEqual(kinds(out), ["move1", "none", "move1"]);
});

test("zero-length deltas outside a lift do nothing", () => {
  assert.deepEqual(kinds(run([["mayBegin", 0], ["changed", 0]])), ["none", "none"]);
});

test("a swipe that starts at the bottom edge of a tall section pulls, then moves on", () => {
  const out = run([["began", -10], ["changed", -10], ["changed", -10], ["changed", -10], ["ended", 0]], { range: TALL, at: TALL.hi });
  assert.deepEqual(kinds(out), ["place", "place", "move1", "none", "none"]);
  assert.ok(out[0].y > TALL.hi && out[1].y > out[0].y);
});

test("a swipe that starts at the top edge of a tall section pulls, then moves back", () => {
  const out = run([["began", 10], ["changed", 10], ["changed", 10], ["changed", 10], ["ended", 0]], { range: TALL, at: TALL.lo });
  assert.deepEqual(kinds(out), ["place", "place", "move-1", "none", "none"]);
  assert.ok(out[0].y < TALL.lo && out[1].y < out[0].y);
});

test("a pull at the edge that reverses scrolls back inside the section", () => {
  const out = run([["began", -10], ["changed", 30]], { range: TALL, at: TALL.hi });
  assert.deepEqual(kinds(out), ["place", "place"]);
  assert.equal(out[1].y, TALL.hi - 30);
});

test("a new swipe that opens with a zero-length began moves again right after the last one", () => {
  const out = run([["began", -15], ["changed", -15], ["ended", 0], ["began", 0, { gap: 40 }], ["changed", -15], ["changed", -15], ["ended", 0]]);
  assert.deepEqual(kinds(out), ["place", "move1", "none", "none", "place", "move1", "none"]);
});
