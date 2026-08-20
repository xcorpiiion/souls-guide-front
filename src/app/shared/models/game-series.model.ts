import type { GameSeriesDTO, GameSeriesRefDTO } from '@xcorpiiion/canonico';

// Shapes da API — fonte da verdade: lib canonico
export type GameSeries = GameSeriesDTO;

/** A série vista de dentro do jogo: só o que o cabeçalho precisa para montar o link. */
export type GameSeriesRef = GameSeriesRefDTO;

/**
 * O que vai na URL da série: o slug quando existe, o id quando não.
 *
 * Mesma regra do jogo (ADR 0013 do back-end) — as duas formas resolvem, e por isso
 * link já compartilhado continua funcionando.
 */
export function seriesRef(s: { id: number; slug?: string | null }): string {
  return s.slug ?? String(s.id);
}
