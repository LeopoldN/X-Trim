# X Trim

**v0.1.62** · Firefox / Zen 140+

Tidy up X: hide promotions and sidebar items, change column widths, customize profiles, pick a theme, and download GIFs or direct MP4 videos. Everything is controlled from the toolbar popup.

## Try it

Open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on**, then choose one:

- **XPI:** select [`x-trim.xpi`](x-trim.xpi). No extraction needed.
- **ZIP:** select [`x-trim.zip`](x-trim.zip) directly.
- **Source:** download and extract the repo, or clone it, then select `manifest.json` inside the project folder.

Open or reload [x.com](https://x.com), allow site access if asked, and open the extension’s toolbar popup. To add links from X’s More menu, open that menu first, then click **Refresh More options** in the popup.

Temporary installs last until the browser restarts. Load it again next time. These packages are unsigned; normal permanent installation in Firefox requires Mozilla signing. See [Mozilla’s temporary installation guide](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/).

## Privacy & rough edges

Settings stay in your browser. No analytics. Optional account details use your signed-in X session and are cached locally for 24 hours; authentication headers stay in memory and requests go only to X. Downloads use the browser’s Save As dialog.

X changes often, so some controls may break. Promotion matching works best in English. Video downloads support direct MP4s, including X’s GIFs; streaming-only videos aren’t supported. Report bugs with steps to reproduce.

## License & credits

Original project code and documentation are dedicated to the public domain under [CC0 1.0](LICENSE). Use, change, share, or sell them; no credit required. Third-party work keeps its own terms.

Palette credits: [Tokyo Night](https://github.com/folke/tokyonight.nvim), [Rosé Pine](https://rosepinetheme.com/palette/), [Catppuccin](https://catppuccin.com/palette/), [Dracula](https://draculatheme.com/contribute), [Nord](https://www.nordtheme.com/docs/colors-and-palettes/), [Gruvbox](https://github.com/morhetz/gruvbox). Account-details reference: [xaitax](https://github.com/xaitax/x-account-location-device).
