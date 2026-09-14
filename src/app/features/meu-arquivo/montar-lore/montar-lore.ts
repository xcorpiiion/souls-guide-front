import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { ToastService } from '@xcorpiiion/ui';
import type { StoryLinkDTO } from '@xcorpiiion/canonico';
import { LoreService } from '../../../core/services/lore.service';
import { PersonalLoreService } from '../../../core/services/personal-lore.service';
import { AchadoDaTela, LIGACAO_POR_CHAVE, SEM_CAPITULO, contem, tipoDe } from '../arquivo.model';

type Passo = 1 | 2 | 3;

type Bloco =
  | { readonly id: number; readonly kind: 'texto'; readonly valor: string }
  | { readonly id: number; readonly kind: 'citacao'; readonly achadoId: number };

/**
 * Montar uma lore com o arquivo: escolher os achados, ordenar o fio, escrever entre as
 * citações e publicar. É o passo que o ADR 0032 deixou em aberto.
 *
 * <h2>O que sai do arquivo, e o que não sai</h2>
 * Uma lore publicada é pública. O que a pessoa escolhe aqui vira <b>citação</b> dentro do
 * texto do artigo: o texto do achado, o título e o capítulo. A anotação dela não entra, e os
 * achados que não foram citados continuam só dela — a tela diz isso item por item antes do
 * botão de publicar.
 *
 * <h2>Por que a citação é texto, e não referência</h2>
 * O artigo guarda uma cópia do trecho, e não o id do achado. Referência obrigaria o artigo
 * público a ler um dado privado para se desenhar, e a apagar um achado quebraria a lore de
 * quem já leu. A cópia é o mesmo que acontece quando alguém cita um livro.
 *
 * <p>A citação sai como bloco de citação do markdown (`> `), que a página do artigo já
 * desenha — nenhum formato novo no servidor.
 */
@Component({
  selector: 'app-montar-lore',
  imports: [CdkDropList, CdkDrag, CdkDragHandle],
  templateUrl: './montar-lore.html',
  styleUrl: './montar-lore.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MontarLore implements OnInit {
  private readonly loreService = inject(LoreService);
  private readonly personalLoreService = inject(PersonalLoreService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly gameId = input.required<string>();
  readonly gameName = input<string>('');
  readonly itens = input.required<AchadoDaTela[]>();
  readonly ligacoes = input.required<StoryLinkDTO[]>();
  /** Achados que já chegam escolhidos — o "usar numa lore" do detalhe. */
  readonly escolhidosIniciais = input<number[]>([]);

  readonly voltar = output<void>();

  protected readonly passo = signal<Passo>(1);
  protected readonly busca = signal('');
  /** A ordem de leitura. No passo 1 é a ordem de escolha; o passo 2 a reorganiza. */
  protected readonly escolhidos = signal<number[]>([]);

  protected readonly titulo = signal('');
  protected readonly tipo = signal<'WORLD' | 'CHARACTER'>('WORLD');
  protected readonly personagem = signal('');
  protected readonly blocos = signal<Bloco[]>([{ id: 1, kind: 'texto', valor: '' }]);
  private proximoId = 2;
  private esqueletoMontado = false;
  protected readonly enviando = signal<'publicar' | 'rascunho' | null>(null);

  protected readonly tipoDe = tipoDe;

  ngOnInit(): void {
    const existentes = new Set(this.itens().map((a) => a.id));
    this.escolhidos.set(this.escolhidosIniciais().filter((id) => existentes.has(id)));
  }

  private readonly porId = computed(() => new Map(this.itens().map((a) => [a.id, a])));

  protected readonly visiveis = computed(() => {
    const q = this.busca();
    return this.itens().filter((a) => contem(`${a.title}\n${a.body}`, q));
  });

  protected readonly escolhidosComoSet = computed(() => new Set(this.escolhidos()));

  protected readonly ordem = computed(() =>
    this.escolhidos()
      .map((id) => this.porId().get(id))
      .filter((a): a is AchadoDaTela => !!a),
  );

  /**
   * As ligações que já existem entre cada par vizinho da ordem — a estrutura do artigo antes
   * de existir uma frase dele. "Acontece antes" lido de baixo para cima vira "acontece
   * depois", como no resto do arquivo.
   */
  protected readonly entreVizinhos = computed(() => {
    const ordem = this.ordem();
    return ordem.slice(0, -1).map((a, i) => {
      const b = ordem[i + 1];
      const ligacao = this.ligacoes().find(
        (l) => (l.fromId === a.id && l.toId === b.id) || (l.fromId === b.id && l.toId === a.id),
      );
      if (!ligacao) return null;
      const tipo = LIGACAO_POR_CHAVE.get(ligacao.kind)!;
      const invertida = tipo.temDirecao && ligacao.fromId === b.id;
      return {
        rotulo: invertida ? 'acontece depois' : tipo.short,
        kind: ligacao.kind,
      };
    });
  });

  protected readonly citados = computed(
    () =>
      new Set(
        this.blocos()
          .filter((b): b is Extract<Bloco, { kind: 'citacao' }> => b.kind === 'citacao')
          .map((b) => b.achadoId),
      ),
  );

  protected readonly restantes = computed(() =>
    this.ordem().filter((a) => !this.citados().has(a.id)),
  );

  protected readonly conteudo = computed(() => this.serializar());

  protected readonly primeiroParagrafo = computed(() => {
    const texto = this.blocos().find(
      (b): b is Extract<Bloco, { kind: 'texto' }> => b.kind === 'texto' && !!b.valor.trim(),
    );
    const valor = texto?.valor.trim() ?? '';
    return valor.length > 180 ? `${valor.slice(0, 180).trimEnd()}…` : valor;
  });

  protected readonly podePublicar = computed(
    () =>
      this.titulo().trim().length > 0 &&
      this.conteudo().trim().length >= 10 &&
      (this.tipo() === 'WORLD' || this.personagem().trim().length > 0) &&
      this.enviando() === null,
  );

  protected readonly naoCitados = computed(() => this.itens().length - this.citados().size);

  // ─── Passo 1 ───────────────────────────────────────────────────────────────

  protected alternar(id: number): void {
    this.escolhidos.update((lista) =>
      lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id],
    );
  }

  protected irPara(passo: Passo): void {
    if (passo > 1 && this.escolhidos().length === 0) return;
    if (passo === 3 && !this.esqueletoMontado) {
      // A primeira ida à escrita já traz as citações na ordem do fio, com um parágrafo
      // antes de cada uma. É o esqueleto que a pessoa preenche, e não uma página em branco.
      // Só na primeira: voltar para reordenar e retornar não pode apagar o que foi escrito.
      this.montarEsqueleto();
      this.esqueletoMontado = true;
    }
    this.passo.set(passo);
  }

  // ─── Passo 2 ───────────────────────────────────────────────────────────────

  protected soltar(evento: CdkDragDrop<AchadoDaTela[]>): void {
    this.escolhidos.update((lista) => {
      const copia = [...lista];
      moveItemInArray(copia, evento.previousIndex, evento.currentIndex);
      return copia;
    });
  }

  /** O mesmo que arrastar, pelo teclado. */
  protected mover(indice: number, delta: -1 | 1): void {
    this.escolhidos.update((lista) => {
      const destino = indice + delta;
      if (destino < 0 || destino >= lista.length) return lista;
      const copia = [...lista];
      moveItemInArray(copia, indice, destino);
      return copia;
    });
  }

  // ─── Passo 3 ───────────────────────────────────────────────────────────────

  private montarEsqueleto(): void {
    const blocos: Bloco[] = [];
    for (const a of this.ordem()) {
      blocos.push({ id: this.proximoId++, kind: 'texto', valor: '' });
      blocos.push({ id: this.proximoId++, kind: 'citacao', achadoId: a.id });
    }
    blocos.push({ id: this.proximoId++, kind: 'texto', valor: '' });
    this.blocos.set(blocos);
  }

  protected escrever(id: number, valor: string): void {
    this.blocos.update((lista) =>
      lista.map((b) => (b.id === id && b.kind === 'texto' ? { ...b, valor } : b)),
    );
  }

  protected removerCitacao(id: number): void {
    this.blocos.update((lista) => juntarTextosVizinhos(lista.filter((b) => b.id !== id)));
  }

  protected inserirCitacao(): void {
    const proxima = this.restantes()[0];
    if (!proxima) return;
    this.blocos.update((lista) => [
      ...lista,
      { id: this.proximoId++, kind: 'citacao', achadoId: proxima.id },
      { id: this.proximoId++, kind: 'texto', valor: '' },
    ]);
  }

  protected achado(id: number): AchadoDaTela | undefined {
    return this.porId().get(id);
  }

  // ─── Publicar ──────────────────────────────────────────────────────────────

  protected publicar(): void {
    if (!this.podePublicar()) return;
    this.enviando.set('publicar');
    this.loreService
      .create({
        title: this.titulo().trim(),
        type: this.tipo(),
        gameId: this.gameId(),
        characterName: this.tipo() === 'CHARACTER' ? this.personagem().trim() : undefined,
        content: this.conteudo(),
      })
      .subscribe({
        next: (artigo) => {
          this.enviando.set(null);
          this.toast.success('Lore publicada', 'Ela nasce como teoria.');
          this.router.navigate(['/lore', artigo.id]);
        },
        error: () => {
          this.enviando.set(null);
          this.toast.error('Não foi possível publicar', 'O texto continua aqui. Tente de novo.');
        },
      });
  }

  /**
   * O rascunho é uma lore <b>pessoal e privada</b>: fica no perfil, só a pessoa vê, e dá para
   * terminar pelo editor de lore. Não é um estado novo no servidor — é o que o perfil já
   * oferece.
   */
  protected guardarRascunho(): void {
    if (!this.podePublicar()) return;
    this.enviando.set('rascunho');
    this.personalLoreService
      .createPersonal({
        title: this.titulo().trim(),
        type: this.tipo(),
        gameId: this.gameId(),
        characterName: this.tipo() === 'CHARACTER' ? this.personagem().trim() : undefined,
        content: this.conteudo(),
        isPublic: false,
        allowCopy: false,
      })
      .subscribe({
        next: (artigo) => {
          this.enviando.set(null);
          this.toast.success('Rascunho guardado', 'Está no seu perfil, visível só para você.');
          this.router.navigate(['/profile', 'lore', artigo.id], {
            queryParams: { personal: 'true' },
          });
        },
        error: () => {
          this.enviando.set(null);
          this.toast.error('Não foi possível guardar', 'O texto continua aqui. Tente de novo.');
        },
      });
  }

  /**
   * O markdown do artigo. Parágrafo é parágrafo; citação é um bloco de citação com o texto do
   * achado e, na última linha, de onde ele veio.
   *
   * <p>Linha em branco dentro do texto de um achado vira quebra simples: no markdown do site,
   * linha em branco separa blocos, e ela partiria a citação em duas.
   */
  private serializar(): string {
    return this.blocos()
      .map((b) => {
        if (b.kind === 'texto') return b.valor.trim();
        const a = this.porId().get(b.achadoId);
        if (!a) return '';
        const corpo = a.body
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
          .join('\n');
        const origem = `— ${a.title} · ${tipoDe(a.kind).label}, ${a.chapter || SEM_CAPITULO}`;
        return `> ${corpo}\n${origem}`;
      })
      .filter(Boolean)
      .join('\n\n');
  }
}

/** Tirar uma citação do meio deixaria dois parágrafos colados; eles viram um só. */
function juntarTextosVizinhos(lista: Bloco[]): Bloco[] {
  const resultado: Bloco[] = [];
  for (const b of lista) {
    const anterior = resultado[resultado.length - 1];
    if (b.kind === 'texto' && anterior?.kind === 'texto') {
      const valor = [anterior.valor.trim(), b.valor.trim()].filter(Boolean).join('\n\n');
      resultado[resultado.length - 1] = { ...anterior, valor };
    } else {
      resultado.push(b);
    }
  }
  return resultado.length ? resultado : [{ id: 1, kind: 'texto', valor: '' }];
}
