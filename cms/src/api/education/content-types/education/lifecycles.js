const { validateOrganizationUrl } = require('../../../../lib/organization-url');
module.exports = { beforeCreate: validateOrganizationUrl, beforeUpdate: validateOrganizationUrl };
