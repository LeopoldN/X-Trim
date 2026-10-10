# Submission checks — X Trim 0.1.68

Checked October 10, 2026. These are local pre-submission checks, not Mozilla approval or a full independent security audit.

## Passed

- All first-party JavaScript parses with Node.js 24.19.0; `git diff --check` passes.
- Mozilla web-ext 10.7.0 scans the complete extracted runtime package, including both unchanged vendor scripts: **0 errors, 0 notices, 1 warning**. Exact output is in `review/lint.json`.
- Standard Firefox **157.0.1**, isolated macOS profile: complete package loads as a temporary extension; actual local MP4 decoding, GIF encoding in the converter tab, generated-blob handoff, native download completion, and conversion-tab cancellation pass. Output is an animated `GIF89a` file (1,153,106 bytes for the sample). Test transport uses a local fixture endpoint and test-only data/host grants. Only the test's output-byte inspection adds `blob:` to connect-src; runtime CSP does not permit blob scripts or workers. The converter and other production scripts are unchanged in the fixture extension.
- Zen **1.23.1b**, isolated macOS profile: the same conversion, download and cancellation checks pass.
- Node policy tests: media consent refusal prevents downloading; consent enables it; remote URL allowlist and download ownership checks pass; highest-bitrate MP4 selection, poster-ID matching, and byte-for-byte response forwarding pass.
- Account tests with synthetic X responses: required consent is enforced; private-window account results do not write to local storage; normal-window cache does; denied consent prevents additional fetches.
- Popup permission grant/denial behavior passes with mocked Firefox permission responses, including exact host/data scopes and enabled/declined status. This is a logic test, not an automated test of clicking Firefox's native consent dialog.
- Vendor integrity: official npm archive matches its published SHA-512 integrity; packaged encoder/worker match the release bytes. SHA-256 hashes and immutable source commit are in `review/vendor-provenance.json`.
- MIT, events, NeuQuant and LZW notices are preserved without modifying the released encoder scripts.
- Manifest/AMO description, proposed listing, privacy policy, source archive, deterministic packaging instructions and reviewer notes are prepared.
- Explicit extension CSP restricts executable scripts/workers to bundled files, forbids objects, and restricts remote fetches to X/Twitter/video.twimg.com. Only styles permit inline declarations for existing theme controls. Video blobs are allowed as media, not executable code.

## Linter warning disposition

`UNSUPPORTED_API: platform.name is not supported`, at `vendor/gif.js/dist/gif.js:2:6241`, is a static-analysis false positive. `src/browser.coffee` defines a **local browser-detection object** with its own `platform.name`; it is not a call to Firefox's WebExtension browser API. The release files are intentionally unchanged, per Mozilla's library rules. The two minified vendor files are reported as unknown minified files in metadata, so exact distribution/source links are provided for human review. No first-party file is classified as minified.

## Data declaration and consent

`required: ["none"]` now means there is no mandatory transmission. Optional `websiteContent` consent gates media requests. Account requests additionally require `browsingActivity` and `authenticationInfo` consent. UI and background both enforce consent; queued account operations recheck consent/preferences before fetching. Optional account features default off. X is the only recipient; no developer backend exists. Documentation discloses automatic account queries while enabled and incidental credentials on native direct downloads. GIF MP4 fetches omit credentials. Private-window conversion tabs stay in their originating window.

This classification follows Mozilla's published taxonomy conservatively; Mozilla reviewers retain authority over the final classification and disclosure wording.

## Scope and remaining external steps

No live signed-in X account was used in the isolated tests; account API behavior was tested with synthetic responses. X's current authenticated API availability, rate limits, and page markup are external dependencies. No Android, Windows/Linux, Firefox 140, or native-consent-dialog automation was performed; those are outside the desktop macOS compatibility test reported here. The GIF MP4 sample was fetched from the user's original pasted page and is not redistributed in the source archive.

The artifacts remain **unsigned**. Submit the XPI and source ZIP, copy the listing/privacy/reviewer notes to AMO, and supply reviewer-controlled X test credentials if requested for authenticated features. Mozilla's automated upload validation, human review and signing can only happen after submission; they have not been claimed as complete.

## Reproduce

- Package: `python3 scripts/package.py`.
- Policy tests: `node tests/policy-checks.cjs`.
- Browser test: `python3 tests/firefox-integration.py --browser /path/to/firefox --fixture /path/to/sample.mp4` (isolated temporary profile, localhost fixture server, temporary downloads only).
- Mozilla lint: extract `x-trim.xpi` into an empty directory, then `web-ext lint --source-dir /path/to/extracted-package --output json`.

Policy references: https://extensionworkshop.com/documentation/publish/add-on-policies/ ; https://extensionworkshop.com/documentation/publish/third-party-library-usage/ ; https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/ .

## 0.1.69 sidebar update

Added an always-available Calls toggle with a stable key derived from the observed sidebar label. The preceding conversion/consent checks apply to unchanged functionality in 0.1.68. JavaScript syntax and complete-package lint were rerun for 0.1.69; see review/lint.json.
