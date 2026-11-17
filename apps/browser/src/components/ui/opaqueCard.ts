import { hex, type Theme } from "./theme";
import { parseColor, toHex } from "../../lib/color";
import { opaqueTint } from "../../lib/windowTint";

export function opaqueCard(theme: Pick<Theme, "card" | "windowTint">): string {
  const [r, g, b, a] = parseColor(hex(theme.card));
  const top = parseColor(theme.windowTint[0]);
  const bottom = parseColor(theme.windowTint[1]);
  return toHex([r, g, b].map((v, i) => a * v + (1 - a) * ((top[i]! + bottom[i]!) / 2)));
}

export function prePaintColor(theme: Pick<Theme, "card" | "dark" | "backdrop" | "windowTint" | "custom">): string {
  return opaqueCard({ card: theme.card, windowTint: theme.custom ? theme.windowTint : opaqueTint(theme.backdrop, theme.dark, "active") });
}
