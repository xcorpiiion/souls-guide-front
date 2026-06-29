export type QuestMapPhase = 'inicio' | 'meio' | 'fim' | 'full';

export const QUEST_MAP_PHASE_LABELS: Record<QuestMapPhase, string> = {
  inicio: 'início',
  meio: 'continua',
  fim: 'final',
  full: 'completa',
};

// ─── API shapes ──────────────────────────────────────────────────────────────

export interface MapEntryResponse {
  questId: number;
  questTitle: string;
  npcName: string;
  phase: QuestMapPhase;
  order: number;
}

export interface MapSectionResponse {
  id: number;
  name: string;
  order: number;
  entries: MapEntryResponse[];
}

export interface GameQuestMapResponse {
  gameId: number;
  sections: MapSectionResponse[];
}

export interface MapEntryRequest {
  questId: number;
  npcName: string;
  phase: QuestMapPhase;
  order: number;
}

export interface MapSectionRequest {
  id: number | null;
  name: string;
  order: number;
  entries: MapEntryRequest[];
}

export interface GameQuestMapRequest {
  sections: MapSectionRequest[];
}

// ─── Modelos internos do componente ─────────────────────────────────────────

export interface MapEntryLocal {
  questId: string;
  questTitle: string;
  npcName: string;
  phase: QuestMapPhase;
}

/** Agrupamento para exibição na seção: um NPC com suas quests */
export interface NpcGroup {
  npcName: string;
  entries: MapEntryLocal[];
}

export interface MapSectionLocal {
  /** number = id vindo do backend; string 'local-*' = seção nova ainda não salva */
  id: number | string;
  name: string;
  entries: MapEntryLocal[];
}

// ─── Conversões ──────────────────────────────────────────────────────────────

export function responseToLocal(response: GameQuestMapResponse): MapSectionLocal[] {
  return response.sections.map((s) => ({
    id: s.id,
    name: s.name,
    entries: s.entries.map((e) => ({
      questId: String(e.questId),
      questTitle: e.questTitle,
      npcName: e.npcName,
      phase: e.phase,
    })),
  }));
}

export function localToRequest(sections: MapSectionLocal[]): GameQuestMapRequest {
  return {
    sections: sections.map((s, si) => ({
      id: typeof s.id === 'number' ? s.id : null,
      name: s.name,
      order: si,
      entries: s.entries.map((e, ei) => ({
        questId: Number(e.questId),
        npcName: e.npcName,
        phase: e.phase,
        order: ei,
      })),
    })),
  };
}

/** Agrupa as entradas de uma seção por npcName para exibição */
export function groupByNpc(entries: MapEntryLocal[]): NpcGroup[] {
  const map = new Map<string, MapEntryLocal[]>();
  for (const e of entries) {
    const list = map.get(e.npcName) ?? [];
    list.push(e);
    map.set(e.npcName, list);
  }
  return Array.from(map.entries()).map(([npcName, npcEntries]) => ({
    npcName,
    entries: npcEntries,
  }));
}
