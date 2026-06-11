import { describe, it, expect } from 'vitest';
import { buildMiniGraph } from './mini-graph';
import { QUESTS_DETAIL } from '../../features/quest-detail/quest-detail.mocks';

const quest = QUESTS_DETAIL[0];

describe('buildMiniGraph', () => {
  it('retorna nodes e edges', () => {
    const { nodes, edges } = buildMiniGraph(quest);
    expect(nodes.length).toBeGreaterThan(0);
    expect(Array.isArray(edges)).toBe(true);
  });

  it('todos os nodes têm cx e cy dentro do viewBox', () => {
    const W = 64;
    const H = 40;
    const { nodes } = buildMiniGraph(quest, W, H);
    for (const n of nodes) {
      expect(n.cx).toBeGreaterThanOrEqual(0);
      expect(n.cx).toBeLessThanOrEqual(W);
      expect(n.cy).toBeGreaterThanOrEqual(0);
      expect(n.cy).toBeLessThanOrEqual(H);
    }
  });

  it('edges têm coordenadas numéricas válidas', () => {
    const { edges } = buildMiniGraph(quest);
    for (const e of edges) {
      expect(typeof e.x1).toBe('number');
      expect(typeof e.y1).toBe('number');
      expect(typeof e.x2).toBe('number');
      expect(typeof e.y2).toBe('number');
    }
  });

  it('respeita dimensões customizadas', () => {
    const { nodes } = buildMiniGraph(quest, 100, 80);
    for (const n of nodes) {
      expect(n.cx).toBeLessThanOrEqual(100);
      expect(n.cy).toBeLessThanOrEqual(80);
    }
  });

  it('funciona para todos os quests mockados', () => {
    for (const q of QUESTS_DETAIL) {
      const result = buildMiniGraph(q);
      expect(result.nodes.length).toBeGreaterThan(0);
    }
  });
});
