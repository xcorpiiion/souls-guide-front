// Usado pela imagem Docker do front (nginx). As APIs entram por caminho relativo,
// e não por http://localhost:8765, porque a URL do gateway é decidida em build time:
// com host fixo embutido, o front só funciona no navegador da própria máquina — de
// qualquer outro dispositivo, ou por um túnel, "localhost" é o aparelho de quem acessa.
//
// Caminho relativo transfere essa decisão para o nginx, que faz proxy para o
// gateway-api dentro da rede do compose (ver nginx.conf). Um mesmo build serve
// localhost, o IP da LAN e a URL do túnel — e, por ser tudo a mesma origem, o CORS
// deixa de existir no caminho.
//
// `ng serve` continua usando environment.ts com localhost:8765.
export const environment = {
  // Esta imagem e a que vai para o ar, inclusive no dominio publico. Com
  // `false` aqui o Sentry marcava tudo como 'development' e mandava 100% das
  // transacoes — o dobro de ruido e de custo, e sem separar o que e erro de
  // usuario de verdade do que e teste local.
  production: true,
  sentryDsn:
    'https://34ad2b87d436031a9eda1006f626bc85@o4511548273917952.ingest.us.sentry.io/4511548277981185',
  googleClientId: '125662553556-q6agb67d8q0d253docbi55kk3ps6hc9b.apps.googleusercontent.com',
  // O client id do aplicativo do Discord (portal → Applications → OAuth2). É público:
  // viaja na URL de autorização. O segredo fica só no back. Vazio esconde o botão.
  discordClientId: '1539695838731837621',
  apis: {
    soulsGuide: '/souls-guide-api',
    auth: '/authorization-api',
    users: '/user-api',
    storage: '/storage-api',
  },
};
