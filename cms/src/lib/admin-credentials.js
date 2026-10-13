const { yup } = require('@strapi/utils');

/** Server-only owner credentials. Never exported by the portfolio API or admin bundle. */
async function syncAdminCredentials(strapi, env = process.env) {
  const login = env.CMS_LOGIN_ID;
  const password = env.CMS_PASS;
  if (!login && !password) return false;
  if (!login || !password) throw new Error('Set both CMS_LOGIN_ID and CMS_PASS in the CMS server environment.');
  let email;
  try { email = yup.string().trim().lowercase().email().required().validateSync(login); }
  catch { throw new Error('CMS_LOGIN_ID must be a valid administrator email address.'); }
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72 ||
      !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password))
    throw new Error('CMS_PASS must meet Strapi password rules: at least 8 characters, uppercase, lowercase and a number; at most 72 bytes.');

  const store = strapi.store({ type: 'core', name: 'portfolio' });
  const query = strapi.db.query('admin::user');
  const userService = strapi.admin.services.user;
  const auth = strapi.admin.services.auth;
  const key = 'environment-owner-admin-v1';
  const ownerId = await store.get({ key });
  const users = await query.findMany({ populate: ['roles'] });
  const matching = users.find(user => user.email.toLowerCase() === email);
  let owner = ownerId && users.find(user => String(user.id) === String(ownerId));
  if (ownerId && !owner) throw new Error('The configured CMS administrator no longer exists. Restore or repair that account before changing its credentials.');
  if (owner && matching && matching.id !== owner.id)
    throw new Error('CMS_LOGIN_ID is already assigned to another administrator.');
  if (!owner) {
    const superAdmins = users.filter(user => user.roles?.some(role => role.code === 'strapi-super-admin'));
    if (matching && superAdmins.some(user => user.id === matching.id)) owner = matching;
    else if (superAdmins.length === 1 && !matching) owner = superAdmins[0];
    else if (users.length) throw new Error('Cannot identify one CMS owner administrator for the configured credentials.');
  }
  if (!owner) {
    owner = await userService.createFirstAdmin({ email, password, firstname: 'Portfolio', lastname: 'Administrator' });
    await store.set({ key, value: owner.id });
    strapi.log.info('CMS administrator created from server environment credentials.');
    return true;
  }
  const changed = owner.email !== email || !owner.password || !(await auth.validatePassword(password, owner.password)) || !owner.isActive;
  if (changed) {
    await userService.updateById(owner.id, {
      email, password, isActive: true, registrationToken: null,
      resetPasswordToken: null, resetPasswordTokenExpiresAt: null,
    });
    // Preserve roles/identity, but expire old refresh sessions after a credential change.
    const sessions = strapi.sessionManager;
    if (sessions?.hasOrigin('admin')) await sessions('admin').invalidateRefreshToken(String(owner.id));
    strapi.log.info('CMS administrator credentials synchronized from server environment.');
  }
  if (!ownerId) await store.set({ key, value: owner.id });
  return changed;
}

module.exports = { syncAdminCredentials };
