# Submission checks — X Trim 0.4.1

## Rerun for 0.4.1

Checked October 23, 2026. 0.4.1 = 0.4.0 plus a fix: Profile options (font, width, square avatar, avatar border, post count, account details, themed profile header) now stay on every profile timeline tab, including /name/all, /name/reposts, /name/superfollows and /name/affiliates, and on any other tab linked from X's own "Profile timelines" tab bar. Post, follower, list and settings routes are still excluded. Move post count beside Followers now also moves the header count X shows on other tabs, such as "photos & videos" on Media and "likes" on Likes. These are local pre-update checks, not Mozilla approval.

- Permissions, host permissions, optional permissions, CSP, `data_collection_permissions` and the content script list are unchanged. Only route matching in `content.js`, `about-profile.js` and `theme.js` changed; no new requests are made.
- New `tests/profile-tabs.cjs` checks the profile options on each tab and their absence on non-profile routes. `python3 scripts/package.py` rebuilt `x-trim.xpi`, `x-trim.zip` and `x-trim-source.zip`.
- Mozilla web-ext **10.8.0** lint of the extracted rebuilt XPI: **0 errors, 0 notices, 1 warning**, the same gif.js `platform.name` false positive as before. Output is in `review/lint.json`.
- All first-party JavaScript passes `node --check` with Node.js 22, and all eight `tests/*.cjs` files pass. The fix has not been run in Firefox in this environment.

The 0.4.0 and earlier notes below still apply.

## Rerun for 0.4.0

Checked October 23, 2026. 0.4.0 = 0.3.5 plus usability options, all off by default: Following tab controls, hiding promoted / Paid partnership / #ad posts, hiding counts or the action bar, exact counts and absolute / 24-hour times, keyword, regex, no-media and Premium-reply filters, focus and writer modes, new-post auto-load or hiding, fast block, a daily time limit, Media tab on Photos, and hiding the own-profile X Money button with Sidebar › Money. These are local pre-update checks, not Mozilla approval.

- Permissions, host permissions, optional permissions, CSP and `data_collection_permissions` are unchanged. The manifest adds the content script `usability.js` with `usability.css`, the background script `usability-background.js`, and a `commands` entry (Alt+Shift+F, toggles focus mode).
- `usability-background.js` reads promoted, paid-partnership, verification and following flags from X's existing GraphQL responses through the same pass-through response filter, only while the related filters are on, and messages them to the tab. Nothing is sent off the device or written to disk except `usageToday` (today's minutes) when the daily limit is on.
- Keep Following sorted by Recent wraps X's page `XMLHttpRequest.open`/`send` with `exportFunction` and sets only `enableRanking` to false on X's own `HomeLatestTimeline` request.
- Fast block clicks X's own `confirmationSheetConfirm` only within 3 seconds of the user choosing a Block menu item; `post-block.js` itself still never confirms.
- Selectors were checked against live x.com markup captured read-only on October 23, 2026 (tabs, new-posts pill, action-bar aria-labels, verified badges, the Paid partnership policy link, the own-profile `ownProfilePaymentsButton`, the profile Videos/Photos menu). No live ad was found to sample; promoted posts rely on X's `promotedMetadata` with an "Ad" label fallback. `placementTracking` is not used, since it also wraps every video.
- `content.js` now ignores storage changes to keys it does not use, so the usage counter does not trigger its passes.
- New `tests/usability.cjs` covers every option above with local fixtures plus the background parsing and counter. `python3 scripts/package.py` rebuilt `x-trim.xpi`, `x-trim.zip` and `x-trim-source.zip`.
- Mozilla web-ext **10.8.0** lint of the extracted rebuilt XPI: **0 errors, 0 notices, 1 warning**, the same gif.js `platform.name` false positive as before. Output is in `review/lint.json`.
- All first-party JavaScript passes `node --check` with Node.js 22, and all seven `tests/*.cjs` files pass. The changes have not been run in Firefox in this environment.

The 0.3.5 and earlier notes below still apply and were not rerun except where stated above.

## Rerun for 0.3.5

Checked October 23, 2026. 0.3.5 = 0.3.0 plus performance fixes for the custom theme, mainly so switching photos in X's photo viewer is smooth again. These are local pre-update checks, not Mozilla approval.

- Manifest permissions, host permissions, optional permissions, CSP, content script list and `data_collection_permissions` are unchanged from 0.3.0. Only the version changed.
- `theme.js` no longer rescans the whole page on every DOM change. It classifies only nodes X added, plus elements whose class or inline color changed, and skips inline style changes that touch no color property (X's slide and fade animations). The whole page is still scanned on load, on resize and when theme settings change. Nothing new is read or sent.
- `content.js` skips passes for DOM changes made only inside a modal dialog such as the photo viewer. `post-block.js` measures the Grok button once per Block button instead of on every scan.
- New `tests/theme-incremental.cjs` checks that animation-only style changes trigger no style reads, that added and restyled nodes are still themed without a full-page scan, and that palette changes rescan. A headless Chromium benchmark on a synthetic 4,150-element post page with 10 simulated photo swaps cut the theme's main-thread time from about 1,900 ms to about 110 ms; tagging results on a mixed fixture were identical to 0.3.0.
- `python3 scripts/package.py` rebuilt `x-trim.xpi`, `x-trim.zip` (identical to the XPI) and `x-trim-source.zip`, now including `tests/theme-incremental.cjs`.
- Mozilla web-ext **10.8.0** lint of the extracted rebuilt XPI: **0 errors, 0 notices, 1 warning**, the same gif.js `platform.name` false positive as before. Output is in `review/lint.json`.
- All first-party JavaScript passes `node --check` with Node.js 22, and all six `tests/*.cjs` files pass. The changes have not been run in Firefox in this environment.

The 0.3.0 and earlier notes below still apply and were not rerun except where stated above.

## Rerun for 0.3.0

Checked October 23, 2026. 0.3.0 = 0.2.0 plus a Dim theme preset (`theme-presets.js`), Theme tab controls (`popup.html`, `popup.css`, `popup.js`) and a new content script, `theme-extras.js`. These are local pre-update checks, not Mozilla approval.

- Manifest permissions, host permissions, optional permissions, CSP and `data_collection_permissions` are unchanged from 0.2.0. Only the version and the content script list (adding `theme-extras.js`) changed.
- `theme-extras.js` reads only X Trim's own settings from `storage.local` and sends nothing. It adds CSS for a site-wide font, post text size, post spacing, hidden divider lines and accent-colored Follow buttons. With the optional plain post text setting on, it rewrites Unicode bold/italic letters to plain letters in post text only, and restores them when turned off.
- The Custom CSS box is empty by default. Its CSS goes into a `<style>` element on X; `@import` rules are stripped, so it cannot load remote stylesheets, and nothing in it runs as script.
- `python3 scripts/package.py` rebuilt `x-trim.xpi`, `x-trim.zip` (identical to the XPI) and `x-trim-source.zip`, now including `theme-extras.js` and `tests/theme-extras.cjs`.
- Mozilla web-ext **10.8.0** lint of the extracted rebuilt XPI: **0 errors, 0 notices, 1 warning**, the same gif.js `platform.name` false positive as before. Output is in `review/lint.json`.
- All first-party JavaScript passes `node --check` with Node.js 22, and `tests/policy-checks.cjs`, `tests/account-card.cjs`, `tests/geo-timeline.cjs`, `tests/post-block.cjs` and the new `tests/theme-extras.cjs` pass.
- Selectors for post spacing, dividers and Follow buttons come from x.com's live markup on October 23, 2026. The new features have not been run in Firefox in this environment.

The 0.2.0 and earlier notes below still apply and were not rerun except where stated above.

## Rerun for 0.2.0

Checked October 23, 2026. 0.2.0 = 0.1.77 plus the tabbed toolbar popup redesign (`popup.html`, `popup.css`, `popup.js`) and a theme fix for X's chat drawer (`theme.js`). These are local pre-update checks, not Mozilla approval.

- Manifest permissions, host permissions, optional permissions, CSP and `data_collection_permissions` are unchanged from 0.1.77; only the version changed.
- `theme.js` now also writes the theme palette into a `<style>` element inside the open shadow roots X uses for its chat drawer (`xchatEmbedDrawer`, `xchatEmbedOverlays`). It reads nothing from them and sends nothing. Before this, the chat button turned back to X's native colors after the drawer was opened and closed.
- Popup and download error messages that pointed to the old "Post page" section now say "Posts", which matches the new tab names. README, listing and reviewer notes are updated the same way.
- `python3 scripts/package.py` rebuilt `x-trim.xpi`, `x-trim.zip` (identical to the XPI) and `x-trim-source.zip`.
- Mozilla web-ext **10.8.0** lint of the extracted rebuilt XPI: **0 errors, 0 notices, 1 warning**, the same gif.js `platform.name` false positive described below. Output is in `review/lint.json`.
- All first-party JavaScript passes `node --check` with Node.js 22.22.0, and `tests/policy-checks.cjs`, `tests/account-card.cjs`, `tests/geo-timeline.cjs` and `tests/post-block.cjs` pass.
- The chat drawer fix was checked on live x.com in Chrome, with `theme.js` injected and storage stubbed: the drawer and the chat button kept the custom palette through open/close cycles. It has not been run in Firefox in this environment.

The 0.1.77 notes below still apply and were not rerun except where stated above.

## 0.1.77 notes

Checked October 23, 2026 against commit `f051d82` (manifest version 0.1.77; the commit message reads "V0.1.76"). These are local pre-update checks, not Mozilla approval or a full independent security audit. X Trim is already listed on AMO; these notes are for the next version upload.

## Rerun for 0.1.77

- The `x-trim.xpi` committed in `f051d82` matched the working tree file for file and rebuilt byte for byte with `python3 scripts/package.py`. After the small fixes below, the XPI was rebuilt; its only content change is the `PRIVACY.md` date line, and `x-trim.zip` is identical to it.
- Mozilla web-ext **10.8.0** scans the complete extracted rebuilt runtime package: **0 errors, 0 notices, 1 warning** (the same vendor false positive as before, below). Exact output is in `review/lint.json`.
- All first-party JavaScript parses with Node.js 22.22.0 (`node --check`); `git diff --check` passes for 0.1.69 to 0.1.77.
- Node tests pass: `tests/policy-checks.cjs` (account consent, private-cache isolation, metadata and timeline scope enforcement; download consent, URL allowlist, ownership, variant matching and response pass-through; optional media consent UI), `tests/account-card.cjs`, `tests/geo-timeline.cjs` and `tests/post-block.cjs`.
- Vendor integrity: the npm archive for gif.js 0.2.0 was downloaded again and matches its published SHA-512 integrity; the packaged `gif.js` and `gif.worker.js` match the release bytes and `review/vendor-provenance.json`.
- Manifest permissions, host permissions, optional permissions, CSP and `data_collection_permissions` are unchanged since 0.1.69. Only content scripts (`geo-timeline.js`, `post-block.js` and their CSS) and one background script (`block-state.js`) were added.

## Features added since 0.1.68

**Account cards (0.1.72).** The About lookup now also returns display name, creation date, user ID, verification type, handle-change count, affiliation and follower/following/post/media counts. Requests, consent and storage are unchanged: the same optional `websiteContent` + `browsingActivity` + `authenticationInfo` consent, X as the only recipient, normal-window results in `aboutCache` (24 hours, at most 100 records), private-window results not written. Counts seen in X's own GraphQL responses are kept in background memory (at most 100 accounts per tab) and cleared on tab close, feature disable or consent revocation.

**Timeline country filtering (0.1.76).** Off by default. Enabling it in the popup requests the same account-data consent; the background handler checks the `geoBlocking` preference and consent again before and after queueing. While enabled with a nonempty country list, authors of posts near the viewport are looked up one at a time through the existing About request (1.5 s spacing, shared rate-limit cooldown, at most 30 pending). This is the one feature that sends a handle the user did not open, so it is the main data point to state plainly for reviewers. Results share the account cache; the content script also keeps up to 500 results in page memory. Filters only change the local view.

**Block shortcut (0.1.76, 0.1.77).** On by default. Adds a button beside X's Grok button that opens the post's own More menu and selects X's native Block item, so X shows its own confirmation and sends its own request. The extension never submits the confirmation and never uses Unblock. It sends no requests. To color already-blocked authors, `block-state.js` reads blocking flags from X's existing responses and keeps up to 1,000 handles in page memory only.

## Findings for the update

1. **Response filtering has a wider scope.** Through 0.1.69, `filterResponseData` ran only while media downloads were enabled. It now also runs while account features or the Block shortcut are on, so turning off downloads no longer turns it off (both download buttons and the shortcut default on). Its URL filter was widened from X GraphQL to also include `/i/api/1.1/blocks/*.json`, and parsed responses now feed account counts and block state as well as media URLs. Nothing is sent anywhere; bytes are still forwarded unchanged as they arrive and buffered up to 8 MB for parsing. The old reviewer notes described the narrower scope, so they are updated.
2. **Reviewer notes and listing were at 0.1.69.** Neither mentioned country filtering or the Block shortcut. Both are updated in this change.
3. **README called the Block button "optional"** without saying it is on by default. Not a policy problem, since it sends nothing. Fixed in the README and stated in the listing.
4. **`PRIVACY.md` effective date** read October 11, 2026, but its Block shortcut paragraph was added on October 23. Fixed to October 23, 2026; the policy text is otherwise unchanged.
5. **The committed source archive included two macOS `.DS_Store` files** under `vendor/`, because `scripts/package.py` collected everything there. The script now skips `.DS_Store`, and the rebuilt source archive contains none.
6. **The latest commit is titled "V0.1.76"** but contains 0.1.77. Packages and docs all say 0.1.77, so AMO is unaffected.

## Linter warning disposition

`UNSUPPORTED_API: platform.name is not supported`, at `vendor/gif.js/dist/gif.js:2:6241`, is a static-analysis false positive. `src/browser.coffee` defines a **local browser-detection object** with its own `platform.name`; it is not a call to Firefox's WebExtension browser API. The release files are intentionally unchanged, per Mozilla's library rules. The two minified vendor files are reported as unknown minified files in metadata, so exact distribution/source links are provided for human review. No first-party file is classified as minified.

## Data declaration and consent

`required: ["none"]`: there is no mandatory transmission. Optional `websiteContent` consent gates media requests. Account details and timeline country filtering additionally require `browsingActivity` and `authenticationInfo` consent. UI and background both enforce consent; queued account operations recheck consent and preferences before fetching. Account details and country filtering default off. The Block shortcut and block-state coloring transmit nothing and need no data consent. X is the only recipient; no developer backend exists. GIF MP4 fetches omit credentials. Private-window conversion tabs stay in their originating window.

This classification follows Mozilla's published taxonomy conservatively; Mozilla reviewers retain authority over the final classification and disclosure wording.

## Carried over from 0.1.68 (not rerun)

GIF conversion, download and cancellation code is unchanged since 0.1.68. The October 10, 2026 browser runs still describe it: standard Firefox 157.0.1 and Zen 1.23.1b, isolated macOS profiles, local MP4 fixture, animated `GIF89a` output, native download completion and cancellation. They were not rerun for 0.1.77 because no Firefox build or MP4 fixture is available in this environment.

No live signed-in X account was used. Account, country-filter and block-state behavior was tested only with synthetic responses and DOM fixtures. X's authenticated API availability, rate limits and page markup (including the Grok button the Block shortcut anchors to, and the More-menu `block` test ID) are external dependencies. No Android, Windows/Linux, Firefox 140 or native-consent-dialog automation was performed.

Mozilla's upload validation, human review and signing happen only after the version is uploaded and are not claimed here. Supply reviewer-controlled X test credentials if requested for authenticated features.

## Reproduce

- Package: `python3 scripts/package.py`.
- Node tests: `for t in tests/*.cjs; do node "$t"; done`.
- Browser test: `python3 tests/firefox-integration.py --browser /path/to/firefox --fixture /path/to/sample.mp4` (isolated temporary profile, localhost fixture server, temporary downloads only).
- Mozilla lint: extract `x-trim.xpi` into an empty directory, then `web-ext lint --source-dir /path/to/extracted-package --output json`.

Policy references: https://extensionworkshop.com/documentation/publish/add-on-policies/ ; https://extensionworkshop.com/documentation/publish/third-party-library-usage/ ; https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/ .
