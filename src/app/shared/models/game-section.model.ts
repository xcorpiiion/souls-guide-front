import type {
  GameGenre,
  GameSectionDTO,
  GameSectionRefDTO,
  GameSectionRequest,
} from '@xcorpiiion/canonico';

// Shapes da API — fonte da verdade: lib canonico
export type GameSection = GameSectionDTO;
export type GameSectionRef = GameSectionRefDTO;
export type GameSectionPayload = GameSectionRequest;

/**
 * Como cada família chama a subdivisão do jogo.
 *
 * O back-end tem **uma** entidade para as duas (ADR 0020 do souls-guide-api): a estrutura
 * é idêntica — parte ordenada do jogo, que ancora chefe, item e passo de final — e o que
 * muda é só a palavra. Duas entidades duplicariam CRUD, assembler e coluna em cada
 * conteúdo para trocar um substantivo.
 *
 * É por isso que a tradução mora aqui, e não numa coluna: rótulo é decisão de tela, e
 * mandá-lo na resposta o repetiria em cada linha da lista.
 */
const SECTION_LABEL: Record<GameGenre, { singular: string; plural: string }> = {
  SOULS_LIKE: { singular: 'região', plural: 'regiões' },
  SURVIVAL_HORROR: { singular: 'capítulo', plural: 'capítulos' },
  ACTION_HORROR: { singular: 'capítulo', plural: 'capítulos' },
  PSYCHOLOGICAL_HORROR: { singular: 'capítulo', plural: 'capítulos' },
  OTHER: { singular: 'seção', plural: 'seções' },
};

/**
 * O rótulo da seção para um jogo.
 *
 * Aceita gênero ausente porque jogo recém-cadastrado cai em `OTHER` no back-end, mas a
 * tela pode montar antes de o jogo carregar — e nesse instante 'seção' é o certo, não um
 * chute na família mais comum.
 */
export function sectionLabel(genre: GameGenre | null | undefined): string {
  return SECTION_LABEL[genre ?? 'OTHER'].singular;
}

export function sectionLabelPlural(genre: GameGenre | null | undefined): string {
  return SECTION_LABEL[genre ?? 'OTHER'].plural;
}

/** Com inicial maiúscula, para título de seção e rótulo de campo. */
export function sectionLabelTitulo(genre: GameGenre | null | undefined): string {
  const label = sectionLabel(genre);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Conteúdo sem seção não some da lista: cai num grupo com este rótulo.
 *
 * Existe porque a ponta é anulável no back-end de propósito — jogo que não se divide
 * existe, e passo `AVOID` vale a run inteira e não pertence a parte nenhuma do jogo.
 */
export const SECAO_SEM_NOME = 'sem seção';

/**
 * Agrupa qualquer conteúdo que aponte para uma seção, preservando a ordem de chegada.
 *
 * **Não ordena os grupos por nome.** A ordem das seções é a ordem em que se atravessa o
 * jogo, e ela já vem da consulta — alfabetar colocaria a área final antes da inicial, que
 * é o oposto do que uma linha do tempo serve para dizer. É a mesma razão do `orderIndex`
 * existir em vez de a lista sair ordenada por `name`.
 */
export function agruparPorSecao<T extends { section?: GameSectionRef | null }>(
  itens: T[],
  semNome = SECAO_SEM_NOME,
): { nome: string; itens: T[] }[] {
  const grupos: { nome: string; itens: T[] }[] = [];

  for (const item of itens) {
    const nome = item.section?.name?.trim() || semNome;
    let grupo = grupos.find((g) => g.nome === nome);
    if (!grupo) {
      grupo = { nome, itens: [] };
      grupos.push(grupo);
    }
    grupo.itens.push(item);
  }

  return grupos;
}
