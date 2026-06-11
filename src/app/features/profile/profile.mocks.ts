export interface ActivityItem {
  type: 'created' | 'updated' | 'followed';
  target: string;
  questId?: string;
  daysAgo: number;
}

export interface FavoriteGame {
  id: string;
  name: string;
  icon: string;
  questCount: number;
}

export interface UserProfile {
  id: string;
  name: string;
  handle: string;
  bio: string;
  joinedLabel: string;
  questCount: number;
  gameCount: number;
  followers: number;
  following: number;
  myQuestIds: string[];
  followedQuestIds: string[];
  favoriteGames: FavoriteGame[];
  activity: ActivityItem[];
}

export const MY_PROFILE: UserProfile = {
  id: 'u1',
  name: 'Vinicius Cruz',
  handle: 'vincruz',
  bio: 'Explorador de questlines e lore obscuro. Mains Elden Ring & Bloodborne.',
  joinedLabel: 'jan 2025',
  questCount: 14,
  gameCount: 3,
  followers: 87,
  following: 12,
  myQuestIds: ['er-q1', 'er-q2'],
  followedQuestIds: ['er-q3'],
  favoriteGames: [
    { id: 'elden-ring', name: 'Elden Ring', icon: 'ti-sword', questCount: 9 },
    { id: 'bloodborne', name: 'Bloodborne', icon: 'ti-moon', questCount: 3 },
    { id: 'dark-souls-3', name: 'Dark Souls III', icon: 'ti-flame', questCount: 2 },
  ],
  activity: [
    { type: 'created', target: 'Questline de Ranni, a Bruxa', questId: 'er-q1', daysAgo: 2 },
    { type: 'updated', target: 'Eileen the Crow', daysAgo: 5 },
    { type: 'followed', target: '@darksouls_wiki', daysAgo: 7 },
  ],
};
