import ArticleBlockquotePanel from './components/ArticleBlockquote';

export default {
  bootstrap(app) {
    app.getPlugin('content-manager').apis.addEditViewSidePanel([ArticleBlockquotePanel]);
    app.addSettingsLink('global', {
      id: 'spotify',
      to: '/settings/spotify',
      intlLabel: { id: 'spotify.settings', defaultMessage: 'Spotify connection' },
      Component: () => import('./components/SpotifyConnection'),
      permissions: [],
    });
  },
  config: {
    // The website is English-only; loading a single locale keeps the admin bundle small.
    locales: [],
  },

  register(app) {
    app.customFields.register({
      name: 'icon-picker',
      type: 'string',
      intlLabel: {
        id: 'icon-picker.label',
        defaultMessage: 'Logo',
      },
      intlDescription: {
        id: 'icon-picker.description',
        defaultMessage: 'Pick a technology or brand logo to show next to this item.',
      },
      components: {
        Input: async () => import('./components/IconPicker'),
      },
      options: {
        base: [],
        advanced: [],
      },
    });
  },
};
