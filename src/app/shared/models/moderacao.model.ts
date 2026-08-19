import type { ContentKind, ReportReason } from '@xcorpiiion/canonico';

export type { ContentKind, ReportReason };

/**
 * Rótulo de cada motivo de denúncia.
 *
 * `SPOILER_SEM_AVISO` vem primeiro porque é o dano mais comum num site de guias — e o
 * único que estraga a experiência de quem só estava lendo.
 */
export const REPORT_REASON_LABEL: Record<ReportReason, string> = {
  SPOILER_SEM_AVISO: 'spoiler sem aviso',
  INFORMACAO_ERRADA: 'informação errada',
  SPAM: 'spam',
  OFENSIVO: 'ofensivo',
  PLAGIO: 'plágio',
  OUTRO: 'outro',
};

export const REPORT_REASON_ORDER: ReportReason[] = [
  'SPOILER_SEM_AVISO',
  'INFORMACAO_ERRADA',
  'PLAGIO',
  'OFENSIVO',
  'SPAM',
  'OUTRO',
];

/** Como o tipo de conteúdo aparece na fila e no link de volta. */
export const CONTENT_KIND_LABEL: Record<ContentKind, string> = {
  QUEST: 'quest',
  LORE: 'lore',
  ENDING: 'final',
  COMMENT: 'comentário',
};
