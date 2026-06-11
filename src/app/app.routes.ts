import { Routes } from '@angular/router';

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
    path: 'games/:id',
    loadComponent: () => import('./features/game-detail/game-detail').then((m) => m.GameDetail),
  },
  {
    path: 'games/:gameId/quests/new',
    loadComponent: () => import('./features/quest-editor/quest-editor').then((m) => m.QuestEditor),
  },
  {
    path: 'games/:gameId/quests/:questId/edit',
    loadComponent: () => import('./features/quest-editor/quest-editor').then((m) => m.QuestEditor),
  },
  {
    path: 'games/:gameId/quests/:questId',
    loadComponent: () => import('./features/quest-detail/quest-detail').then((m) => m.QuestDetail),
  },
  {
    path: 'quests',
    loadComponent: () => import('./features/quests/quests').then((m) => m.Quests),
  },
  {
    path: 'lore',
    loadComponent: () => import('./features/lore/lore').then((m) => m.Lore),
  },
  {
    path: 'lore/:id',
    loadComponent: () =>
      import('./features/lore/lore-detail/lore-detail').then((m) => m.LoreDetail),
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
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
