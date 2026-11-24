import type { WheelInfo } from "../ui/native";

export type SectionRange = { lo: number; hi: number };

export type WheelTuning = { wheelCommit: number; wheelFollow: number; wheelFollowMax: number; wheelGestureGapMs: number; wheelNotchCooldownMs: number; wheelLine: number };

export type WheelGesture = { accum: number; committed: boolean; scrolledInside: boolean; lastAt: number; notchAt: number };

export type WheelAction = { kind: "none" } | { kind: "place"; y: number } | { kind: "move"; direction: 1 | -1 } | { kind: "settle" };

const NONE: WheelAction = { kind: "none" };

export const newWheelGesture = (): WheelGesture => ({ accum: 0, committed: false, scrolledInside: false, lastAt: 0, notchAt: -Infinity });

export const clampTo = (value: number, r: SectionRange) => Math.min(r.hi, Math.max(r.lo, value));

const place = (y: number): WheelAction => ({ kind: "place", y });
const move = (by: number): WheelAction => ({ kind: "move", direction: by > 0 ? 1 : -1 });

export function readWheel(gesture: WheelGesture, { dy, phase, momentum, precise }: WheelInfo, at: number, range: SectionRange, now: number, tune: WheelTuning): WheelAction {
  const ending = phase === "ended" || phase === "cancelled";
  const starting = precise && !momentum && (phase === "began" || phase === "mayBegin");
  if (starting) {
    gesture.accum = 0;
    gesture.committed = false;
    gesture.scrolledInside = false;
  }
  if (!Number.isFinite(dy) || (dy === 0 && !ending)) return NONE;
  const by = precise ? -dy : -dy * tune.wheelLine;
  const tall = range.hi > range.lo;
  const within = clampTo(at, range);
  const inside = () => {
    const next = clampTo(within + by, range);
    return tall && Math.abs(next - within) > 0.01 ? next : null;
  };
  if (!precise) {
    const next = inside();
    if (next !== null) return place(next);
    if (now - gesture.notchAt < tune.wheelNotchCooldownMs) return NONE;
    gesture.notchAt = now;
    return move(by);
  }
  if (momentum) {
    const next = gesture.committed ? null : inside();
    return next === null ? NONE : place(next);
  }
  if (ending) return gesture.committed || gesture.scrolledInside ? NONE : { kind: "settle" };
  if (!starting && now - gesture.lastAt > tune.wheelGestureGapMs) {
    gesture.accum = 0;
    gesture.committed = false;
    gesture.scrolledInside = false;
  }
  gesture.lastAt = now;
  if (gesture.committed) return NONE;
  const next = inside();
  if (next !== null) {
    gesture.scrolledInside = true;
    return place(next);
  }
  if (gesture.scrolledInside) return NONE;
  gesture.accum += by;
  if (Math.abs(gesture.accum) >= tune.wheelCommit) {
    gesture.committed = true;
    return move(gesture.accum);
  }
  const pull = Math.max(-tune.wheelFollowMax, Math.min(tune.wheelFollowMax, gesture.accum * tune.wheelFollow));
  return place((gesture.accum > 0 ? range.hi : range.lo) + pull);
}
