// Chrome runs X Trim's background as one service worker. importScripts shares one
// global scope, the same way Firefox shares it between background scripts.
// Service workers have no object URLs; the GIF converter tab revokes its own.
if(!URL.revokeObjectURL)URL.revokeObjectURL=()=>{};
importScripts(
  '/chrome/browser-compat.js',
  '/shared/data-consent.js',
  '/background/account-details.js',
  '/background/gif-conversion.js',
  '/background/post-block.js',
  '/background/usability.js',
  '/background/media-download.js',
  '/background/site-access.js',
  '/chrome/page-responses.js'
);
