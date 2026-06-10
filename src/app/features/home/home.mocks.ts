import { Game } from '../../shared/models/game.model';
import { LoreSummary } from '../../shared/models/lore-article.model';
import { QuestSummary } from '../../shared/models/quest.model';

export const GAMES: Game[] = [
  { id: 'elden-ring',         name: 'Elden Ring',           shortName: 'ER'   },
  { id: 'dark-souls-3',       name: 'Dark Souls III',       shortName: 'DS3'  },
  { id: 'bloodborne',         name: 'Bloodborne',           shortName: 'BB'   },
  { id: 'lies-of-p',          name: 'Lies of P',            shortName: 'LoP'  },
  { id: 'lords-of-the-fallen',name: 'Lords of the Fallen',  shortName: 'LotF' },
];

export const QUESTS: QuestSummary[] = [
  { id: 'q1', title: 'Quest da Ranni',         gameId: 'elden-ring',   gameName: 'Elden Ring',     stepCount: 24, followers: 312 },
  { id: 'q2', title: 'Quest do Blaidd',        gameId: 'elden-ring',   gameName: 'Elden Ring',     stepCount: 12, followers: 180 },
  { id: 'q3', title: 'Quest de Millicent',     gameId: 'elden-ring',   gameName: 'Elden Ring',     stepCount: 10, followers: 140 },
  { id: 'q4', title: 'Siegward de Catarina',   gameId: 'dark-souls-3', gameName: 'Dark Souls III', stepCount: 8,  followers: 97  },
  { id: 'q5', title: 'Aldrich e Gwyndolin',    gameId: 'dark-souls-3', gameName: 'Dark Souls III', stepCount: 5,  followers: 88  },
  { id: 'q6', title: 'A Boneca de Yharnam',    gameId: 'bloodborne',   gameName: 'Bloodborne',     stepCount: 6,  followers: 76  },
  { id: 'q7', title: 'Eileen, a Corvina',      gameId: 'bloodborne',   gameName: 'Bloodborne',     stepCount: 9,  followers: 64  },
  { id: 'q8', title: 'Sofia e o Coração',      gameId: 'lies-of-p',    gameName: 'Lies of P',      stepCount: 7,  followers: 51  },
];

export const LORE: LoreSummary[] = [
  { id: 'l1', title: 'A natureza da Lua Dourada',       gameId: 'elden-ring',   gameName: 'Elden Ring',     status: 'CANONICO',    votes: 847 },
  { id: 'l2', title: 'O ciclo dos sonhos e Mergo',      gameId: 'bloodborne',   gameName: 'Bloodborne',     status: 'CONSOLIDADO', votes: 412 },
  { id: 'l3', title: 'Marika e Radagon são a mesma',    gameId: 'elden-ring',   gameName: 'Elden Ring',     status: 'CONSOLIDADO', votes: 389 },
  { id: 'l4', title: 'Ranni é a vilã real',             gameId: 'elden-ring',   gameName: 'Elden Ring',     status: 'TEORIA',      votes: 203 },
  { id: 'l5', title: 'Gwyn sabia do Oco desde o início',gameId: 'dark-souls-3', gameName: 'Dark Souls III', status: 'TEORIA',      votes: 99  },
  { id: 'l6', title: 'A Grande Ameaça não é Mergo',     gameId: 'bloodborne',   gameName: 'Bloodborne',     status: 'CONSOLIDADO', votes: 318 },
];
