export interface Game {
  id: string;
  name: string;
  shortName: string;
}

export interface GameSummary extends Game {
  accentClass: string;
  questCount: number;
  loreCount: number;
  followersCount: number;
  contributorsCount: number;
  topQuestTitle: string | null;
  topQuestSteps: number | null;
  topQuestFollowers: number | null;
  lastActivityLabel: string;
}
