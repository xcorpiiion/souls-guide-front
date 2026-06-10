import { QuestDetailData } from '../../shared/models/quest.model';

export const QUESTS_DETAIL: QuestDetailData[] = [
  {
    id: 'er-q1',
    title: 'Questline de Ranni, a Bruxa',
    gameId: 'elden-ring',
    gameName: 'Elden Ring',
    stepCount: 7,
    forkCount: 1,
    endingCount: 2,
    status: 'CANONICO',
    followers: 4800,
    author: null,
    description:
      'Questline da semideusa Ranni, cujo objetivo é executar o Plano da Lua — libertar os Sem Graça do controle dos Grandes Seres.',
    nodes: [
      {
        id: 'n0',
        type: 'start',
        label: 'início',
      },
      {
        id: 'n1',
        type: 'task',
        label: 'Encontrar Ranni',
        sublabel: 'Torre de Ranni',
        description:
          'Vá até a Torre de Ranni no castelo de Caria e suba até o topo para encontrá-la. Ela só aparece à meia-noite.',
        location: 'Caria, Liurnia',
        tags: ['NPC', 'Torre de Ranni', 'noite'],
      },
      {
        id: 'n2',
        type: 'gateway',
        label: 'X',
      },
      {
        id: 'n3',
        type: 'task',
        label: 'Derrotar Loretta',
        sublabel: 'Catacomba',
        description:
          'Limpe a Catacomba de Ranni e derrote o Cavaleiro Fantasma Loretta para obter o espírito de Ranni.',
        location: 'Catacomba de Ranni',
        tags: ['boss', 'obrigatório'],
      },
      {
        id: 'n4',
        type: 'external-quest',
        label: 'Quest Blaidd',
        sublabel: 'Nó 3',
        description:
          'Antes de prosseguir, é necessário ter liberado Blaidd da Sellia. Esse ponto cruza com a questline dele.',
        linkedQuestId: 'blaidd',
        linkedQuestName: 'Questline do Blaidd',
        linkedNodeLabel: 'Nó 3 — Liberar da Sellia',
      },
      {
        id: 'n5',
        type: 'task',
        label: 'Entregar Espada',
        sublabel: 'Torre de Ranni',
        description:
          'Entregue a Espada Noctívaga para Ranni. Ambos os caminhos (via Loretta ou via Blaidd) convergem aqui.',
        location: 'Torre de Ranni',
        tags: ['item', 'Espada Noctívaga'],
      },
      {
        id: 'n6',
        type: 'end',
        label: 'Final A',
        sublabel: 'Ordem da Lua',
        description:
          'Ranni estabelece a Ordem da Lua — um mundo sem a influência dos Grandes Seres.',
        endingType: 'positive',
      },
    ],
    edges: [
      { id: 'e0', from: 'n0', to: 'n1' },
      { id: 'e1', from: 'n1', to: 'n2' },
      { id: 'e2', from: 'n2', to: 'n3', label: 'via Loretta' },
      { id: 'e3', from: 'n2', to: 'n4', label: 'via Blaidd' },
      { id: 'e4', from: 'n3', to: 'n5' },
      { id: 'e5', from: 'n4', to: 'n5' },
      { id: 'e6', from: 'n5', to: 'n6' },
    ],
    relatedQuests: [
      {
        questId: 'blaidd',
        questTitle: 'Questline do Blaidd',
        npcInitials: 'BL',
        crossingNodeLabel: 'Quest Blaidd — Nó 3',
      },
      {
        questId: 'iji',
        questTitle: 'Questline do Iji',
        npcInitials: 'IJ',
        crossingNodeLabel: 'Entregar Espada',
      },
    ],
  },
];
