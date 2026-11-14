# Changelog

What Riangle Ardia changes on top of [ardia-browser/ardia](https://github.com/ardia-browser/ardia)'s `main`, newest first. Changes pulled in from the original project are in its [release notes](https://ardia.dev/release-notes).

The changelog has two parts. **Only in this fork** lists what the original project's `main` doesn't have yet; new changes land there. **Merged into the original project** lists what has since been merged into its `main`, so those changes now arrive from the original and are no longer patches of this fork. Last checked against the original's `main` on 2026-11-12.

## Only in this fork

### 2026-11-14

#### Changed

- **Split View:** the focused pane has an accent ring around it, the way Dia does: a 2 pt stroke in the profile's accent color, 1 pt outside the page, in the gap between the panes. It follows focus as you click between panes and shows with the address bar in the sidebar too, where nothing marked the focused pane before (ardia-browser/ardia#1343).

### 2026-11-13

#### Changed

- **Toolbar:** with the address bar in the toolbar, the address field itself shows a page loading, the way Dia does, and the loading pill no longer appears there. A soft glow in the accent color, with a thin line along the bottom of the field, fills from the left as far as the page has loaded, then sweeps to the right end and fades when the page is done. On a site that colors the toolbar close to the accent color, the fill uses the toolbar's text color so it stays visible. The pill still shows where that field isn't visible: with the address bar in the sidebar, in full screen, in a peek, and while the toolbar is hidden as you scroll. ([a27a373](https://github.com/luangjokaj/ardia/commit/a27a373652b7533d5a96b53fda0136204625a1d9))

#### Fixed

- **Pages:** the loading pill no longer flashes on changes inside a page, like a `#` link or a route change in a single-page app (React Router and the like). It now waits 150 ms before it shows, so a load that ends sooner never shows it. ([7d4024d](https://github.com/luangjokaj/ardia/commit/7d4024d813ad46b0c10b1955c252d7f348695686))
- **Building:** `scripts/lib/export-developer-id.sh` signs the app for a team whose ID starts with a digit. It wrote the team ID unquoted into the code signing requirement, which `codesign` rejects for such an ID, so a Developer ID build of this fork couldn't be made. ([2106670](https://github.com/luangjokaj/ardia/commit/21066703683cf3c31a0d5305180db82b5cea52fa))

### 2026-11-12

#### Changed

- **Pages:** while a page loads, a small pill at the top center of the page shows a bar that sweeps across in a loop, then fills, shrinks and fades when the page is done. It shows in every pane, so the loading state stays visible when the sidebar holding the address bar is hidden. It replaces the thin line under the toolbar and in the sidebar's address field; Little Ardia keeps its line. ([8d2c705](https://github.com/luangjokaj/ardia/commit/8d2c705c17d7ab2943e0021b1f8d7ce4b742b814))
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

### 2026-11-12

#### Fixed

- **Sidebar:** the selected tab's glow is no longer cut off along the top when it is the first tab in a group that was folded and opened again. ([e053b46](https://github.com/luangjokaj/ardia/commit/e053b4653947afdc8afd09f370c8973b1ccedfbf), [#1238](https://github.com/ardia-browser/ardia/pull/1238))

#### Changed

- **Sidebar:** Top Apps tiles and the top strip's pinned tabs show only the site's icon by default. A new setting, Settings › Tabs › Show tab status on Top Apps, brings back the speaker, the Picture in Picture mark and the unread count, redrawn small in the tile's corners so they no longer cover the icon. Tabs and pinned rows keep theirs. ([d80b211](https://github.com/luangjokaj/ardia/commit/d80b211d5469556ece2dba0a39042ae7c02ce869), [747027b](https://github.com/luangjokaj/ardia/commit/747027b9160e49f450e171f47022a611e3b7c2bc), [#1340](https://github.com/ardia-browser/ardia/pull/1340))

### 2026-11-08

#### Changed

- **Pages:** hovering a link near the bottom of the page, like a site's footer, shows its address at the top left instead of over the footer. ([1e73b28](https://github.com/luangjokaj/ardia/commit/1e73b2896b94d500690efd23f88fa0b8a873d312))
- **Pages:** the "New tab opened" pill shows a link cursor and a hover state (a light tint, and the arrow brightens and slides right), and doesn't fade out while the pointer is over it. ([35674b1](https://github.com/luangjokaj/ardia/commit/35674b1e00fdc00fdb261674ef9a5e86b61e1987), [47b31f3](https://github.com/luangjokaj/ardia/commit/47b31f312409609104a9091773bc878e878f86f8))
- **Pages:** a link opened in a background tab, such as with ⌘-click, shows a "New tab opened" pill at the page's top right. Clicking it takes you to the new tab; it fades out after 3.5 seconds or once you go to that tab another way. ([c5d6412](https://github.com/luangjokaj/ardia/commit/c5d64128a882eedc678fefc6a3e82e70814d34f8))
- **Sidebar:** a tab's unread count sits at the right end of its row, vertically centered, instead of over the favicon's corner. On hover it steps aside for the close button. Pinned tiles and the top tab bar keep the corner badge. ([a28779e](https://github.com/luangjokaj/ardia/commit/a28779eed5eebc4ca8b6a00c457d3a2042081d1d))
- **Sidebar:** a tab in Picture in Picture shows a PiP icon in its row, instead of a badge over the favicon. Clicking the icon exits Picture in Picture. ([74af913](https://github.com/luangjokaj/ardia/commit/74af91355121188865d73ea3f0a0b384a965c075))
- **Profile badges:** the emoji or initial sits on the center of the circle, most visibly on Little Ardia's profile button. ([0787979](https://github.com/luangjokaj/ardia/commit/0787979a664994bdf724022eb930bde5730c9ed6), [#1019](https://github.com/ardia-browser/ardia/pull/1019))
