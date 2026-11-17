import { onAppEvent } from "../../platform/app";
import { isSharing } from "./choice";

let centeredResizes = 0;
let reopenedMaximized = 0;
let titlesRead = 0;

onAppEvent((e) => {
  if (!isSharing()) return;
  if (e.type === "centeredResize") centeredResizes++;
  if (e.type === "windowTitleRead") titlesRead++;
});

export const noteWindowReopenedMaximized = () => void (isSharing() && reopenedMaximized++);

export function takeWindowPlacementCounts() {
  const taken = { window_centered_resizes: centeredResizes, windows_reopened_maximized: reopenedMaximized, window_titles_read: titlesRead };
  centeredResizes = 0;
  reopenedMaximized = 0;
  titlesRead = 0;
  return taken;
}
