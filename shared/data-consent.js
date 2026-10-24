// Firefox 140+ built-in consent. No remote feature may bypass these checks.
const MEDIA_DATA_TYPES = ['websiteContent'];
const ACCOUNT_DATA_TYPES = ['websiteContent', 'browsingActivity', 'authenticationInfo'];

async function hasDataConsent(types) {
  try {
    return await browser.permissions.contains({ data_collection: types });
  } catch {
    return false;
  }
}
