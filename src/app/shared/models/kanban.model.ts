export type CardPriority = 'normal' | 'urgent' | 'blocking';

export interface KanbanChecklist {
  id: string;
  label: string;
  done: boolean;
}

export interface KanbanRef {
  type: 'quest' | 'card';
  label: string;
  targetId: string;
  targetName: string;
}

export interface KanbanCard {
  id: string;
  columnId: string;
  title: string;
  tags: string[];
  priority: CardPriority;
  notes: string;
  checklist: KanbanChecklist[];
  refs: KanbanRef[];
  position: number;
  done: boolean;
}

export interface KanbanColumn {
  id: string;
  boardId: string;
  title: string;
  color: 'todo' | 'doing' | 'done' | 'stuck' | 'custom';
  position: number;
  cards: KanbanCard[];
}

export interface KanbanBoard {
  id: string;
  userId: string;
  gameId: string;
  gameName: string;
  characterName: string;
  createdAt: string;
  columns: KanbanColumn[];
}
