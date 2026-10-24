# X Trim 0.5.1 — reviewer notes

## Code and packaging

All executable code is packaged in the XPI. No runtime code downloads, eval, CSP-header modification, native messaging, external conversion services, or analytics. First-party code is readable JavaScript with no compilation. Rebuild with Python 3: `python3 scripts/package.py`. This uses an explicit runtime file list, fixed archive timestamps and sorted members. Archives are written to `dist/`. The source ZIP includes original vendor source and source maps, tests, notices, and packaging script. It excludes tool installations and browser downloads.

Source layout: `content/` holds the content scripts and styles for x.com (loaded in manifest order), `background/` the background page scripts, `shared/data-consent.js` the consent checks used by both the background page and the popup, `popup/` the toolbar popup, `gif-converter/` the local GIF conversion tab, and `vendor/gif.js/` the unmodified gif.js release.

The optional Theme → Custom CSS box (empty by default) puts only CSS the user typed into a `<style>` element on X pages. `@import` rules are removed so it cannot load remote stylesheets, and it never runs script.

## Third-party library

Only gif.js 0.2.0 (released npm package) is used. The two runtime scripts are byte-for-byte unchanged. Official release: https://registry.npmjs.org/gif.js/-/gif.js-0.2.0.tgz . Upstream repository: https://github.com/jnordberg/gif.js . Immutable release source commit from npm's gitHead: https://github.com/jnordberg/gif.js/tree/55bdbfea897753787fd2f4efc62f144371351522/src . Exact distributed scripts are `package/dist/gif.js` and `package/dist/gif.worker.js` inside the npm archive. `review/vendor-provenance.json` records archive SHA-512 integrity and individual SHA-256 hashes. Upstream sources, build script and source maps are included for inspection; rebuilding that historical library is not a first-party build step. MIT license plus bundled events/NeuQuant notices and LZW acknowledgements are included. Upstream scripts have not been edited to add notices.

## Permissions and data

- `storage`: preferences and bounded normal-window account-detail cache.
- `downloads`: user-selected image/MP4/GIF files and their progress; generated GIF URL cleanup.
- `webRequest`: X's request headers for optional account details and country filtering, and X's own API responses.
- `webRequestBlocking`, `webRequestFilterResponse`: Firefox's response filter API, restricted to X's existing GraphQL and `/i/api/1.1/blocks/*.json` XMLHttpRequests, and active only while media downloads, account features, the Block shortcut, or the promoted / Paid partnership / Premium filters are enabled. Response bytes are forwarded unchanged as they arrive. Up to 8 MB per response is buffered for JSON parsing. Only media IDs/MP4 URLs (downloads), follower/following/post/media counts (account features, at most 100 accounts per tab) per-handle blocking flags (Block shortcut, at most 1,000 handles in page memory) and per-post promoted / paid-partnership / author-verification / following flags (usability filters, at most 5,000 posts in page memory) survive parsing. None of it is transmitted or written to disk.
- X/Twitter host access: content scripts and the X-only functions above.
- Optional `video.twimg.com` host access: user-initiated credential-free GIF MP4 fetch.

No required data transmission. Optional `websiteContent` consent gates media downloads. Optional `websiteContent`, `browsingActivity`, `authenticationInfo` consent gates account details and timeline country filtering, both when enabled in the popup and again in background request handlers. Both are off by default. Country filtering is the one feature that looks up accounts the user did not open: while it is enabled with a nonempty country list, authors of posts near the viewport are queried one at a time through the same About request, with the same cache, spacing and rate-limit backoff. The Block shortcut (on by default) sends no requests and needs no data consent: it clicks X's own More menu and Block item, and X shows its own confirmation and performs the block. Declining/revoking consent leaves local features usable and prevents the relevant requests. Existing users with enabled account-detail preferences must re-enable those features to grant consent. The included privacy policy explains destinations, session headers/cookies and retention. Private-window account results are not persisted. See PRIVACY.md and the proposed listing.

## Testing

Install the unsigned XPI temporarily through about:debugging, or load manifest.json. A signed build is required for permanent installation. Allow access to X. Layout/theme controls can be tested without signing in. For account details and X's authenticated timeline/post interface, use a reviewer-controlled X test account; no user credentials are included in the source.

1. Open a post, enable download buttons in the popup. Without optional data consent, downloading must display the instruction to enable media downloads and must not start a fetch/download.
2. Open X Trim → Posts → Enable media downloads. Decline the prompt: local features remain usable and the enable button remains available. Approve: the button reports enabled.
3. On a GIF post, click Download GIF. The converter tab shows local progress and preview. Save as `.gif`; verify animation and looping. The tab closes after completion. Closing it while converting cancels with a retry error.
4. On an ordinary video, Download saves MP4 without converting. Images request original resolution. Streaming playback is supported only when metadata supplies an MP4 variant.
5. Revoke optional data consent, retry: the background handler blocks the operation. Regrant from the popup.
6. Enable account details: a separate data-consent prompt is required. Decline: the checkbox stays off. Approve: only X receives authenticated account queries. Revoke: further queries are blocked. Private-window account results must not update aboutCache.
7. Filters → enter a country (for example `US`) → Enable country filtering. The same account-data consent prompt appears; declining leaves it off. With consent, matching timeline posts collapse with Show post (or highlight / fully hide, per the selected mode). Unknown locations stay visible, opened posts are only highlighted, and disabling filtering restores every post.
8. With Posts → Block button enabled (default), click the button beside Grok on a post. X's own Block confirmation for that author opens; cancelling it leaves the account unblocked. The extension never confirms the dialog itself. Already-blocked authors show a red button.

9. Usability (all off by default; Trim, Feed, Layout, Posts, Profile and Filters tabs). `content/usability.js` changes only what each switch names. Keep Following sorted by Recent wraps X's page `XMLHttpRequest.open`/`send` through Firefox's `exportFunction` and, only for X's own `HomeLatestTimeline` request, sets the `enableRanking` variable to false; it adds no request and changes nothing else. Fast block (Posts) clicks X's own `confirmationSheetConfirm` button only within 3 seconds after the user chooses a Block menu item. The daily limit counts visible, focused X time in the background page and stores only today's total (`usageToday`). The `commands` entry is the rebindable Alt+Shift+F focus-mode shortcut.
10. Explore page (all off by default; Trim tab). Open x.com/explore and switch on any of the five Explore tiles: that section of the Explore tab disappears, and the Trending, News, Sports and Entertainment tabs stay unchanged. `content/explore.js` only sets `data-xtrim-explore` labels on X's timeline cells and root flags; `content/explore.css` hides labelled cells. No requests.

Automated fixture tests use local/synthetic responses and isolated browser profiles. They do not validate a live signed-in X account. Real X API availability/rate limits remain external dependencies. The checked results and any linter warnings are recorded in review/CHECKS.md.
