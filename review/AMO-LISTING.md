# Proposed AMO listing

Name: X Trim

Summary: Customize X’s layout and themes, show optional account details, and save images, MP4 videos, and locally converted GIFs.

X Trim helps tidy up X. Hide Premium promotions, follow suggestions, and selected navigation items; adjust column widths and profile presentation; and choose or customize a theme.

On opened posts, download original-resolution images and available MP4 videos. The extension can discover MP4 variants when X's player uses streaming playback. HLS-only videos are not supported. X GIF MP4s can be converted locally into looping GIFs. Conversion opens a temporary X Trim tab with a preview and progress, then opens Firefox’s save dialog. Keep that tab open until saving finishes; it closes automatically afterward. GIFs use up to 480 pixels on the longest edge and 12 fps, and sources are limited to 30 seconds/32 MB. GIF files can be larger and have fewer colors than MP4s.

Remote features require optional Firefox consent. Open X Trim → Posts → Enable media downloads to allow selected media requests and GIF video-host access. Account details are separately optional and off by default. Enabling them sends the displayed account handle and existing session credentials only to X to load its About information. No information is sent to the extension author, and there are no analytics or remote conversion services. Timeline country filtering is also optional and off by default. With the same consent, it looks up the reported account location of authors near the visible part of your timeline, only on X, and collapses, highlights or hides posts from the countries you list. Unknown locations stay visible, and you can exempt accounts.

A Block button beside Grok on posts is on by default. It opens X's own Block confirmation for the post's author; X performs the block after you confirm. It sends no extra requests. Turn it off under Posts.

Local layout, theme and Block shortcut features work without remote-feature consent.

Firefox desktop 140+; permission consent on Android requires 142+. X changes its interface and APIs frequently, so compatibility can change.

Privacy policy: use the included PRIVACY.md text in the submission's privacy-policy field or host that exact text and provide its URL. Do not publish a nonexistent policy URL.
