const { errors } = require('@strapi/utils');

/** Field validation also runs through Content Manager, where schema regex isn't enforced. */
function validateOrganizationUrl(event) {
  const data = event.params.data;
  if (!Object.prototype.hasOwnProperty.call(data, 'linkedinUrl')) return;
  const value = data.linkedinUrl;
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) {
    data.linkedinUrl = null;
    return;
  }
  let valid = false;
  if (typeof value === 'string' && value.length <= 2048) {
    try {
      const url = new URL(value.trim());
      valid = /^https?:$/.test(url.protocol) && !url.username && !url.password && !url.port &&
        /^(?:www\.|[a-z]{2,3}\.)?linkedin\.com$/i.test(url.hostname) &&
        /^\/(company|school)\/[a-z\d_-]+(?:\/(?:about|posts|people|life))?\/?$/i.test(url.pathname);
    } catch { /* Report the same readable field error below. */ }
  }
  if (!valid) throw new errors.ValidationError('Enter a public LinkedIn company or school URL, or leave it empty.');
  data.linkedinUrl = value.trim();
}
module.exports = { validateOrganizationUrl };
