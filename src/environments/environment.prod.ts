export const environment = {
  production: true,
  sentryDsn:
    'https://34ad2b87d436031a9eda1006f626bc85@o4511548273917952.ingest.us.sentry.io/4511548277981185',
  googleClientId: '125662553556-q6agb67d8q0d253docbi55kk3ps6hc9b.apps.googleusercontent.com',
  // O client id do aplicativo do Discord (portal → Applications → OAuth2). É público:
  // viaja na URL de autorização. O segredo fica só no back. Vazio esconde o botão.
  discordClientId: '1539695838731837621',
  apis: {
    soulsGuide: 'https://api-gateway-ca6bve3kea-rj.a.run.app/souls-guide-api',
    auth: 'https://api-gateway-ca6bve3kea-rj.a.run.app/authorization-api',
    users: 'https://api-gateway-ca6bve3kea-rj.a.run.app/user-api',
    storage: 'https://api-gateway-ca6bve3kea-rj.a.run.app/storage-api',
  },
};
