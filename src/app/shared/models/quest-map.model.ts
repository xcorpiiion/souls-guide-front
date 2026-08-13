import type {
  GameQuestMapRequest as CanonicoGameQuestMapRequest,
  GameQuestMapResponse as CanonicoGameQuestMapResponse,
  MapEntryRequest as CanonicoMapEntryRequest,
  MapEntryResponse as CanonicoMapEntryResponse,
  MapSectionRequest as CanonicoMapSectionRequest,
  MapSectionResponse as CanonicoMapSectionResponse,
} from '@xcorpiiion/canonico';

/** Fases em minúsculo — é o que trafega no campo `phase` (string) do contrato. */
export type QuestMapPhase = 'inicio' | 'meio' | 'fim' | 'full';

export const QUEST_MAP_PHASE_LABELS: Record<QuestMapPhase, string> = {
  inicio: 'início',
  meio: 'continua',
  fim: 'final',
  full: 'completa',
};

// ─── API shapes — canonico com narrowing do phase ────────────────────────────

export interface MapEntryResponse extends Omit<CanonicoMapEntryResponse, 'phase'> {
  phase: QuestMapPhase;
}

export interface MapSectionResponse extends Omit<CanonicoMapSectionResponse, 'entries'> {
  entries: MapEntryResponse[];
}

export interface GameQuestMapResponse extends Omit<CanonicoGameQuestMapResponse, 'sections'> {
  sections: MapSectionResponse[];
}

export interface MapEntryRequest extends Omit<CanonicoMapEntryRequest, 'phase'> {
  phase: QuestMapPhase;
}

export interface MapSectionRequest extends Omit<CanonicoMapSectionRequest, 'entries'> {
  entries: MapEntryRequest[];
}

export interface GameQuestMapRequest extends Omit<CanonicoGameQuestMapRequest, 'sections'> {
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
      questTitle: e.questTitle ?? null,
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
