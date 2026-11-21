import { shape } from "../ui";

export const pageMenuCardInk = {
  light: {
    solid: "#F2F2F7",
    cell: "#FFFFFF",
    cellPressed: "rgba(255,255,255,0.4)",
    rowPressed: "rgba(0,0,0,0.06)",
    separator: "rgba(60,60,67,0.12)",
    stepper: "rgba(118,118,128,0.12)",
  },
  dark: {
    solid: "#1C1C1E",
    cell: "#2C2C2E",
    cellPressed: "rgba(255,255,255,0.18)",
    rowPressed: "rgba(255,255,255,0.1)",
    separator: "rgba(255,255,255,0.08)",
    stepper: "rgba(118,118,128,0.24)",
  },
} as const;

export const pageMenuCards = {
  padding: 12,
  sectionGap: 10,
  groupRadius: shape.card,
  stepperRadius: shape.control,
  barHeight: 46,
  barButton: 44,
  tileRadius: 18,
  tileGap: 10,
  tileGlyph: 24,
  tileLabelGap: 6,
  rowHeight: 44,
  rowGlyph: 19,
  iconSlot: 26,
  rowInset: 14,
  iconGap: 12,
  stepperHeight: 32,
  stepperButton: 44,
  stepperReset: 52,
} as const;
