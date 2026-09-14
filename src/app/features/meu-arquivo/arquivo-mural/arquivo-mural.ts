import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { StoryLinkDTO } from '@xcorpiiion/canonico';
import { AchadoDaTela, LIGACAO_POR_CHAVE, SEM_CAPITULO } from '../arquivo.model';

// A geometria. Cartão de 230, e 155px entre colunas para o arco fazer a curva e o rótulo
// caber no meio sem encostar em cartão nenhum.
const CARD_W = 230;
const CARD_H = 92;
const PASSO_X = 385;
const PASSO_Y = 124;
const MARGEM_X = 18;
const MARGEM_Y = 20;

interface Ponto {
  readonly x: number;
  readonly y: number;
}

/**
 * O mural de ligações: a história corre da esquerda para a direita, um capítulo por coluna.
 *
 * <h2>Arcos, e não retas</h2>
 * Com dez achados numa coluna, a reta de uma ligação entre o primeiro e o último passa por
 * cima dos oito do meio, e o rótulo dela cai em cima de outro fio. O arco sai pela borda do
 * cartão e contorna — para a coluna seguinte, curva pelo vão; dentro da mesma coluna, curva
 * pelo lado de fora.
 *
 * <h2>A bandeja</h2>
 * Peça solta não tem fio para desenhar. Ela desce para a bandeja, e cada uma tem o "+" que
 * já abre a folha de ligar: no mural, peça solta é fila de trabalho, não sobra.
 */
@Component({
  selector: 'app-arquivo-mural',
  templateUrl: './arquivo-mural.html',
  styleUrl: './arquivo-mural.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArquivoMural {
  readonly itens = input.required<AchadoDaTela[]>();
  readonly ligacoes = input.required<StoryLinkDTO[]>();

  /** Abrir o achado. */
  readonly abrir = output<number>();
  /** Abrir o achado já com a folha de ligar. */
  readonly ligar = output<number>();

  protected readonly destaqueId = signal<number | null>(null);

  private readonly layout = computed(() => {
    const colunas: string[] = [];
    const linhasPorColuna = new Map<string, number>();
    const posicoes = new Map<number, Ponto & { coluna: number }>();

    for (const a of this.itens()) {
      if (a.degree === 0) continue;
      const coluna = a.chapter || SEM_CAPITULO;
      if (!linhasPorColuna.has(coluna)) {
        linhasPorColuna.set(coluna, 0);
        colunas.push(coluna);
      }
      const linha = linhasPorColuna.get(coluna)!;
      linhasPorColuna.set(coluna, linha + 1);
      const indice = colunas.indexOf(coluna);
      posicoes.set(a.id, {
        coluna: indice,
        x: MARGEM_X + indice * PASSO_X,
        y: MARGEM_Y + linha * PASSO_Y,
      });
    }

    const maisLinhas = Math.max(0, ...linhasPorColuna.values());
    return {
      colunas: colunas.map((nome, i) => ({ nome, x: MARGEM_X + i * PASSO_X })),
      posicoes,
      largura: MARGEM_X * 2 + Math.max(0, colunas.length - 1) * PASSO_X + CARD_W + 40,
      altura: maisLinhas === 0 ? 0 : MARGEM_Y * 2 + (maisLinhas - 1) * PASSO_Y + CARD_H,
    };
  });

  protected readonly colunas = computed(() => this.layout().colunas);
  protected readonly largura = computed(() => this.layout().largura);
  protected readonly altura = computed(() => this.layout().altura);
  protected readonly cardW = CARD_W;

  private readonly vizinhos = computed(() => {
    const destaque = this.destaqueId();
    const conjunto = new Map<number, string>();
    if (destaque === null) return conjunto;
    conjunto.set(destaque, 'eu');
    for (const l of this.ligacoes()) {
      if (l.fromId === destaque) conjunto.set(l.toId, l.kind);
      if (l.toId === destaque) conjunto.set(l.fromId, l.kind);
    }
    return conjunto;
  });

  protected readonly nos = computed(() => {
    const { posicoes } = this.layout();
    const destaque = this.destaqueId();
    const vizinhos = this.vizinhos();
    const fios = new Map<number, number>();
    for (const l of this.ligacoes()) {
      fios.set(l.fromId, (fios.get(l.fromId) ?? 0) + 1);
      fios.set(l.toId, (fios.get(l.toId) ?? 0) + 1);
    }

    return this.itens()
      .filter((a) => posicoes.has(a.id))
      .map((a) => ({
        ...a,
        x: posicoes.get(a.id)!.x,
        y: posicoes.get(a.id)!.y,
        aceso: destaque === a.id,
        apagado: destaque !== null && !vizinhos.has(a.id),
        // O vizinho ligado por "contradiz" ganha a borda em brasa: é o aviso de que as duas
        // pontas não podem ser verdade ao mesmo tempo.
        emBrasa: destaque !== null && destaque !== a.id && vizinhos.get(a.id) === 'CONTRADICTS',
        fios: fios.get(a.id) ?? 0,
      }));
  });

  protected readonly arcos = computed(() => {
    const { posicoes } = this.layout();
    const destaque = this.destaqueId();
    const vizinhos = this.vizinhos();

    return this.ligacoes()
      .filter((l) => posicoes.has(l.fromId) && posicoes.has(l.toId))
      .map((l) => {
        const tipo = LIGACAO_POR_CHAVE.get(l.kind)!;
        const { d, meio } = arco(posicoes.get(l.fromId)!, posicoes.get(l.toId)!);
        const aceso = destaque === null || (vizinhos.has(l.fromId) && vizinhos.has(l.toId));
        return {
          id: l.id,
          d,
          meio,
          cor: l.kind === 'CONTRADICTS' ? '#b84c2a' : tipo.color,
          corDoRotulo: l.kind === 'CONTRADICTS' ? '#d4633e' : tipo.color,
          largura: aceso && destaque !== null ? 1.6 : 1.2,
          tracejado: l.kind === 'CONTRADICTS' ? '5 4' : null,
          opacidade: aceso ? 1 : 0.14,
          rotulo: tipo.short,
        };
      });
  });

  protected readonly soltas = computed(() => this.itens().filter((a) => a.degree === 0));

  protected alternarDestaque(id: number): void {
    this.destaqueId.update((atual) => (atual === id ? null : id));
  }

  protected ligarAProxima(): void {
    const primeira = this.soltas()[0];
    if (primeira) this.ligar.emit(primeira.id);
  }
}

/**
 * O caminho de um fio e o ponto do meio dele, onde o rótulo fica.
 *
 * <p>O meio é o da curva de Bézier em t = 0,5 — {@code (P0 + 3·P1 + 3·P2 + P3) / 8} —, e não
 * o do segmento reto entre as pontas: num arco que contorna a coluna, o meio da reta cairia
 * em cima de um cartão.
 */
function arco(a: Ponto & { coluna: number }, b: Ponto & { coluna: number }) {
  const cy = (p: Ponto) => p.y + CARD_H / 2;
  let p0: Ponto;
  let p1: Ponto;
  let p2: Ponto;
  let p3: Ponto;

  if (a.coluna === b.coluna) {
    // Mesma coluna: sai e volta pela direita, com a barriga proporcional à distância.
    const barriga = 40 + Math.abs(a.y - b.y) * 0.25;
    p0 = { x: a.x + CARD_W, y: cy(a) };
    p3 = { x: b.x + CARD_W, y: cy(b) };
    p1 = { x: p0.x + barriga, y: p0.y };
    p2 = { x: p3.x + barriga, y: p3.y };
  } else {
    const [esq, dir] = a.coluna < b.coluna ? [a, b] : [b, a];
    p0 = { x: esq.x + CARD_W, y: cy(esq) };
    p3 = { x: dir.x, y: cy(dir) };
    const folga = Math.min(90, (p3.x - p0.x) / 2);
    p1 = { x: p0.x + folga, y: p0.y };
    p2 = { x: p3.x - folga, y: p3.y };
  }

  return {
    d: `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y} ${p2.x} ${p2.y} ${p3.x} ${p3.y}`,
    meio: {
      x: (p0.x + 3 * p1.x + 3 * p2.x + p3.x) / 8,
      y: (p0.y + 3 * p1.y + 3 * p2.y + p3.y) / 8,
    },
  };
}
