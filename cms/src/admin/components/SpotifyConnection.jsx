import * as React from 'react';
import { Box, Button, Field, Flex, TextInput, Typography } from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';

export default function SpotifyConnection() {
  const { get, put, post } = useFetchClient();
  const [clientId, setClientId] = React.useState('');
  const [refreshToken, setRefreshToken] = React.useState('');
  const [settings, setSettings] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [message, setMessage] = React.useState(() => {
    const result = new URLSearchParams(window.location.search).get('connection');
    return { success: 'Spotify connected. Your portfolio will update automatically.', cancelled: 'Connection cancelled. Your saved settings are unchanged.', failed: 'Could not connect. Check your Spotify app redirect URI and try again.' }[result] || '';
  });
  React.useEffect(() => {
    let active = true;
    get('/spotify-connection').then(({ data }) => {
      if (active) { setSettings(data); setClientId(data.clientId); }
    }).catch(() => { if (active) setError('Could not load settings. Sign in as a Super Admin and refresh.'); });
    return () => { active = false; };
  }, [get]);
  async function action(kind) {
    setBusy(true); setError(''); setMessage('');
    try {
      if (kind === 'save') {
        const { data } = await put('/spotify-connection', { clientId: clientId.trim(), refreshToken: refreshToken.trim() });
        setSettings(data); setClientId(data.clientId); setRefreshToken(''); setMessage('Saved. You can now connect your Spotify account.');
      } else if (kind === 'connect') {
        const { data } = await post('/spotify-connection/connect');
        window.location.assign(data.url);
      } else {
        const { data } = await post('/spotify-connection/disconnect');
        setSettings(data); setRefreshToken(''); setMessage('Spotify disconnected.');
      }
    } catch (err) { setError(err.response?.data?.error?.message || 'Could not save the connection. Please try again.'); }
    finally { setBusy(false); }
  }
  const dirty = clientId.trim() !== settings?.clientId || !!refreshToken;
  const health = settings?.health;
  const limited = health?.blockedUntil > Date.now();
  return (
    <Box padding={8} style={{ maxWidth: 1000 }}>
      <Typography variant="alpha" tag="h1">Spotify connection</Typography>
      <Box paddingTop={3} paddingBottom={6}><Typography textColor="neutral600">Save your Spotify app Client ID, then connect your account to show live listening activity.</Typography></Box>
      <Box background="neutral0" padding={6} borderRadius="4px" shadow="filterShadow">
        <form onSubmit={event => { event.preventDefault(); action('save'); }}>
          <Flex direction="column" alignItems="stretch" gap={5}>
            {error && <Typography role="alert" textColor="danger600">{error}</Typography>}
            {message && <Typography role="status" textColor="neutral800">{message}</Typography>}
            <Field.Root name="spotify-client-id" hint="From your Spotify app dashboard. This is the Client ID, not the Client Secret." required>
              <Field.Label>Client ID</Field.Label>
              <TextInput name="spotify-client-id" value={clientId} onChange={event => setClientId(event.target.value)} autoComplete="off" placeholder="Paste your Spotify Client ID" disabled={!settings || busy} required />
              <Field.Hint />
            </Field.Root>
            <Field.Root name="spotify-redirect-uri" hint="Copy this exact URL into the Redirect URIs in your Spotify app dashboard.">
              <Field.Label>Redirect URI</Field.Label>
              <TextInput name="spotify-redirect-uri" value={settings?.redirectUri || ''} readOnly />
              <Field.Hint />
            </Field.Root>
            <details>
              <summary style={{ cursor: 'pointer', fontSize: '14px' }}>Already have a refresh token?</summary>
              <Box paddingTop={4}>
                <Field.Root name="spotify-refresh-token" hint="Optional. Connect Spotify obtains this automatically. Leave blank to keep your saved token. Saved tokens are never displayed.">
                  <Field.Label>Refresh token</Field.Label>
                  <TextInput name="spotify-refresh-token" type="password" value={refreshToken} onChange={event => setRefreshToken(event.target.value)} autoComplete="new-password" disabled={!settings || busy} placeholder={settings?.hasRefreshToken ? 'A token is saved' : 'Paste an existing refresh token'} />
                  <Field.Hint />
                </Field.Root>
              </Box>
            </details>
            <Typography textColor="neutral600">{settings?.hasRefreshToken ? 'A connection token is saved.' : 'No Spotify account connected yet.'}</Typography>
            {limited && <Typography role="status" textColor="warning700">Spotify has temporarily limited requests. The last known song stays visible. Checks resume after {new Date(health.blockedUntil).toLocaleString(undefined, { timeZoneName: 'short' })} when someone visits the website. Reconnecting or redeploying will not clear this limit.</Typography>}
            {!limited && health?.issue === 'reconnect_required' && <Typography role="alert" textColor="danger600">Spotify rejected the saved connection. Use Connect Spotify to sign in again.</Typography>}
            {!limited && health?.issue === 'access_denied' && <Typography role="alert" textColor="danger600">Spotify denied playback access. Check your Spotify app's user access and account eligibility.</Typography>}
            {!!health?.lastSuccessAt && <Typography textColor="neutral600">Last successful playback check: {new Date(health.lastSuccessAt).toLocaleString(undefined, { timeZoneName: 'short' })}.</Typography>}
            <Flex gap={3} wrap="wrap">
              <Button type="submit" disabled={!settings || busy}>Save</Button>
              <Button type="button" variant="secondary" disabled={!settings?.clientId || dirty || busy} onClick={() => action('connect')}>Connect Spotify</Button>
              {settings?.hasRefreshToken && <Button type="button" variant="danger-light" disabled={busy} onClick={() => action('disconnect')}>Disconnect</Button>}
            </Flex>
            <Typography textColor="neutral600">Track wording and visibility are editable in Content Manager → Website settings → Spotify status.</Typography>
          </Flex>
        </form>
      </Box>
    </Box>
  );
}
