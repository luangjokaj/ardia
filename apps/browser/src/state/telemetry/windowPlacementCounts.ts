import { onAppEvent } from "../../platform/app";

let centeredResizes = 0;
let reopenedMaximized = 0;
let titlesRead = 0;

onAppEvent((e) => {
  if (e.type === "centeredResize") centeredResizes++;
  if (e.type === "windowTitleRead") titlesRead++;
});

export const noteWindowReopenedMaximized = () => void reopenedMaximized++;

export function takeWindowPlacementCounts() {
  const taken = { window_centered_resizes: centeredResizes, windows_reopened_maximized: reopenedMaximized, window_titles_read: titlesRead };
  centeredResizes = 0;
  reopenedMaximized = 0;
  titlesRead = 0;
  return taken;
}
