import { credentials } from './cms-credentials.mjs';
const cms = process.env.CMS_URL || 'http://127.0.0.1:1337';
const login = await fetch(cms + '/admin/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials),
});
if (!login.ok) throw new Error('CMS test login failed: ' + login.status);
const token = (await login.json()).data.token;
export async function api(endpoint, method = 'GET', body) {
  const response = await fetch(cms + endpoint, {
    method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error(`${method} ${endpoint}: ${response.status}`);
  return response.status === 204 ? undefined : response.json();
}
