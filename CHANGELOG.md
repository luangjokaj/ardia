# Changelog

What Riangle Ardia changes on top of [ardia-browser/ardia](https://github.com/ardia-browser/ardia)'s `main`, newest first. Changes pulled in from the original project are in its [release notes](https://ardia.dev/release-notes).

The changelog has two parts. **Only in this fork** lists what the original project's `main` doesn't have yet; new changes land there. **Merged into the original project** lists what has since been merged into its `main`, so those changes now arrive from the original and are no longer patches of this fork. Last checked against the original's `main` on 2026-11-17.

## Only in this fork

### Open pull requests

Each is merged into `riangle` from its branch here. When the original project merges one, it moves to **Merged into the original project**.

None right now.

### 2026-11-17

#### Removed

- **iPhone app:** the `ARDIA_IOS_BUNDLE_ID` patch and the README's iPhone build steps are gone. The original project replaced the SwiftUI iPhone app in `apps/ios` with its Expo app in `apps/phone`, which this patch never covered, so the iPhone app now builds with the original's own bundle IDs.

#### Changed

- **Tabs:** a page that still hasn't drawn after the 4 s hold shows the New Tab card over a neutral estimate of the active window (`prePaintColor`) instead of the original's warmer inactive tint, so it stays closer to the New Tab background. The hold itself is now the original project's ([#2446](https://github.com/ardia-browser/ardia/pull/2446)). ([fork #22](https://github.com/luangjokaj/ardia/pull/22))

### 2026-11-13

#### Fixed

- **Building:** `scripts/lib/export-developer-id.sh` signs the app for a team whose ID starts with a digit. It wrote the team ID unquoted into the code signing requirement, which `codesign` rejects for such an ID, so a Developer ID build of this fork couldn't be made. ([2106670](https://github.com/luangjokaj/ardia/commit/21066703683cf3c31a0d5305180db82b5cea52fa))

### 2026-11-12

#### Changed

- **iPhone app:** the default for `ARDIA_IOS_BUNDLE_ID` is now `com.ardia.browser.ios`, the bundle ID the original project moved to for its TestFlight release. ([c654823](https://github.com/luangjokaj/ardia/commit/c654823c50036038a42222290ecfd7e3b523b3c5))

### 2026-11-10

#### Changed

- **iPhone app:** its bundle IDs and app group come from one build setting, `ARDIA_IOS_BUNDLE_ID`, so it builds signed with your own team and installs on your own iPhone. ([472a10b](https://github.com/luangjokaj/ardia/commit/472a10b57d4e40d771353a2ef301ab1c982093aa))

#### Docs

- README: how to build the iPhone app and install it on an iPhone. ([472a10b](https://github.com/luangjokaj/ardia/commit/472a10b57d4e40d771353a2ef301ab1c982093aa))

### 2026-11-08

#### Docs

- README: a note that this fork's default branch is `riangle`, how to keep it up to date and how to build it. ([afd790a](https://github.com/luangjokaj/ardia/commit/afd790a7f27dea7a9d712e2dc11d1e6bb83709ff))

## Merged into the original project

### 2026-11-17

#### Fixed

Merged by the original project on 2026-11-17.

- **Tabs:** switching to a tab that hasn't loaded yet keeps the profile color background of the New Tab page until its page paints, then the page fades in. Before, the content area switched to a fixed backdrop that never quite matched, warmer on one Mac and darker on another, because the New Tab background is the see-through card over the live window blur. The new page now stays invisible until it draws, the way Little Ardia already waited for its pages, with a 4 s fallback. Only on macOS. ([#2446](https://github.com/ardia-browser/ardia/pull/2446), [#2445](https://github.com/ardia-browser/ardia/issues/2445))
- **Traffic lights:** with auto-hide tabs on, they never stay behind alone at the peek spot after the peeking sidebar hides. Resetting the slide transform and moving the buttons committed in two Core Animation transactions, so a frame drawn in between showed the lights over the toolbar until the next peek; both now commit together. ([#2352](https://github.com/ardia-browser/ardia/pull/2352))
- **Window:** dragging the window's top edge resizes it, maximized too, where the cursor shows resize arrows. Since [57bae1d](https://github.com/ardia-browser/ardia/commit/57bae1d5c) every press on the top 3 pt moved the window instead. A double-click there still zooms, and the drag region just below still moves the window. ([#2340](https://github.com/ardia-browser/ardia/pull/2340), [#1187](https://github.com/ardia-browser/ardia/issues/1187))
- **Window:** in macOS split view, Ardia's edge follows the divider between the two windows instead of jumping behind it. Ardia launches with Chromium's `AsyncLiveResize` off: it held every resize step until a new frame was drawn, and macOS tiling waits on both windows at each step. ([#2340](https://github.com/ardia-browser/ardia/pull/2340), [#1127](https://github.com/ardia-browser/ardia/issues/1127))
- **Sidebar:** with auto-hide tabs on, a mouse wheel scrolls the sidebar that slides in from the window's edge again. Since [573d939](https://github.com/ardia-browser/ardia/commit/573d9396404db57cf3fc2aa0845d23bf56f59f7f) the list barely moved: wheel routing skipped the peeking sidebar's outer view, which sat off the window's edge while an inner layer slid it back. ([#2330](https://github.com/ardia-browser/ardia/pull/2330))

#### Changed

All three were merged by the original project on 2026-11-17.

- **Sidebar:** when the selected tab is scrolled out of view, a small pill with its icon and an arrow floats at the list's edge, pointing down when the tab is below and up when it is above, as Dia does. Clicking it glides the list back to the tab, and switching to a tab out of view glides there too instead of jumping. A thin line marks the list's bottom edge while tabs are hidden below, the top line meets the toolbar's, and the docked New Tab row has the same room above and below. ([#2310](https://github.com/ardia-browser/ardia/pull/2310))
- **Tab hover menu:** the address line shows only the site's domain, like `google.com`, instead of the whole address over two lines. Settings › Tabs › Show full address in tab hover menu, off by default, brings it back. ([#2311](https://github.com/ardia-browser/ardia/pull/2311))
- **Top Apps:** a new setting, Settings › Tabs › Make folders in Top Apps, off by default as in Dia: holding a tile over another, or New Folder… in its menu, no longer makes a folder, and folders you already have keep working. A folder tile shows its icons straight on the tile, spread evenly, and its folder mark matches the tile's other marks. ([#2312](https://github.com/ardia-browser/ardia/pull/2312))

### 2026-11-15

#### Fixed

- **Sidebar:** a tab whose title has line breaks, like a post on X, shows it on one line that fades out at the right edge, as Dia does. ([#2022](https://github.com/ardia-browser/ardia/pull/2022))

### 2026-11-14

#### Changed

- **Little Ardia:** the address field takes the bar's full width, up to the Copy Link button, instead of stopping at 520 pt, and shows a page loading with the same glow as the toolbar's address field instead of a thin line. A windowed peek, which shares that bar, gets the same glow. ([14ecfe1](https://github.com/luangjokaj/ardia/commit/14ecfe1ef665707da0eccf8435e7c0afe7f51458), [#1416](https://github.com/ardia-browser/ardia/pull/1416))
- **Sidebar:** with the address bar in the sidebar, its address field shows a page loading with the same glow. While the sidebar is pinned open, that's all you see; the loading pill shows only while the sidebar is hidden, and the field keeps its glow for when the sidebar slides in. In Split View, panes the sidebar's field doesn't show keep their pill. ([7087d20](https://github.com/luangjokaj/ardia/commit/7087d2075fc2bbbfbe8226d3b7487a89190d0dbb), [3aff53a](https://github.com/luangjokaj/ardia/commit/3aff53a61cd7b522048182dccf427ffd03da4fdd), [#1416](https://github.com/ardia-browser/ardia/pull/1416))
- **Toolbar:** with Hide toolbar while scrolling on, the collapsed toolbar no longer draws a progress line along its strip while a page loads; the loading pill shows the load there instead, so one indicator replaces two, and the line no longer flashes on a `#` link or a route change in a single-page app. ([d2caa37](https://github.com/luangjokaj/ardia/commit/d2caa370965499f58b07d1561d500a07e1cfbda3), [#1416](https://github.com/ardia-browser/ardia/pull/1416))
- **Split View:** the focused pane has a ring around it in the profile's color, the way Dia does: a 2 pt stroke, 1 pt outside the page, in the gap between the panes. With the page frame at 0, where the panes reach the window's edges, it sits just inside the pane instead, and follows the window's rounded corners where the pane meets them, using the radius macOS actually draws for that window. It follows focus as you click between panes and shows with the address bar in the sidebar too, where nothing marked the focused pane before (ardia-browser/ardia#1343). ([da55f41](https://github.com/luangjokaj/ardia/commit/da55f414e5cf7186508822eb147035802677ddb4), [#1695](https://github.com/ardia-browser/ardia/pull/1695))

#### Fixed

- **Building:** the native API version is 63, so a Debug build made before the address field's load glow asks for a rebuild instead of loading code that needs it. ([370c430](https://github.com/luangjokaj/ardia/commit/370c430010659c77105624af0d58a275d1b9820e), [#1416](https://github.com/ardia-browser/ardia/pull/1416))

#### Removed

- The perf ratchet's ceilings for the deleted `ProgressBar` and `TabProgressBar`. ([1e09727](https://github.com/luangjokaj/ardia/commit/1e09727e44f8e81312ed31e2095c49976a4d5feb), [#1416](https://github.com/ardia-browser/ardia/pull/1416))

### 2026-11-13

#### Changed

- **Toolbar:** with the address bar in the toolbar, the address field itself shows a page loading, the way Dia does, and the loading pill no longer appears there. A soft glow in the accent color, with a thin line along the bottom of the field, fills from the left as far as the page has loaded, then sweeps to the right end and fades when the page is done. On a site that colors the toolbar close to the accent color, the fill uses the toolbar's text color so it stays visible. The pill still shows where that field isn't visible: with the address bar in the sidebar, in full screen, in a peek, and while the toolbar is hidden as you scroll. ([a27a373](https://github.com/luangjokaj/ardia/commit/a27a373652b7533d5a96b53fda0136204625a1d9), [#1416](https://github.com/ardia-browser/ardia/pull/1416))

#### Fixed

- **Pages:** the loading pill no longer flashes on changes inside a page, like a `#` link or a route change in a single-page app (React Router and the like). It now waits 150 ms before it shows, so a load that ends sooner never shows it. ([7d4024d](https://github.com/luangjokaj/ardia/commit/7d4024d813ad46b0c10b1955c252d7f348695686), [#1416](https://github.com/ardia-browser/ardia/pull/1416))

### 2026-11-12

#### Changed

- **Pages:** while a page loads, a small pill at the top center of the page shows a bar that sweeps across in a loop, then fills, shrinks and fades when the page is done. It shows in every pane, so the loading state stays visible when the sidebar holding the address bar is hidden. It replaces the thin line under the toolbar and in the sidebar's address field; Little Ardia keeps its line. ([8d2c705](https://github.com/luangjokaj/ardia/commit/8d2c705c17d7ab2943e0021b1f8d7ce4b742b814), [#1416](https://github.com/ardia-browser/ardia/pull/1416))
- **Sidebar:** Top Apps tiles and the top strip's pinned tabs show only the site's icon by default. A new setting, Settings › Tabs › Show tab status on Top Apps, brings back the speaker, the Picture in Picture mark and the unread count, redrawn small in the tile's corners so they no longer cover the icon. Tabs and pinned rows keep theirs. ([d80b211](https://github.com/luangjokaj/ardia/commit/d80b211d5469556ece2dba0a39042ae7c02ce869), [747027b](https://github.com/luangjokaj/ardia/commit/747027b9160e49f450e171f47022a611e3b7c2bc), [#1340](https://github.com/ardia-browser/ardia/pull/1340))

#### Fixed

- **Sidebar:** the selected tab's glow is no longer cut off along the top when it is the first tab in a group that was folded and opened again. ([e053b46](https://github.com/luangjokaj/ardia/commit/e053b4653947afdc8afd09f370c8973b1ccedfbf), [#1238](https://github.com/ardia-browser/ardia/pull/1238))

### 2026-11-08

#### Changed

- **Pages:** hovering a link near the bottom of the page, like a site's footer, shows its address at the top left instead of over the footer. ([1e73b28](https://github.com/luangjokaj/ardia/commit/1e73b2896b94d500690efd23f88fa0b8a873d312))
- **Pages:** the "New tab opened" pill shows a link cursor and a hover state (a light tint, and the arrow brightens and slides right), and doesn't fade out while the pointer is over it. ([35674b1](https://github.com/luangjokaj/ardia/commit/35674b1e00fdc00fdb261674ef9a5e86b61e1987), [47b31f3](https://github.com/luangjokaj/ardia/commit/47b31f312409609104a9091773bc878e878f86f8))
- **Pages:** a link opened in a background tab, such as with ⌘-click, shows a "New tab opened" pill at the page's top right. Clicking it takes you to the new tab; it fades out after 3.5 seconds or once you go to that tab another way. ([c5d6412](https://github.com/luangjokaj/ardia/commit/c5d64128a882eedc678fefc6a3e82e70814d34f8))
- **Sidebar:** a tab's unread count sits at the right end of its row, vertically centered, instead of over the favicon's corner. On hover it steps aside for the close button. Pinned tiles and the top tab bar keep the corner badge. ([a28779e](https://github.com/luangjokaj/ardia/commit/a28779eed5eebc4ca8b6a00c457d3a2042081d1d))
- **Sidebar:** a tab in Picture in Picture shows a PiP icon in its row, instead of a badge over the favicon. Clicking the icon exits Picture in Picture. ([74af913](https://github.com/luangjokaj/ardia/commit/74af91355121188865d73ea3f0a0b384a965c075))
- **Profile badges:** the emoji or initial sits on the center of the circle, most visibly on Little Ardia's profile button. ([0787979](https://github.com/luangjokaj/ardia/commit/0787979a664994bdf724022eb930bde5730c9ed6), [#1019](https://github.com/ardia-browser/ardia/pull/1019))
