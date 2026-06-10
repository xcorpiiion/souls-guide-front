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
    path: 'profile',
    loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
  },
  {
    path: '**',
    redirectTo: 'home',
  },
];
