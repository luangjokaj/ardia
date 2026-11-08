# Changelog

What Riangle Ardia changes on top of [mantrakp04/ardia](https://github.com/mantrakp04/ardia)'s `main`, newest first. Changes pulled in from the original project are in its [release notes](https://ardia.dev/release-notes).

## 2026-11-08

### Changed

- **Pages:** a link opened in a background tab, such as with ⌘-click, shows a "New tab opened" pill at the page's top right. Clicking it takes you to the new tab; it fades out after 3.5 seconds or once you go to that tab another way. ([c5d6412](https://github.com/luangjokaj/ardia/commit/c5d64128a882eedc678fefc6a3e82e70814d34f8))
- **Sidebar:** a tab's unread count sits at the right end of its row, vertically centered, instead of over the favicon's corner. On hover it steps aside for the close button. Pinned tiles and the top tab bar keep the corner badge. ([a28779e](https://github.com/luangjokaj/ardia/commit/a28779eed5eebc4ca8b6a00c457d3a2042081d1d))
- **Sidebar:** a tab in Picture in Picture shows a PiP icon in its row, instead of a badge over the favicon. Clicking the icon exits Picture in Picture. ([74af913](https://github.com/luangjokaj/ardia/commit/74af91355121188865d73ea3f0a0b384a965c075))
- **Profile badges:** the emoji or initial sits on the center of the circle, most visibly on Little Ardia's profile button. ([0787979](https://github.com/luangjokaj/ardia/commit/0787979a664994bdf724022eb930bde5730c9ed6), [#1019](https://github.com/mantrakp04/ardia/pull/1019))

### Docs

- README: a note that this fork's default branch is `riangle`, how to keep it up to date and how to build it. ([afd790a](https://github.com/luangjokaj/ardia/commit/afd790a7f27dea7a9d712e2dc11d1e6bb83709ff))
