import type {
  EndingKind as CanonicoEndingKind,
  EndingStepKind as CanonicoEndingStepKind,
  EndingProgressResponse,
  EndingStepDTO,
  GameEndingDTO,
  GameEndingDetailDTO,
} from '@xcorpiiion/canonico';

// Enums do contrato — fonte da verdade: lib canonico
export type EndingKind = CanonicoEndingKind;
export type EndingStepKind = CanonicoEndingStepKind;

// Shapes retornados pela API
export type EndingApi = GameEndingDTO;
export type EndingDetailApi = GameEndingDetailDTO;
export type EndingStepApi = EndingStepDTO;
export type EndingProgressApi = EndingProgressResponse;

/** Rótulo em português de cada tipo de final, para o badge do card. */
export const ENDING_KIND_LABEL: Record<EndingKind, string> = {
  STANDARD: 'padrão',
  TRUE: 'verdadeiro',
  SECRET: 'secreto',
  JOKE: 'piada',
  BAD: 'ruim',
  DLC: 'dlc',
};

/**
 * Rótulo de cada tipo de passo. `AVOID` é o que diferencia um guia de final de uma
 * quest — não é tarefa que se conclui, é comportamento mantido a run inteira.
 */
export const ENDING_STEP_KIND_LABEL: Record<EndingStepKind, string> = {
  DO: 'fazer',
  AVOID: 'evitar',
  CHECK: 'conferir',
  CHOICE: 'escolha',
};

export interface EndingSummary {
  id: string;
  title: string;
  summary: string;
  kind: EndingKind;
  coverImageFileKey?: string;
  isMissable: boolean;
  requiresNewGamePlus: boolean;
  isSpoiler: boolean;
  gameId: string;
  gameName: string;
  authorId: string;
  likeCount: number;
  userHasLiked: boolean;
  followerCount: number;
  userIsFollowing: boolean;
  stepCount: number;
  completedStepCount: number;
  userHasAchieved: boolean;
}

export function endingApiToSummary(e: EndingApi): EndingSummary {
  return {
    id: String(e.id),
    title: e.title,
    summary: e.summary ?? '',
    kind: e.kind,
    coverImageFileKey: e.coverImageFileKey ?? undefined,
    isMissable: e.isMissable,
    requiresNewGamePlus: e.requiresNewGamePlus,
    isSpoiler: e.isSpoiler,
    gameId: String(e.gameId),
    gameName: e.gameName,
    authorId: e.userId,
    likeCount: e.likeCount,
    userHasLiked: e.userHasLiked,
    followerCount: e.followerCount,
    userIsFollowing: e.userIsFollowing,
    stepCount: e.stepCount,
    completedStepCount: e.completedStepCount,
    userHasAchieved: e.userHasAchieved,
  };
}

/**
 * Os passos agrupados pela seção do jogo, preservando a ordem do guia. É assim que a
 * tela lê: "a run inteira" primeiro, depois cada parte. Passo sem seção cai num grupo sem
 * título, em vez de sumir — e passo `AVOID` é exatamente esse caso, porque comportamento
 * mantido a run inteira não pertence a parte nenhuma do jogo.
 *
 * A seção vem de `step.section` desde a ADR 0020 do back-end: era texto livre, e duas
 * grafias da mesma parte abriam dois blocos no mesmo guia.
 */
export interface EndingChapter {
  title: string;
  steps: EndingStepApi[];
}

/**
 * Agrupa apenas o que está **em sequência**, e não todo passo com o mesmo nome.
 *
 * É diferente do agrupamento da lista de chefes de propósito: aqui a ordem é o guia, e
 * voltar a uma parte do jogo mais adiante é normal. Fundir os dois trechos moveria um
 * passo para antes de outro que precisa vir primeiro.
 */
export function groupStepsByChapter(steps: EndingStepApi[]): EndingChapter[] {
  const chapters: EndingChapter[] = [];
  for (const step of steps) {
    const title = step.section?.name?.trim() || '';
    const last = chapters[chapters.length - 1];
    if (last && last.title === title) {
      last.steps.push(step);
    } else {
      chapters.push({ title, steps: [step] });
    }
  }
  return chapters;
}
