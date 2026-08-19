import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Quem o servidor renderiza, e quem ele entrega para o navegador montar.
 *
 * A regra é o público: página que um buscador ou um preview de link precisa ler sai
 * pronta do servidor; página que só existe depois do login não sai — renderizá-la
 * custaria uma requisição de dado que o servidor não tem sessão para buscar, e o
 * resultado seria a versão deslogada da tela, jogada fora na hidratação.
 *
 * Não é `Prerender` (o padrão do schematic): o conteúdo nasce dos usuários, então a
 * lista de quests não existe em tempo de build. Prerender congelaria o site no que havia
 * no dia da imagem, e quest nova só apareceria no build seguinte.
 */
export const serverRoutes: ServerRoute[] = [
  // Sem sessão não há o que renderizar aqui.
  { path: 'login', renderMode: RenderMode.Client },
  { path: 'forgot-password', renderMode: RenderMode.Client },
  { path: 'reset-password', renderMode: RenderMode.Client },
  { path: 'profile', renderMode: RenderMode.Client },
  { path: 'profile/**', renderMode: RenderMode.Client },

  // Busca é URL infinita e já está fora do índice pelo robots.txt.
  { path: 'search', renderMode: RenderMode.Client },

  // Editores: dependem de API do navegador e de conteúdo que não é público.
  { path: 'games/new', renderMode: RenderMode.Client },
  { path: 'games/:id/run', renderMode: RenderMode.Client },
  { path: 'games/:id/conditions', renderMode: RenderMode.Client },
  { path: 'games/:id/quest-map', renderMode: RenderMode.Client },
  { path: 'games/:gameId/quests/new', renderMode: RenderMode.Client },
  { path: 'games/:gameId/quests/:questId/edit', renderMode: RenderMode.Client },
  { path: 'lore/new', renderMode: RenderMode.Client },
  { path: 'lore/:id/edit', renderMode: RenderMode.Client },

  // O resto é conteúdo: jogo, quest, lore, final, perfil público, listagens.
  { path: '**', renderMode: RenderMode.Server },
];
