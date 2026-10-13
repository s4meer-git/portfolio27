module.exports = ({ env }) => ({
  host: env('HOST', '127.0.0.1'),
  port: env.int('PORT', 1337),
  url: env('PUBLIC_URL', ''),
  proxy: {
    koa: env.bool('TRUST_PROXY', false),
    ipHeader: 'X-Forwarded-For',
    maxIpsCount: 1,
  },
  app: { keys: env.array('APP_KEYS') },
});
