import { forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, findNodeHandle, unstable_batchedUpdates, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollView } from "react-native";
import { reduceMotion } from "../ui";
import type { WheelInfo } from "../ui/native";
import { previousStep } from "../../state/onboarding/onboarding";
import { glideNativeScroll, wheelSteersSections } from "../../state/onboarding/scrollGlide";
import { currentPlace, currentSectionIndex, goToSection, type OnboardingSection, type SectionMove } from "../../state/onboarding/sections";
import { noteOnboarding } from "../../state/telemetry/usage";
import { publishedForward, SectionContext, useFlowSlots } from "./sectionContext";
import { useSectionFades } from "./sectionFades";
import { clampTo, newWheelGesture, readWheel, type SectionRange } from "./sectionGesture";
import { onboardingFlow, onboardingMotion, sectionEase } from "./tokens";

type Frame = { y: number; h: number };

export type SectionScrollerHandle = { move(direction: 1 | -1, via: SectionMove): void; wheel(info: WheelInfo): void };

export const sectionKey = (s: OnboardingSection) => `${s.step}.${s.id}`;

function rangeOf(frame: Frame | undefined, viewport: number): SectionRange | null {
  if (!frame || viewport <= 0) return null;
  if (frame.h + onboardingFlow.edge * 2 <= viewport) {
    const centre = frame.y + frame.h / 2 - viewport / 2;
    return { lo: centre, hi: centre };
  }
  return { lo: frame.y - onboardingFlow.edge, hi: frame.y + frame.h + onboardingFlow.edge - viewport };
}

const SectionBody = memo(function SectionBody({
  step,
  sub,
  id,
  active,
  reachable,
  placeKey,
  render,
}: OnboardingSection & { active: boolean; reachable: boolean; placeKey: string; render: (section: OnboardingSection) => ReactNode }) {
  const place = useMemo(() => ({ step, sub, id, active, key: placeKey }), [step, sub, id, active, placeKey]);
  const body = useMemo(() => render({ step, sub, id }), [render, step, sub, id]);
  return (
    <SectionContext.Provider value={place}>
      <View pointerEvents={active || reachable ? "auto" : "none"}>{body}</View>
    </SectionContext.Provider>
  );
});

const GLIDE_SLACK_MS = 80;

const glideMs = () => (reduceMotion() ? 0 : onboardingMotion.sectionScroll);

export const SectionScroller = forwardRef<SectionScrollerHandle, { sections: OnboardingSection[]; active: number; render: (section: OnboardingSection) => ReactNode }>(
  function SectionScroller({ sections, active, render }, ref) {
    const slots = useFlowSlots();
    const scroll = useRef<ScrollView | null>(null);
    const [viewport, setViewport] = useState(0);
    const [frames, setFrames] = useState<Record<string, Frame>>({});
    const fades = useSectionFades(onboardingFlow.peekOpacity, sectionEase);
    const motion = useRef({ at: 0, placedKey: null as string | null, glidingUntil: 0, lastY: 0, afterGlide: null as ReturnType<typeof setTimeout> | null }).current;
    const gesture = useRef(newWheelGesture()).current;
    const keys = sections.map(sectionKey);
    const ranges = keys.map((k) => rangeOf(frames[k], viewport));
    const activeKey = keys[active] ?? null;
    const live = useRef({ keys, ranges, active });
    live.current = { keys, ranges, active };

    const moveTo = (y: number, ms: number) => {
      motion.at = y;
      motion.glidingUntil = Date.now() + ms + GLIDE_SLACK_MS;
      if (motion.afterGlide !== null) clearTimeout(motion.afterGlide);
      motion.afterGlide = null;
      const tag = findNodeHandle(scroll.current as never);
      if (tag !== null && glideNativeScroll(tag, y, ms)) return;
      scroll.current?.scrollTo({ y, animated: ms > 0 });
    };

    const activeRange = ranges[active];
    useEffect(() => {
      if (!activeRange || !activeKey) return;
      const first = motion.placedKey === null;
      const moved = motion.placedKey !== activeKey;
      const backward = moved && !first && keys.indexOf(motion.placedKey!) > active;
      motion.placedKey = activeKey;
      fades.light(keys, activeKey, first ? 0 : glideMs());
      const target = moved ? (backward ? activeRange.hi : activeRange.lo) : clampTo(motion.at, activeRange);
      if (first) return moveTo(target, 0);
      if (Math.abs(target - motion.at) > 0.5) moveTo(target, glideMs());
    }, [activeKey, activeRange?.lo, activeRange?.hi]);

    const settle = () => {
      const { ranges: now, active: at } = live.current;
      const r = now[at];
      if (r && Math.abs(clampTo(motion.at, r) - motion.at) > 0.5) moveTo(clampTo(motion.at, r), glideMs());
    };

    const move = (direction: 1 | -1, via: SectionMove) => {
      const { keys: order, ranges: now, active: at } = live.current;
      const next = now[at + direction];
      const nextKey = order[at + direction];
      const current = sections[currentSectionIndex(sections)];
      const forward = direction > 0 ? publishedForward(slots, current ? sectionKey(current) : null) : null;
      const lead = !!next && !!nextKey && (direction > 0 ? !!forward : at > 0);
      if (lead) {
        motion.placedKey = nextKey;
        fades.light(order, nextKey, glideMs());
        moveTo(direction > 0 ? next.lo : next.hi, glideMs());
      }
      const before = currentPlace();
      unstable_batchedUpdates(() => (direction > 0 ? forward?.() : previousStep()));
      if (currentPlace() !== before) return noteOnboarding(`${via}Move`);
      if (lead) {
        motion.placedKey = order[at] ?? null;
        fades.light(order, motion.placedKey, glideMs());
      }
      settle();
    };

    const wheel = (info: WheelInfo) => {
      const { ranges: now, active: at } = live.current;
      const r = now[at];
      if (!r) return;
      const action = readWheel(gesture, info, motion.at, r, Date.now(), onboardingFlow);
      if (action.kind === "place") moveTo(action.y, 0);
      else if (action.kind === "settle") settle();
      else if (action.kind === "move") move(action.direction, "wheel");
    };

    useImperativeHandle(ref, () => ({ move, wheel }));

    const clampScroll = (y: number) => {
      const { ranges: now, active: at } = live.current;
      const r = now[at];
      if (!r) return;
      const kept = clampTo(y, r);
      motion.at = kept;
      if (Math.abs(kept - y) > 0.5) scroll.current?.scrollTo({ y: kept, animated: false });
    };

    const keepInQuestion = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      motion.lastY = e.nativeEvent.contentOffset.y;
      const wait = motion.glidingUntil - Date.now();
      if (motion.afterGlide !== null) clearTimeout(motion.afterGlide);
      motion.afterGlide = null;
      if (wait <= 0) return clampScroll(motion.lastY);
      motion.afterGlide = setTimeout(() => {
        motion.afterGlide = null;
        clampScroll(motion.lastY);
      }, wait);
    };

    useEffect(() => () => void (motion.afterGlide !== null && clearTimeout(motion.afterGlide)), []);

    const measure = (key: string, e: LayoutChangeEvent) => {
      const { y, height } = e.nativeEvent.layout;
      setFrames((prev) => (prev[key]?.y === y && prev[key]?.h === height ? prev : { ...prev, [key]: { y, h: height } }));
    };

    const pick = (i: number) => {
      if (i === active + 1) return move(1, "click");
      const section = sections[i];
      if (!section || i >= active) return;
      goToSection(section);
      noteOnboarding("clickMove");
    };

    return (
      <Animated.ScrollView
        ref={scroll as never}
        style={{ flex: 1 }}
        scrollEnabled={!wheelSteersSections}
        onScroll={wheelSteersSections ? undefined : keepInQuestion}
        scrollEventThrottle={wheelSteersSections ? undefined : 16}
        showsVerticalScrollIndicator={false}
        onLayout={(e) => setViewport(e.nativeEvent.layout.height)}
        contentContainerStyle={{ paddingTop: viewport / 2, paddingBottom: viewport / 2, paddingHorizontal: onboardingFlow.columnPad, gap: onboardingFlow.gap }}
      >
        {sections.map((section, i) => {
          const key = keys[i]!;
          const isActive = i === active;
          const reachable = !isActive && i <= active + 1;
          return (
            <Animated.View key={key} onLayout={(e) => measure(key, e)} onTouchStart={reachable ? () => pick(i) : undefined} style={{ opacity: fades.valueOf(key, isActive) }}>
              <SectionBody step={section.step} sub={section.sub} id={section.id} active={isActive} reachable={reachable} placeKey={key} render={render} />
            </Animated.View>
          );
        })}
      </Animated.ScrollView>
    );
  },
);
