# X Trim 0.1.68 — reviewer notes

## Code and packaging

All executable code is packaged in the XPI. No runtime code downloads, eval, CSP-header modification, native messaging, external conversion services, or analytics. First-party code is readable JavaScript with no compilation. Rebuild with Python 3: `python3 scripts/package.py`. This uses an explicit runtime file list, fixed archive timestamps and sorted members. The source ZIP includes original vendor source and source maps, tests, notices, and packaging script. It excludes tool installations and browser downloads.

## Third-party library

Only gif.js 0.2.0 (released npm package) is used. The two runtime scripts are byte-for-byte unchanged. Official release: https://registry.npmjs.org/gif.js/-/gif.js-0.2.0.tgz . Upstream repository: https://github.com/jnordberg/gif.js . Immutable release source commit from npm's gitHead: https://github.com/jnordberg/gif.js/tree/55bdbfea897753787fd2f4efc62f144371351522/src . Exact distributed scripts are `package/dist/gif.js` and `package/dist/gif.worker.js` inside the npm archive. `review/vendor-provenance.json` records archive SHA-512 integrity and individual SHA-256 hashes. Upstream sources, build script and source maps are included for inspection; rebuilding that historical library is not a first-party build step. MIT license plus bundled events/NeuQuant notices and LZW acknowledgements are included. Upstream scripts have not been edited to add notices.

## Permissions and data

- `storage`: preferences and bounded normal-window account-detail cache.
- `downloads`: user-selected image/MP4/GIF files and their progress; generated GIF URL cleanup.
- `webRequest`: X's request headers for optional account details, and media metadata responses.
- `webRequestBlocking`, `webRequestFilterResponse`: Firefox's response filter API, restricted to existing X GraphQL XMLHttpRequests; response bytes are immediately forwarded unchanged. Up to 8 MB per response is buffered for JSON parsing. Only media IDs/MP4 URLs survive parsing.
- X/Twitter host access: content scripts and the X-only functions above.
- Optional `video.twimg.com` host access: user-initiated credential-free GIF MP4 fetch.

No required data transmission. Optional `websiteContent` consent gates media downloads. Optional `websiteContent`, `browsingActivity`, `authenticationInfo` consent gates account details, both when enabled in the popup and again in background request handlers. Account details are off by default. Declining/revoking consent leaves local features usable and prevents the relevant requests. Existing users with enabled account-detail preferences must re-enable those features to grant consent. The included privacy policy explains destinations, session headers/cookies and retention. Private-window account results are not persisted. See PRIVACY.md and the proposed listing.

## Testing

Install the unsigned XPI temporarily through about:debugging, or load manifest.json. A signed build is required for permanent installation. Allow access to X. Layout/theme controls can be tested without signing in. For account details and X's authenticated timeline/post interface, use a reviewer-controlled X test account; no user credentials are included in the source.

1. Open a post, enable download buttons in the popup. Without optional data consent, downloading must display the instruction to enable media downloads and must not start a fetch/download.
2. Open X Trim → Post page → Enable media downloads. Decline the prompt: local features remain usable and the enable button remains available. Approve: the button reports enabled.
3. On a GIF post, click Download GIF. The converter tab shows local progress and preview. Save as `.gif`; verify animation and looping. The tab closes after completion. Closing it while converting cancels with a retry error.
4. On an ordinary video, Download saves MP4 without converting. Images request original resolution. Streaming playback is supported only when metadata supplies an MP4 variant.
5. Revoke optional data consent, retry: the background handler blocks the operation. Regrant from the popup.
6. Enable account details: a separate data-consent prompt is required. Decline: the checkbox stays off. Approve: only X receives authenticated account queries. Revoke: further queries are blocked. Private-window account results must not update aboutCache.

Automated fixture tests use local/synthetic responses and isolated browser profiles. They do not validate a live signed-in X account. Real X API availability/rate limits remain external dependencies. The checked results and any linter warnings are recorded in review/CHECKS.md.
