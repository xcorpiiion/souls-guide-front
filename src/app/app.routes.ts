import { Routes } from '@angular/router';
import { unsavedChangesGuard } from './core/guards/unsaved-changes.guard';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    path: 'games',
    loadComponent: () => import('./features/games/games').then((m) => m.Games),
  },
  {
    path: 'games/new',
    loadComponent: () => import('./features/game-create/game-create').then((m) => m.GameCreate),
    canActivate: [authGuard],
  },
  {
    path: 'games/:id',
    loadComponent: () => import('./features/game-detail/game-detail').then((m) => m.GameDetail),
  },
  {
    path: 'games/:id/conditions',
    loadComponent: () =>
      import('./features/quest-conditions/quest-conditions').then((m) => m.QuestConditions),
    canActivate: [authGuard],
  },
  {
    path: 'games/:id/quest-map',
    loadComponent: () =>
      import('./features/quest-map-organizer/quest-map-organizer').then((m) => m.QuestMapOrganizer),
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: 'games/:gameId/quests/new',
    loadComponent: () => import('./features/quest-editor/quest-editor').then((m) => m.QuestEditor),
    canActivate: [authGuard],
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: 'games/:gameId/quests/:questId/edit',
    loadComponent: () => import('./features/quest-editor/quest-editor').then((m) => m.QuestEditor),
    canActivate: [authGuard],
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: 'games/:gameId/quests/:questId',
    loadComponent: () => import('./features/quest-detail/quest-detail').then((m) => m.QuestDetail),
  },
  {
    path: 'games/:gameId/quests/:questId/history',
    loadComponent: () =>
      import('./features/quest-history/quest-history').then((m) => m.QuestHistory),
  },
  {
    path: 'quests',
    loadComponent: () => import('./features/quests/quests').then((m) => m.Quests),
  },
  {
    path: 'rotas',
    loadComponent: () => import('./features/rotas/rotas').then((m) => m.Rotas),
  },
  {
    path: 'lore',
    loadComponent: () => import('./features/lore/lore').then((m) => m.Lore),
  },
  {
    path: 'lore/new',
    loadComponent: () => import('./features/lore-create/lore-create').then((m) => m.LoreCreate),
    canActivate: [authGuard],
  },
  {
    path: 'lore/:id/edit',
    loadComponent: () => import('./features/lore-editor/lore-editor').then((m) => m.LoreEditor),
    canActivate: [authGuard],
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: 'lore/:id',
    loadComponent: () =>
      import('./features/lore/lore-detail/lore-detail').then((m) => m.LoreDetail),
  },
  {
    path: 'lore/:loreId/history',
    loadComponent: () => import('./features/lore-history/lore-history').then((m) => m.LoreHistory),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/forgot-password/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/reset-password/reset-password').then((m) => m.ResetPassword),
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
    canActivate: [authGuard],
  },
  {
    path: 'profile/quests/:questId',
    loadComponent: () => import('./features/quest-detail/quest-detail').then((m) => m.QuestDetail),
    canActivate: [authGuard],
  },
  {
    path: 'profile/quests/:questId/history',
    loadComponent: () =>
      import('./features/quest-history/quest-history').then((m) => m.QuestHistory),
    canActivate: [authGuard],
  },
  {
    path: 'profile/quests/:questId/edit',
    loadComponent: () => import('./features/quest-editor/quest-editor').then((m) => m.QuestEditor),
    canActivate: [authGuard],
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: 'profile/lore/:id/history',
    loadComponent: () => import('./features/lore-history/lore-history').then((m) => m.LoreHistory),
    canActivate: [authGuard],
  },
  {
    path: 'profile/lore/:id',
    loadComponent: () =>
      import('./features/lore/lore-detail/lore-detail').then((m) => m.LoreDetail),
    canActivate: [authGuard],
  },
  {
    path: 'profile/lore/:id/edit',
    loadComponent: () => import('./features/lore-editor/lore-editor').then((m) => m.LoreEditor),
    canActivate: [authGuard],
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: 'comunidade',
    loadComponent: () => import('./features/comunidade/comunidade').then((m) => m.Comunidade),
  },
  {
    path: 'usuarios/:handle',
    loadComponent: () => import('./features/usuario/usuario').then((m) => m.Usuario),
  },
  {
    path: 'usuarios/:handle/quests/:questId/history',
    loadComponent: () =>
      import('./features/quest-history/quest-history').then((m) => m.QuestHistory),
  },
  {
    path: 'usuarios/:handle/lore/:id/history',
    loadComponent: () => import('./features/lore-history/lore-history').then((m) => m.LoreHistory),
  },
  {
    path: 'usuarios/:handle/quests/:questId',
    loadComponent: () => import('./features/quest-detail/quest-detail').then((m) => m.QuestDetail),
  },
  {
    path: 'usuarios/:handle/lore/:id',
    loadComponent: () =>
      import('./features/lore/lore-detail/lore-detail').then((m) => m.LoreDetail),
  },
  {
    path: 'search',
    loadComponent: () => import('./features/search/search').then((m) => m.Search),
  },
  {
    path: '**',
    loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound),
  },
];
