# Submission checks — X Trim 0.1.77

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
