# X Trim

**v0.2.0** · Firefox / Zen 140+

Tidy up X: hide promotions and sidebar items, change column widths, customize profiles, pick a theme (including X’s retired Dim), change the font, post text size and spacing, add your own CSS, and download images, GIFs, and MP4 videos discovered in X’s metadata. Everything is controlled from the toolbar popup.

## Try it

Open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on**, then choose one:

- **XPI:** select [`x-trim.xpi`](x-trim.xpi). No extraction needed.
- **ZIP:** select [`x-trim.zip`](x-trim.zip) directly.
- **Source:** download and extract the repo, or clone it, then select `manifest.json` inside the project folder.

Open or reload [x.com](https://x.com), allow site access if asked, and open the extension’s toolbar popup. To add links from X’s More menu, open that menu first, then click **Refresh** under **Add from More** on the popup’s Sidebar tab.

Temporary installs last until the browser restarts. Load it again next time. These packages are unsigned; normal permanent installation in Firefox requires Mozilla signing. See [Mozilla’s temporary installation guide](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/).

## Privacy & rough edges

Settings stay in your browser. No analytics. Media downloads require optional website-content consent; account details require separate optional website-content, browsing-activity, and authentication-information consent. Optional account details use your signed-in X session and are cached locally for 24 hours; authentication headers stay in memory and requests go only to X. Downloads use the browser’s Save As dialog.

X changes often, so some controls may break. Promotion matching works best in English. Video downloads read existing X GraphQL responses locally to find the best available MP4, including when playback uses a blob URL. Reload the post after installing or enabling downloads so metadata can be captured. HLS-only videos are not supported. A filling button shows byte progress when Firefox reports the file size; otherwise it shows an indeterminate animation. Video URLs are cached only in memory, up to 100 per tab, and cleared when downloads are disabled or the tab closes. Report bugs with steps to reproduce.

## License & credits

Original project code and documentation are dedicated to the public domain under [CC0 1.0](LICENSE). Use, change, share, or sell them; no credit required. Third-party work keeps its own terms.

Palette credits: [Tokyo Night](https://github.com/folke/tokyonight.nvim), [Rosé Pine](https://rosepinetheme.com/palette/), [Catppuccin](https://catppuccin.com/palette/), [Dracula](https://draculatheme.com/contribute), [Nord](https://www.nordtheme.com/docs/colors-and-palettes/), [Gruvbox](https://github.com/morhetz/gruvbox). Account-details reference: [xaitax](https://github.com/xaitax/x-account-location-device).

## Local GIF conversion

X GIF MP4s (`/tweet_video/`) save as looping `.gif` files. Conversion runs in the extension using bundled gif.js 0.2.0; no conversion service or runtime code downloads are used. Ordinary videos remain MP4s. GIFs use up to 480 pixels on the longest edge and 12 frames per second; longer/larger clips may be scaled further to bound memory. Sources are limited to 32 MB and 30 seconds, with one conversion at a time. GIF files may be larger and have fewer colors than the MP4. The button shows fetching, frame extraction, encoding, and saving progress; these stages are not a time estimate.

Bundled encoder: [gif.js](https://github.com/jnordberg/gif.js), v0.2.0, MIT (see `vendor/gif.js/LICENSE`). The unchanged npm release's source, build script, package metadata, and source maps are retained in the repository for review. Runtime packages include only its two distribution scripts and license. To reproduce the vendor files, extract `https://registry.npmjs.org/gif.js/-/gif.js-0.2.0.tgz`; the upstream MIT license is included separately. No build step is used for X Trim's own code.

GIF setup: open the X Trim toolbar popup → Posts → Enable media downloads, then approve Firefox’s permission prompt for `video.twimg.com`. This is optional and normally only needed once; declining leaves the other features available. If you revoke access later, the same button lets you enable it again.

Zen compatibility: GIF conversion opens a temporary extension tab with a video preview, because decoding in the hidden background page can fail on macOS. Keep it open until saving completes; it closes automatically afterward. Closing it during conversion cancels the operation.

Submission materials: [privacy policy](PRIVACY.md), [proposed AMO listing](review/AMO-LISTING.md), [reviewer notes](review/REVIEWER-NOTES.md), and [check results](review/CHECKS.md). Rebuild unsigned packages with `python3 scripts/package.py`.

Calls and Money are available in Sidebar navigation, including when your cached navigation predates X’s rollout. Uncheck either item to hide it; uncheck Money to remove the dollar icon from the sidebar.

## Account details

Enable account details under Profile or Posts. The compact flag and connection-source badge opens a theme-aware account card with location, connection source, account creation date, user ID and affiliation. Missing values are not inferred. Escape or an outside click closes the card; Refresh details requests fresh account information.

The card is independently implemented with visual inspiration from the xaitax reference linked above. No reference source code is bundled; no project-wide license was present in its repository at inspection. Requests go directly to X, with a local cache and rate-limit backoff. No community service is used.

## Timeline country filtering

Open the **Filters** tab in the toolbar popup. Enter comma-separated country names or two-letter country codes, then enable filtering and approve Firefox’s account-data consent. Choose collapse with **Show post**, highlight with the theme’s accent border, or **Fully hide** without a placeholder, and optionally list exempt handles under **Always show**. Region names match X’s reported label exactly; they do not expand into member countries.

Near-visible authors are looked up sequentially, using the same 24-hour local cache and rate-limit backoff as account cards. Unknown locations remain visible. Opened posts are highlighted rather than collapsed. Show post reveals that post for the current page session. Quoted accounts are not independently filtered. Disabling filtering restores the posts. Requests go only to X; no community cache is used.

The Block button to the left of Grok (on by default) opens X’s native Block confirmation for the post author. X handles the block after you confirm. Toggle the shortcut under Posts. No additional credential handling or API requests are performed by this shortcut.
