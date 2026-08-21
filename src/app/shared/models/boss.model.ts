import type { BossDTO, BossSummaryDTO, GameGenre } from '@xcorpiiion/canonico';
import { agruparPorSecao, sectionLabel } from './game-section.model';

// Shape da API — fonte da verdade: lib canonico
export type Boss = BossDTO;
export type BossSummary = BossSummaryDTO;

/**
 * Um grupo da lista: os chefes de uma seção do jogo, na ordem recomendada.
 *
 * View model do front, não contrato: a API devolve a lista plana já ordenada, e quem
 * agrupa é a tela. Agrupar no servidor obrigaria o contrato a decidir a forma da
 * apresentação — e a mesma lista é usada pelo filtro de "só obrigatórios", que muda os
 * grupos sem mudar o dado.
 */
export interface SecaoDeChefes {
  nome: string;
  chefes: BossSummary[];
}

/**
 * Chefe sem seção cadastrada não some da lista: cai num grupo com este rótulo.
 *
 * O rótulo varia com a família do jogo porque a palavra varia — em souls-like é 'sem
 * região', em terror é 'sem capítulo'. Ver ADR 0020 do back-end: a estrutura é uma só, e
 * o substantivo é decisão de tela.
 */
export function secaoSemNome(genre: GameGenre | null | undefined): string {
  return `sem ${sectionLabel(genre)}`;
}

/**
 * Agrupa preservando a ordem de chegada.
 *
 * Não ordena os grupos por nome: a ordem das seções é a ordem em que o jogo as apresenta,
 * e ela vem do `displayOrder` dos chefes — alfabetar colocaria a área final antes da
 * inicial, que é o oposto do que uma linha do tempo serve para dizer.
 */
export function agruparChefesPorSecao(
  chefes: BossSummary[],
  genre: GameGenre | null | undefined,
): SecaoDeChefes[] {
  return agruparPorSecao(chefes, secaoSemNome(genre)).map((grupo) => ({
    nome: grupo.nome,
    chefes: grupo.itens,
  }));
}
