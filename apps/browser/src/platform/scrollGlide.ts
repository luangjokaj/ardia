import { nativeModule } from "@ardia/shell";

const Wheel = nativeModule("ArdiaWheelArea");

export const wheelSteersSections = true;

export function glideNativeScroll(tag: number, y: number, durationMs: number): boolean {
  if (typeof Wheel?.glideScroll !== "function") return false;
  void Wheel.glideScroll(tag, y, durationMs);
  return true;
}
