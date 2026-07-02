export type QuestMapPhase = 'inicio' | 'meio' | 'fim' | 'full';

export const QUEST_MAP_PHASE_LABELS: Record<QuestMapPhase, string> = {
  inicio: 'início',
  meio: 'continua',
  fim: 'final',
  full: 'completa',
};

// ─── API shapes ──────────────────────────────────────────────────────────────

export interface MapEntryResponse {
  questId: number | null;
  questTitle: string | null;
  nodeId: number | null;
  nodeTitle: string | null;
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
  nodeId: number | null;
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
  /** null quando a quest referenciada foi deletada no backend */
  questId: string | null;
  questTitle: string | null;
  nodeId: string | null;
  nodeTitle: string | null;
  phase: QuestMapPhase;
}

/** Agrupamento para exibição na seção: uma questline com suas entradas */
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
      questId: e.questId != null ? String(e.questId) : null,
      questTitle: e.questTitle,
      nodeId: e.nodeId != null ? String(e.nodeId) : null,
      nodeTitle: e.nodeTitle ?? null,
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
      entries: s.entries
        .filter((e) => e.questId !== null)
        .map((e, ei) => ({
          questId: Number(e.questId),
          nodeId: e.nodeId != null ? Number(e.nodeId) : null,
          phase: e.phase,
          order: ei,
        })),
    })),
  };
}

/** Agrupa as entradas de uma seção por questTitle para exibição */
export function groupByNpc(entries: MapEntryLocal[]): NpcGroup[] {
  const map = new Map<string, MapEntryLocal[]>();
  for (const e of entries) {
    const key = e.questTitle ?? '';
    const list = map.get(key) ?? [];
    list.push(e);
    map.set(key, list);
  }
  return Array.from(map.entries()).map(([npcName, npcEntries]) => ({
    npcName,
    entries: npcEntries,
  }));
}
