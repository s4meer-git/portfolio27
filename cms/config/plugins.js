module.exports = ({ env }) => ({
  'users-permissions': { config: { jwtSecret: env('JWT_SECRET') } },
  // Outgoing email over SMTP: contact-form notifications (and admin password resets).
  // Configured only when SMTP_HOST is set; without it the CMS sends nothing and
  // messages are still stored under Content Manager → Messages.
  ...(env('SMTP_HOST')
    ? {
        email: {
          config: {
            provider: 'nodemailer',
            providerOptions: {
              host: env('SMTP_HOST'),
              port: env.int('SMTP_PORT', 587),
              // true for port 465; 587 upgrades with STARTTLS.
              secure: env.bool('SMTP_SECURE', env.int('SMTP_PORT', 587) === 465),
              auth: { user: env('SMTP_USERNAME'), pass: env('SMTP_PASSWORD') },
            },
            settings: {
              defaultFrom: env('SMTP_FROM', env('SMTP_USERNAME')),
              defaultReplyTo: env('SMTP_FROM', env('SMTP_USERNAME')),
            },
          },
        },
      }
    : {}),
});
