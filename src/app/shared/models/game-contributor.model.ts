import type { ContributorRole, ContributorSort, GameContributorDTO } from '@xcorpiiion/canonico';

export type { ContributorRole, ContributorSort };

// Shape da API — fonte da verdade: lib canonico (gerada dos DTOs Java do back-end)
export type ContributorApi = GameContributorDTO;

/** Shape usado na aba de contribuidores da página do jogo. */
export interface Contributor {
  userId: string;
  /** O que vai na URL de `/usuarios/:handle`. */
  handle: string;
  /** O nome de exibição, que cai no apelido quando a user-api não sabe o nome. */
  displayName: string;
  initials: string;
  quests: number;
  lore: number;
  edits: number;
  contributions: number;
  /** "jan/2024" — mês e ano da primeira contribuição neste jogo. */
  since: string;
  role: ContributorRole;
  roleLabel: string;
  /**
   * Se o crachá aparece na linha da lista.
   *
   * Autor é a maioria das pessoas, e um crachá que todo mundo tem não distingue
   * ninguém — só polui a lista. Fundador e editor são os dois casos que dizem alguma
   * coisa ao passar o olho.
   */
  hasBadge: boolean;
}

export const CONTRIBUTOR_ROLE_LABEL: Record<ContributorRole, string> = {
  FOUNDER: 'fundador',
  AUTHOR: 'autor',
  EDITOR: 'editor',
};

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/**
 * As iniciais do avatar.
 *
 * Duas letras do apelido, e não a primeira letra de cada palavra: apelido é uma palavra
 * só na maioria dos casos, e "V" sozinho num círculo não diferencia ninguém.
 */
export function iniciaisDe(nome: string): string {
  return nome.trim().slice(0, 2).toUpperCase();
}

export function mesEAno(iso: string | null | undefined): string {
  if (!iso) return '—';
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '—';
  return `${MESES[data.getMonth()]}/${data.getFullYear()}`;
}

export function contributorApiToView(c: ContributorApi): Contributor {
  const displayName = c.name?.trim() || c.handle;
  return {
    userId: c.userId,
    handle: c.handle,
    displayName,
    initials: iniciaisDe(displayName),
    quests: c.quests,
    lore: c.lore,
    edits: c.edits,
    contributions: c.contributions,
    since: mesEAno(c.since),
    role: c.role,
    roleLabel: CONTRIBUTOR_ROLE_LABEL[c.role],
    hasBadge: c.role !== 'AUTHOR',
  };
}
