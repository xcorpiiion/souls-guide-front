import type {
  LoreArticleDTO,
  LoreStatus as CanonicoLoreStatus,
  LoreType,
} from '@xcorpiiion/canonico';
import { refDe } from '../utils/ref';
import { ResumoDaLore, resumoDaLore } from '../utils/resumo-da-lore';

// Enums do contrato — fonte da verdade: lib canonico
export type LoreStatus = CanonicoLoreStatus;
/**
 * O tipo como vai para a API. A tela não pergunta mais "do mundo ou de personagem" (ADR 0011):
 * quem a lore cita sai das citações, e o servidor recebe `WORLD`.
 */
export type LoreTypeApi = LoreType;

// Shape retornado pela API — LoreArticleDTO do canonico
export type LoreApi = LoreArticleDTO;

export interface LoreSummary {
  /** O que vai na URL. Ver shared/utils/ref.ts. */
  ref: string;
  id: string;
  title: string;
  gameId: string;
  gameName: string;
  status: LoreStatus;
  excerpt: string;
  /** Parágrafo, primeira citação e quantas citações, lidos do markdown. Ausente em mock antigo. */
  resumo?: ResumoDaLore;
  /** Id de quem escreveu, para dizer "sua" sem mostrar o id cru na tela. */
  userId?: string;
  votes: number;
  author: string;
  readMinutes: number;
  tags: string[];
  // campos de conteúdo de perfil
  isPersonal?: boolean;
  ownerId?: string;
  ownerNickname?: string;
  isPublic?: boolean;
  allowCopy?: boolean;
  likeCount?: number;
  userHasLiked?: boolean;
  followerCount?: number;
  userIsFollowing?: boolean;
}

export function loreApiToSummary(l: LoreApi): LoreSummary {
  const resumo = resumoDaLore(l.content);
  return {
    resumo,
    userId: l.userId ?? undefined,
    id: String(l.id),
    ref: refDe(l.id, l.slug),
    title: l.title,
    gameId: String(l.gameId),
    gameName: l.gameName,
    status: l.status,
    // O markdown cru saía na listagem com "> " e a linha de origem da citação no meio.
    excerpt: resumo.paragrafo || resumo.citacao?.trecho || '',
    votes: l.likeCount ?? 0,
    author: l.userId ?? '—',
    readMinutes: Math.max(1, Math.ceil(l.content.split(' ').length / 200)),
    tags: l.tags?.length ? l.tags : l.items.map((i) => i.name),
    isPersonal: l.isPersonal ?? false,
    ownerId: l.ownerId ?? undefined,
    isPublic: l.isPublic ?? true,
    allowCopy: l.allowCopy ?? false,
    likeCount: l.likeCount ?? 0,
    userHasLiked: l.userHasLiked ?? false,
    followerCount: l.followerCount ?? 0,
    userIsFollowing: l.userIsFollowing ?? false,
  };
}
