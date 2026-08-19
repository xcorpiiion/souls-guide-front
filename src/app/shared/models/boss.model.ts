import type { BossDTO, BossSummaryDTO } from '@xcorpiiion/canonico';

// Shape da API — fonte da verdade: lib canonico
export type Boss = BossDTO;
export type BossSummary = BossSummaryDTO;

/**
 * Um grupo da lista: os chefes de uma região, na ordem recomendada.
 *
 * View model do front, não contrato: a API devolve a lista plana já ordenada, e quem
 * agrupa é a tela. Agrupar no servidor obrigaria o contrato a decidir a forma da
 * apresentação — e a mesma lista é usada pelo filtro de "só obrigatórios", que muda os
 * grupos sem mudar o dado.
 */
export interface RegiaoDeChefes {
  nome: string;
  chefes: BossSummary[];
}

/** Chefe sem região cadastrada não some da lista: cai num grupo com este rótulo. */
export const REGIAO_SEM_NOME = 'sem região';

/**
 * Agrupa preservando a ordem de chegada.
 *
 * Não ordena os grupos por nome: a ordem das regiões é a ordem em que o jogo as apresenta,
 * e ela vem do `displayOrder` dos chefes — alfabetar colocaria a área final antes da
 * inicial, que é o oposto do que uma linha do tempo serve para dizer.
 */
export function agruparPorRegiao(chefes: BossSummary[]): RegiaoDeChefes[] {
  const grupos: RegiaoDeChefes[] = [];

  for (const chefe of chefes) {
    const nome = chefe.region?.trim() || REGIAO_SEM_NOME;
    let grupo = grupos.find((g) => g.nome === nome);
    if (!grupo) {
      grupo = { nome, chefes: [] };
      grupos.push(grupo);
    }
    grupo.chefes.push(chefe);
  }

  return grupos;
}
