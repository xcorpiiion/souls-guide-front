import { Routes } from '@angular/router';
import type { SeoPagina } from './core/services/seo.service';
import { unsavedChangesGuard } from '@xcorpiiion/ng-core';
import { authGuard } from '@xcorpiiion/ng-core';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    data: {
      seo: {
        titulo: '',
        descricao:
          'Guias colaborativos de souls-like: quests passo a passo, finais, lore e o progresso da sua run em um lugar só.',
      } satisfies SeoPagina,
    },
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    path: 'games',
    data: {
      seo: {
        titulo: 'Jogos',
        descricao:
          'Todos os souls-like com guia no SoulGuide: Elden Ring, Dark Souls III, Bloodborne, Lies of P e Lords of the Fallen.',
      } satisfies SeoPagina,
    },
    loadComponent: () => import('./features/games/games').then((m) => m.Games),
  },
  {
    path: 'games/new',
    data: {
      seo: {
        titulo: 'Novo jogo',
        descricao: 'Cadastrar um jogo no SoulGuide.',
        indexavel: false,
      } satisfies SeoPagina,
    },
    loadComponent: () => import('./features/game-create/game-create').then((m) => m.GameCreate),
    canActivate: [authGuard],
  },
  {
    path: 'games/:id',
    data: {
      seo: {
        titulo: 'Jogo',
        descricao: 'Guias de quest, finais e lore escritos pela comunidade.',
      } satisfies SeoPagina,
    },
    loadComponent: () => import('./features/game-detail/game-detail').then((m) => m.GameDetail),
  },
  {
    path: 'games/:id/itens',
    data: {
      seo: {
        titulo: 'Itens',
        descricao: 'Armas, talismãs, consumíveis e chaves, com o lugar de cada um.',
      } satisfies SeoPagina,
    },
    loadComponent: () => import('./features/itens/itens').then((m) => m.Itens),
  },
  {
    path: 'itens/:id',
    data: {
      seo: {
        titulo: 'Item',
        descricao: 'Onde encontrar este item, e em que passo do guia ele aparece.',
      } satisfies SeoPagina,
    },
    loadComponent: () => import('./features/item-detail/item-detail').then((m) => m.ItemDetail),
  },
  {
    path: 'games/:id/chefes',
    data: {
      seo: {
        titulo: 'Chefes',
        descricao:
          'Todos os chefes na ordem recomendada, com o que é obrigatório e o que é opcional.',
      } satisfies SeoPagina,
    },
    loadComponent: () => import('./features/chefes/chefes').then((m) => m.Chefes),
  },
  {
    path: 'chefes/:id',
    data: {
      seo: {
        titulo: 'Chefe',
        descricao: 'Onde fica, o que funciona, o que não funciona e o que ele dropa.',
      } satisfies SeoPagina,
    },
    loadComponent: () => import('./features/boss-detail/boss-detail').then((m) => m.BossDetail),
  },
  {
    path: 'games/:id/run',
    data: {
      seo: {
        titulo: 'Minha run',
        descricao: 'Seu progresso, seus finais e os avisos que valem agora.',
        indexavel: false,
      } satisfies SeoPagina,
    },
    loadComponent: () => import('./features/run-panel/run-panel').then((m) => m.RunPanel),
    canActivate: [authGuard],
  },
  {
    path: 'games/:id/conditions',
    data: {
      seo: {
        titulo: 'Condições entre quests',
        descricao: 'Quais quests bloqueiam ou liberam outras.',
        indexavel: false,
      } satisfies SeoPagina,
    },
    loadComponent: () =>
      import('./features/quest-conditions/quest-conditions').then((m) => m.QuestConditions),
    canActivate: [authGuard],
  },
  {
    path: 'games/:id/quest-map',
    data: {
      seo: {
        titulo: 'Mapa de quests',
        descricao: 'Organização visual das quests do jogo.',
        indexavel: false,
      } satisfies SeoPagina,
    },
    loadComponent: () =>
      import('./features/quest-map-organizer/quest-map-organizer').then((m) => m.QuestMapOrganizer),
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: 'login',
    data: {
      seo: {
        titulo: 'Entrar',
        descricao: 'Acesse sua conta do SoulGuide.',
        indexavel: false,
      } satisfies SeoPagina,
    },
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: 'games/:gameId/finais/:endingId',
    data: {
      seo: {
        titulo: 'Final',
        descricao: 'Passo a passo para alcançar este final.',
      } satisfies SeoPagina,
    },
    loadComponent: () =>
      import('./features/ending-detail/ending-detail').then((m) => m.EndingDetail),
  },
  {
    path: 'games/:gameId/quests/new',
    data: {
      seo: {
        titulo: 'Nova quest',
        descricao: 'Escrever um guia de quest.',
        indexavel: false,
      } satisfies SeoPagina,
    },
    loadComponent: () => import('./features/quest-editor/quest-editor').then((m) => m.QuestEditor),
    canActivate: [authGuard],
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: 'games/:gameId/quests/:questId/edit',
    data: {
      seo: {
        titulo: 'Editar quest',
        descricao: 'Edição do guia.',
        indexavel: false,
      } satisfies SeoPagina,
    },
    loadComponent: () => import('./features/quest-editor/quest-editor').then((m) => m.QuestEditor),
    canActivate: [authGuard],
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: 'games/:gameId/quests/:questId',
    data: {
      seo: {
        titulo: 'Quest',
        descricao: 'Guia passo a passo, com bifurcações e finais.',
      } satisfies SeoPagina,
    },
    loadComponent: () => import('./features/quest-detail/quest-detail').then((m) => m.QuestDetail),
  },
  {
    path: 'games/:gameId/quests/:questId/history',
    data: {
      seo: {
        titulo: 'Histórico da quest',
        descricao: 'Versões anteriores deste guia.',
        indexavel: false,
      } satisfies SeoPagina,
    },
    loadComponent: () =>
      import('./features/quest-history/quest-history').then((m) => m.QuestHistory),
  },
  {
    path: 'quests',
    data: {
      seo: {
        titulo: 'Quests',
        descricao:
          'Todos os guias de quest do SoulGuide, por jogo, com passos, bifurcações e finais.',
      } satisfies SeoPagina,
    },
    loadComponent: () => import('./features/quests/quests').then((m) => m.Quests),
  },
  {
    path: 'rotas',
    data: {
      seo: {
        titulo: 'Rotas',
        descricao: 'Os jogos com mais guias e mais contribuidores da comunidade.',
      } satisfies SeoPagina,
    },
    loadComponent: () => import('./features/rotas/rotas').then((m) => m.Rotas),
  },
  {
    path: 'lore',
    data: {
      seo: {
        titulo: 'Lore',
        descricao:
          'Artigos de lore dos souls-like: mundo, personagens, teorias e o que é canônico.',
      } satisfies SeoPagina,
    },
    loadComponent: () => import('./features/lore/lore').then((m) => m.Lore),
  },
  {
    path: 'lore/new',
    data: {
      seo: {
        titulo: 'Novo artigo',
        descricao: 'Escrever um artigo de lore.',
        indexavel: false,
      } satisfies SeoPagina,
    },
    loadComponent: () => import('./features/lore-create/lore-create').then((m) => m.LoreCreate),
    canActivate: [authGuard],
  },
  {
    path: 'lore/:id/edit',
    data: {
      seo: {
        titulo: 'Editar artigo',
        descricao: 'Edição do artigo.',
        indexavel: false,
      } satisfies SeoPagina,
    },
    loadComponent: () => import('./features/lore-editor/lore-editor').then((m) => m.LoreEditor),
    canActivate: [authGuard],
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: 'lore/:id',
    data: {
      seo: {
        titulo: 'Artigo de lore',
        descricao: 'Lore escrita e revisada pela comunidade.',
      } satisfies SeoPagina,
    },
    loadComponent: () =>
      import('./features/lore/lore-detail/lore-detail').then((m) => m.LoreDetail),
  },
  {
    path: 'lore/:loreId/history',
    data: {
      seo: {
        titulo: 'Histórico do artigo',
        descricao: 'Versões anteriores deste artigo.',
        indexavel: false,
      } satisfies SeoPagina,
    },
    loadComponent: () => import('./features/lore-history/lore-history').then((m) => m.LoreHistory),
  },
  {
    path: 'forgot-password',
    data: {
      seo: {
        titulo: 'Recuperar senha',
        descricao: 'Receba um link para redefinir sua senha.',
        indexavel: false,
      } satisfies SeoPagina,
    },
    loadComponent: () =>
      import('./features/forgot-password/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    path: 'reset-password',
    data: {
      seo: {
        titulo: 'Nova senha',
        descricao: 'Defina uma senha nova.',
        indexavel: false,
      } satisfies SeoPagina,
    },
    loadComponent: () =>
      import('./features/reset-password/reset-password').then((m) => m.ResetPassword),
  },
  {
    path: 'profile',
    data: {
      seo: {
        titulo: 'Meu perfil',
        descricao: 'Seu conteúdo, seu progresso e o que você segue.',
        indexavel: false,
      } satisfies SeoPagina,
    },
    loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
    canActivate: [authGuard],
  },
  {
    path: 'profile/quests/:questId',
    data: {
      seo: {
        titulo: 'Minha quest',
        descricao: 'Guia do seu perfil.',
        indexavel: false,
      } satisfies SeoPagina,
    },
    loadComponent: () => import('./features/quest-detail/quest-detail').then((m) => m.QuestDetail),
    canActivate: [authGuard],
  },
  {
    path: 'profile/quests/:questId/history',
    data: {
      seo: {
        titulo: 'Histórico',
        descricao: 'Versões anteriores.',
        indexavel: false,
      } satisfies SeoPagina,
    },
    loadComponent: () =>
      import('./features/quest-history/quest-history').then((m) => m.QuestHistory),
    canActivate: [authGuard],
  },
  {
    path: 'profile/quests/:questId/edit',
    data: {
      seo: { titulo: 'Editar', descricao: 'Edição do guia.', indexavel: false } satisfies SeoPagina,
    },
    loadComponent: () => import('./features/quest-editor/quest-editor').then((m) => m.QuestEditor),
    canActivate: [authGuard],
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: 'profile/lore/:id/history',
    data: {
      seo: {
        titulo: 'Histórico',
        descricao: 'Versões anteriores.',
        indexavel: false,
      } satisfies SeoPagina,
    },
    loadComponent: () => import('./features/lore-history/lore-history').then((m) => m.LoreHistory),
    canActivate: [authGuard],
  },
  {
    path: 'profile/lore/:id',
    data: {
      seo: {
        titulo: 'Meu artigo',
        descricao: 'Artigo do seu perfil.',
        indexavel: false,
      } satisfies SeoPagina,
    },
    loadComponent: () =>
      import('./features/lore/lore-detail/lore-detail').then((m) => m.LoreDetail),
    canActivate: [authGuard],
  },
  {
    path: 'profile/lore/:id/edit',
    data: {
      seo: {
        titulo: 'Editar',
        descricao: 'Edição do artigo.',
        indexavel: false,
      } satisfies SeoPagina,
    },
    loadComponent: () => import('./features/lore-editor/lore-editor').then((m) => m.LoreEditor),
    canActivate: [authGuard],
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: 'admin/moderacao',
    data: {
      seo: {
        titulo: 'Moderação',
        descricao: 'Fila de denúncias do SoulGuide.',
        indexavel: false,
      } satisfies SeoPagina,
    },
    loadComponent: () => import('./features/moderacao/moderacao').then((m) => m.Moderacao),
    canActivate: [adminGuard],
  },
  {
    path: 'comunidade',
    data: {
      seo: {
        titulo: 'Comunidade',
        descricao:
          'Quem escreve no SoulGuide: contribuidores, atividade recente e o conteúdo mais seguido.',
      } satisfies SeoPagina,
    },
    loadComponent: () => import('./features/comunidade/comunidade').then((m) => m.Comunidade),
  },
  {
    path: 'usuarios/:handle',
    data: {
      seo: {
        titulo: 'Perfil',
        descricao: 'Guias e artigos publicados por este contribuidor.',
      } satisfies SeoPagina,
    },
    loadComponent: () => import('./features/usuario/usuario').then((m) => m.Usuario),
  },
  {
    path: 'usuarios/:handle/quests/:questId/history',
    data: {
      seo: {
        titulo: 'Histórico',
        descricao: 'Versões anteriores.',
        indexavel: false,
      } satisfies SeoPagina,
    },
    loadComponent: () =>
      import('./features/quest-history/quest-history').then((m) => m.QuestHistory),
  },
  {
    path: 'usuarios/:handle/lore/:id/history',
    data: {
      seo: {
        titulo: 'Histórico',
        descricao: 'Versões anteriores.',
        indexavel: false,
      } satisfies SeoPagina,
    },
    loadComponent: () => import('./features/lore-history/lore-history').then((m) => m.LoreHistory),
  },
  {
    path: 'usuarios/:handle/quests/:questId',
    data: {
      seo: {
        titulo: 'Quest',
        descricao: 'Guia publicado por um contribuidor.',
      } satisfies SeoPagina,
    },
    loadComponent: () => import('./features/quest-detail/quest-detail').then((m) => m.QuestDetail),
  },
  {
    path: 'usuarios/:handle/lore/:id',
    data: {
      seo: {
        titulo: 'Artigo de lore',
        descricao: 'Artigo publicado por um contribuidor.',
      } satisfies SeoPagina,
    },
    loadComponent: () =>
      import('./features/lore/lore-detail/lore-detail').then((m) => m.LoreDetail),
  },
  {
    path: 'search',
    data: {
      seo: {
        titulo: 'Busca',
        descricao: 'Resultados da busca no SoulGuide.',
        indexavel: false,
      } satisfies SeoPagina,
    },
    loadComponent: () => import('./features/search/search').then((m) => m.Search),
  },
  {
    path: '**',
    data: {
      seo: {
        titulo: 'Página não encontrada',
        descricao: 'Esta página não existe ou foi movida.',
        indexavel: false,
      } satisfies SeoPagina,
    },
    loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound),
  },
];
