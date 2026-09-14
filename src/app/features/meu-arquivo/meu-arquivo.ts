import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AuthService } from '@xcorpiiion/ng-core';
import { ConfirmService, ToastService } from '@xcorpiiion/ui';
import { filter, switchMap } from 'rxjs/operators';
import type {
  StoryFindingDTO,
  StoryFindingKind,
  StoryLinkDTO,
  StoryLinkKind,
} from '@xcorpiiion/canonico';
import { StoryArchiveService } from '../../core/services/story-archive.service';

type Tela = 'visao-geral' | 'registrar' | 'detalhe';
type Visao = 'arquivo' | 'ligacoes';

interface TipoDeAchado {
  readonly key: StoryFindingKind;
  readonly label: string;
  readonly icon: string;
}

interface TipoDeLigacao {
  readonly key: StoryLinkKind;
  readonly label: string;
  readonly short: string;
  readonly color: string;
}

/** Um achado já com o que a tela mostra ao lado dele. */
interface AchadoDaTela extends StoryFindingDTO {
  readonly icon: string;
  readonly typeLabel: string;
  readonly firstLine: string;
  readonly chapterLabel: string;
  readonly degree: number;
  readonly linkLabel: string;
}

/** Uma ligação vista a partir de um dos achados. */
interface LigacaoVista {
  readonly id: number;
  readonly otherId: number;
  readonly title: string;
  readonly label: string;
  readonly short: string;
  readonly color: string;
  readonly bg: string;
  readonly why: string | null;
}

export const TIPOS: readonly TipoDeAchado[] = [
  { key: 'NOTE', label: 'nota', icon: 'ti ti-note' },
  { key: 'DOCUMENT', label: 'documento', icon: 'ti ti-file-text' },
  { key: 'DIALOGUE', label: 'diálogo', icon: 'ti ti-message-dots' },
  { key: 'CUTSCENE', label: 'cutscene', icon: 'ti ti-movie' },
];

/**
 * Dourado e brasa são os únicos tipos com cor própria, e é de propósito: "fala da mesma
 * pessoa" é a ligação que monta a história, e "contradiz" é a que avisa que alguma coisa
 * está errada. As outras três são estrutura, e ficam no cinza.
 */
export const LIGACOES: readonly TipoDeLigacao[] = [
  {
    key: 'SAME_SUBJECT',
    label: 'fala da mesma pessoa/coisa',
    short: 'mesma pessoa',
    color: '#c9a84c',
  },
  { key: 'EXPLAINS', label: 'explica', short: 'explica', color: '#8a8278' },
  { key: 'CONTRADICTS', label: 'contradiz', short: 'contradiz', color: '#b84c2a' },
  { key: 'HAPPENS_BEFORE', label: 'acontece antes', short: 'acontece antes', color: '#8a8278' },
  { key: 'MENTIONS', label: 'menciona', short: 'menciona', color: '#8a8278' },
];

const TIPO_POR_CHAVE = new Map(TIPOS.map((t) => [t.key, t]));
const LIGACAO_POR_CHAVE = new Map(LIGACOES.map((l) => [l.key, l]));

const SEM_CAPITULO = 'sem capítulo';

// A geometria do mural. Os números são os do artboard: cartão de 230 por 96, e 155px de
// folga entre colunas para caber o rótulo da ligação sem encostar em cartão nenhum.
const CARD_W = 230;
const CARD_H = 96;
const PASSO_X = 385;
const PASSO_Y = 170;
const MARGEM = 20;
const LARGURA_MINIMA = 1040;

/**
 * O arquivo pessoal de achados de um jogo — a aba "meu arquivo". Ver ADR 0032 do
 * souls-guide-api, e o artboard `Meu arquivo.dc.html`.
 *
 * <p><b>As três telas moram aqui dentro</b>, e não em rotas: é assim que o desenho as trata,
 * como estados de uma aba, e é o que mantém a página do jogo em volta enquanto a pessoa
 * registra um achado atrás do outro.
 *
 * <p>O arquivo chega inteiro e tudo o mais é derivado dele — contagem, filtro, mural e fio.
 * Cada escrita atualiza a lista em memória em vez de recarregar, porque quem acabou de colar
 * uma nota quer vê-la na hora.
 */
@Component({
  selector: 'app-meu-arquivo',
  imports: [RouterLink],
  templateUrl: './meu-arquivo.html',
  styleUrl: './meu-arquivo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeuArquivo {
  private readonly service = inject(StoryArchiveService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly el = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly auth = inject(AuthService);

  /** O id numérico do jogo, como texto — o mesmo que a página do jogo já resolveu. */
  readonly gameId = input.required<string>();

  protected readonly tipos = TIPOS;
  protected readonly ligacoesDisponiveis = LIGACOES;

  // ─── Dados ─────────────────────────────────────────────────────────────────
  protected readonly carregando = signal(true);
  protected readonly falhou = signal(false);
  protected readonly achados = signal<StoryFindingDTO[]>([]);
  protected readonly ligacoes = signal<StoryLinkDTO[]>([]);

  // ─── Navegação dentro da aba ───────────────────────────────────────────────
  protected readonly tela = signal<Tela>('visao-geral');
  protected readonly visao = signal<Visao>('arquivo');
  protected readonly celular = signal(false);

  // ─── Filtros da visão Arquivo ──────────────────────────────────────────────
  protected readonly filtroTipo = signal<StoryFindingKind | 'todos'>('todos');
  protected readonly filtroCapitulo = signal<string>('todos');
  protected readonly soSoltas = signal(false);
  protected readonly busca = signal('');

  // ─── Mural e fio ───────────────────────────────────────────────────────────
  protected readonly destaqueId = signal<number | null>(null);
  private readonly fioEscolhido = signal<number | null>(null);

  // ─── Detalhe ───────────────────────────────────────────────────────────────
  protected readonly detalheId = signal<number | null>(null);
  protected readonly anotacao = signal('');
  protected readonly anotacaoEstado = signal<'' | 'guardando' | 'guardada'>('');
  private temporizadorAnotacao: ReturnType<typeof setTimeout> | null = null;

  protected readonly ligadorAberto = signal(false);
  protected readonly ligadorBusca = signal('');
  protected readonly ligadorEscolhido = signal<number | null>(null);
  protected readonly ligadorTipo = signal<StoryLinkKind>('SAME_SUBJECT');
  protected readonly ligadorPorque = signal('');
  protected readonly ligando = signal(false);

  // ─── Registrar / editar ────────────────────────────────────────────────────
  protected readonly editandoId = signal<number | null>(null);
  protected readonly formTipo = signal<StoryFindingKind>('NOTE');
  protected readonly formTitulo = signal('');
  protected readonly formTexto = signal('');
  protected readonly formCapitulo = signal('');
  protected readonly formQuemFala = signal('');
  protected readonly salvando = signal(false);

  constructor() {
    if (this.noNavegador && typeof window.matchMedia === 'function') {
      const consulta = window.matchMedia('(max-width: 767px)');
      this.celular.set(consulta.matches);
      const ouvir = (e: MediaQueryListEvent) => this.celular.set(e.matches);
      consulta.addEventListener('change', ouvir);
      this.destroyRef.onDestroy(() => consulta.removeEventListener('change', ouvir));
    }

    // O arquivo é pedido quando há login e jogo — e de novo se um dos dois mudar, que é o
    // caso de quem entra pela tela de login e volta para a mesma página.
    effect(() => {
      const id = this.gameId();
      const logado = this.auth.isLoggedIn();
      if (!this.noNavegador || !logado || !id) return;
      untracked(() => this.carregar(id));
    });

    this.destroyRef.onDestroy(() => this.gravarAnotacaoPendente());
  }

  // ─── Derivados ─────────────────────────────────────────────────────────────

  /** Quantas ligações cada achado tem, pelos dois lados. */
  private readonly grau = computed(() => {
    const grau = new Map<number, number>();
    for (const l of this.ligacoes()) {
      grau.set(l.fromId, (grau.get(l.fromId) ?? 0) + 1);
      grau.set(l.toId, (grau.get(l.toId) ?? 0) + 1);
    }
    return grau;
  });

  protected readonly itens = computed<AchadoDaTela[]>(() => {
    const grau = this.grau();
    return this.achados().map((a) => this.decorar(a, grau.get(a.id) ?? 0));
  });

  private readonly porId = computed(() => new Map(this.itens().map((a) => [a.id, a])));

  /** Os capítulos na ordem em que apareceram pela primeira vez. */
  protected readonly capitulos = computed(() => {
    const vistos: string[] = [];
    for (const a of this.achados()) {
      if (a.chapter && !vistos.includes(a.chapter)) vistos.push(a.chapter);
    }
    return vistos;
  });

  protected readonly soltas = computed(() => this.itens().filter((a) => a.degree === 0));

  protected readonly vazio = computed(() => this.achados().length === 0);

  protected readonly grupos = computed(() => {
    const q = this.busca().trim().toLowerCase();
    const tipo = this.filtroTipo();
    const capitulo = this.filtroCapitulo();
    const soSoltas = this.soSoltas();

    const ordem: string[] = [];
    const porCapitulo = new Map<string, AchadoDaTela[]>();

    for (const a of this.itens()) {
      if (tipo !== 'todos' && a.kind !== tipo) continue;
      if (capitulo !== 'todos' && (a.chapter ?? '') !== capitulo) continue;
      if (soSoltas && a.degree > 0) continue;
      if (q && !`${a.title} ${a.body}`.toLowerCase().includes(q)) continue;

      const chave = a.chapter || SEM_CAPITULO;
      if (!porCapitulo.has(chave)) {
        porCapitulo.set(chave, []);
        ordem.push(chave);
      }
      porCapitulo.get(chave)!.push(a);
    }

    return ordem.map((chapter) => ({
      chapter,
      items: porCapitulo.get(chapter)!,
    }));
  });

  // ─── Mural ─────────────────────────────────────────────────────────────────

  /**
   * Onde cada cartão fica.
   *
   * <p>O artboard tinha as posições à mão, para cinco achados de exemplo. Com o arquivo de
   * verdade a posição sai do <b>capítulo</b>: uma coluna por capítulo, na ordem em que a
   * pessoa os encontrou, e os achados de cada um empilhados. A história corre da esquerda
   * para a direita, que é a leitura que o mural promete.
   *
   * <p>Só entra quem tem ligação. Peça solta não tem aresta para desenhar, e fica na faixa
   * de baixo pedindo para ser ligada.
   */
  private readonly posicoes = computed(() => {
    const colunas: string[] = [];
    const linhasPorColuna = new Map<string, number>();
    const posicoes = new Map<number, { x: number; y: number }>();

    for (const a of this.itens()) {
      if (a.degree === 0) continue;
      const coluna = a.chapter || SEM_CAPITULO;
      if (!linhasPorColuna.has(coluna)) {
        linhasPorColuna.set(coluna, 0);
        colunas.push(coluna);
      }
      const linha = linhasPorColuna.get(coluna)!;
      linhasPorColuna.set(coluna, linha + 1);
      posicoes.set(a.id, {
        x: MARGEM + colunas.indexOf(coluna) * PASSO_X,
        y: 30 + linha * PASSO_Y,
      });
    }

    const maisLinhas = Math.max(0, ...linhasPorColuna.values());
    return {
      posicoes,
      largura: Math.max(LARGURA_MINIMA, MARGEM * 2 + (colunas.length - 1) * PASSO_X + CARD_W),
      altura: maisLinhas === 0 ? 0 : 30 + (maisLinhas - 1) * PASSO_Y + CARD_H + 30,
    };
  });

  protected readonly muralLargura = computed(() => this.posicoes().largura);
  protected readonly muralAltura = computed(() => this.posicoes().altura);

  private readonly vizinhosDoDestaque = computed(() => {
    const destaque = this.destaqueId();
    const vizinhos = new Set<number>();
    if (destaque === null) return vizinhos;
    vizinhos.add(destaque);
    for (const l of this.ligacoes()) {
      if (l.fromId === destaque) vizinhos.add(l.toId);
      if (l.toId === destaque) vizinhos.add(l.fromId);
    }
    return vizinhos;
  });

  protected readonly nos = computed(() => {
    const { posicoes } = this.posicoes();
    const destaque = this.destaqueId();
    const vizinhos = this.vizinhosDoDestaque();

    return this.itens()
      .filter((a) => posicoes.has(a.id))
      .map((a) => ({
        ...a,
        x: posicoes.get(a.id)!.x,
        y: posicoes.get(a.id)!.y,
        aceso: destaque === a.id,
        apagado: destaque !== null && !vizinhos.has(a.id),
      }));
  });

  protected readonly arestas = computed(() => {
    const { posicoes } = this.posicoes();
    const destaque = this.destaqueId();
    const vizinhos = this.vizinhosDoDestaque();

    return this.ligacoes()
      .filter((l) => posicoes.has(l.fromId) && posicoes.has(l.toId))
      .map((l) => {
        const tipo = LIGACAO_POR_CHAVE.get(l.kind)!;
        const a = posicoes.get(l.fromId)!;
        const b = posicoes.get(l.toId)!;
        const x1 = a.x + CARD_W / 2;
        const y1 = a.y + CARD_H / 2;
        const x2 = b.x + CARD_W / 2;
        const y2 = b.y + CARD_H / 2;
        const acesa = destaque === null || (vizinhos.has(l.fromId) && vizinhos.has(l.toId));
        return {
          id: l.id,
          x1,
          y1,
          x2,
          y2,
          cor: tipo.color,
          largura: acesa && destaque !== null ? 1.6 : 1,
          tracejado: l.kind === 'CONTRADICTS' ? '5 4' : null,
          opacidade: acesa ? 1 : 0.12,
          rotulo: tipo.short,
          rotuloX: (x1 + x2) / 2,
          rotuloY: (y1 + y2) / 2,
        };
      });
  });

  protected readonly soltasDoMural = computed(() => this.soltas().slice(0, 4));

  protected readonly rotuloFaixaSoltas = computed(() => {
    const n = this.soltas().length;
    return n === 1 ? 'peças soltas — 1 sem ligação' : `peças soltas — ${n} sem ligação`;
  });

  // ─── Fio (celular) ─────────────────────────────────────────────────────────

  /**
   * O achado de onde o fio parte. Sem escolha, é o primeiro que tem ligação — abrir o fio
   * numa peça solta mostraria a tela de "esta peça está solta" para quem tem dez ligações.
   */
  protected readonly fio = computed(() => {
    const escolhido = this.fioEscolhido();
    const porId = this.porId();
    const itens = this.itens();
    const achado =
      (escolhido !== null ? porId.get(escolhido) : undefined) ??
      itens.find((a) => a.degree > 0) ??
      itens[0];
    if (!achado) return null;

    const vizinhos = this.ligacoesVistasDe(achado.id);
    return {
      ...achado,
      neighbours: vizinhos,
      neighboursLabel:
        vizinhos.length === 0
          ? 'ligado a'
          : vizinhos.length === 1
            ? 'ligado a 1 achado'
            : `ligado a ${vizinhos.length} achados`,
    };
  });

  // ─── Detalhe ───────────────────────────────────────────────────────────────

  protected readonly detalhe = computed(() => {
    const id = this.detalheId();
    return id === null ? null : (this.porId().get(id) ?? null);
  });

  protected readonly ligacoesDoDetalhe = computed(() => {
    const d = this.detalhe();
    return d ? this.ligacoesVistasDe(d.id) : [];
  });

  protected readonly rotuloLigacoesDoDetalhe = computed(() => {
    const n = this.ligacoesDoDetalhe().length;
    return n === 0 ? 'ligações' : n === 1 ? '1 ligação' : `${n} ligações`;
  });

  /**
   * Os achados que dá para ligar a este: todos menos ele, filtrados pela busca. Seis na tela
   * são o bastante para achar pelo nome — quem tem 150 achados digita.
   */
  protected readonly candidatos = computed(() => {
    const d = this.detalhe();
    const q = this.ligadorBusca().trim().toLowerCase();
    return this.itens()
      .filter((a) => a.id !== d?.id)
      .filter((a) => !q || a.title.toLowerCase().includes(q))
      .slice(0, 6);
  });

  // ─── Registrar ─────────────────────────────────────────────────────────────

  /** Os três capítulos usados por último, o mais recente primeiro. */
  protected readonly sugestoesDeCapitulo = computed(() => {
    const recentes: string[] = [];
    const achados = this.achados();
    for (let i = achados.length - 1; i >= 0 && recentes.length < 3; i--) {
      const c = achados[i].chapter;
      if (c && !recentes.includes(c)) recentes.push(c);
    }
    return recentes;
  });

  protected readonly mostraQuemFala = computed(
    () => this.formTipo() === 'DIALOGUE' || this.formTipo() === 'CUTSCENE',
  );

  protected readonly podeSalvar = computed(
    () =>
      this.formTitulo().trim().length > 0 && this.formTexto().trim().length > 0 && !this.salvando(),
  );

  // ─── Carga ─────────────────────────────────────────────────────────────────

  protected carregar(id = this.gameId()): void {
    this.carregando.set(true);
    this.falhou.set(false);
    this.service.archive(id).subscribe({
      next: (arquivo) => {
        this.achados.set(arquivo.findings);
        this.ligacoes.set(arquivo.links);
        this.carregando.set(false);
      },
      error: () => {
        this.falhou.set(true);
        this.carregando.set(false);
      },
    });
  }

  // ─── Navegação ─────────────────────────────────────────────────────────────

  protected irParaVisaoGeral(): void {
    this.gravarAnotacaoPendente();
    this.ligadorAberto.set(false);
    this.tela.set('visao-geral');
    this.rolarParaCima();
  }

  protected irParaRegistrar(): void {
    this.editandoId.set(null);
    const rascunho = this.lerRascunho();
    this.formTipo.set(rascunho?.tipo ?? 'NOTE');
    this.formTitulo.set(rascunho?.titulo ?? '');
    this.formTexto.set(rascunho?.texto ?? '');
    this.formQuemFala.set(rascunho?.quemFala ?? '');
    // Vem preenchido com o último capítulo: numa sessão de jogo a pessoa registra vários
    // achados do mesmo lugar, um atrás do outro.
    this.formCapitulo.set(rascunho?.capitulo ?? this.sugestoesDeCapitulo()[0] ?? '');
    this.tela.set('registrar');
    this.rolarParaCima();
  }

  protected irParaEditar(): void {
    const d = this.detalhe();
    if (!d) return;
    this.editandoId.set(d.id);
    this.formTipo.set(d.kind);
    this.formTitulo.set(d.title);
    this.formTexto.set(d.body);
    this.formCapitulo.set(d.chapter ?? '');
    this.formQuemFala.set(d.speaker ?? '');
    this.tela.set('registrar');
    this.rolarParaCima();
  }

  protected abrirAchado(id: number): void {
    this.gravarAnotacaoPendente();
    this.detalheId.set(id);
    this.anotacao.set(this.porId().get(id)?.note ?? '');
    this.anotacaoEstado.set('');
    this.ligadorAberto.set(false);
    this.destaqueId.set(null);
    this.tela.set('detalhe');
    this.rolarParaCima();
  }

  protected voltarDoFormulario(): void {
    const editando = this.editandoId();
    if (editando !== null) {
      this.abrirAchado(editando);
    } else {
      this.irParaVisaoGeral();
    }
  }

  protected mostrarVisao(visao: Visao): void {
    this.visao.set(visao);
    this.destaqueId.set(null);
  }

  protected verTodasAsSoltas(): void {
    this.soSoltas.set(true);
    this.mostrarVisao('arquivo');
  }

  protected alternarDestaque(id: number): void {
    this.destaqueId.update((atual) => (atual === id ? null : id));
  }

  protected seguirFio(id: number): void {
    this.fioEscolhido.set(id);
  }

  // ─── Registrar / editar ────────────────────────────────────────────────────

  protected escreverNoFormulario(
    campo: 'titulo' | 'texto' | 'capitulo' | 'quemFala',
    valor: string,
  ): void {
    const alvo = {
      titulo: this.formTitulo,
      texto: this.formTexto,
      capitulo: this.formCapitulo,
      quemFala: this.formQuemFala,
    }[campo];
    alvo.set(valor);
    this.guardarRascunho();
  }

  protected escolherTipo(tipo: StoryFindingKind): void {
    this.formTipo.set(tipo);
    this.guardarRascunho();
  }

  protected salvar(registrarOutro: boolean): void {
    if (!this.podeSalvar()) return;
    this.salvando.set(true);

    const request = {
      kind: this.formTipo(),
      title: this.formTitulo().trim(),
      body: this.formTexto(),
      chapter: this.formCapitulo().trim(),
      speaker: this.mostraQuemFala() ? this.formQuemFala().trim() : '',
    };

    const editando = this.editandoId();
    if (editando !== null) {
      this.service.update(editando, request).subscribe({
        next: (salvo) => {
          this.achados.update((lista) => lista.map((a) => (a.id === salvo.id ? salvo : a)));
          this.salvando.set(false);
          this.toast.success('Achado atualizado', salvo.title);
          this.abrirAchado(salvo.id);
        },
        error: (err: HttpErrorResponse) => this.falhaAoSalvar(err),
      });
      return;
    }

    this.service.register(this.gameId(), request).subscribe({
      next: (salvo) => {
        this.achados.update((lista) => [...lista, salvo]);
        this.salvando.set(false);
        this.apagarRascunho();
        this.toast.success('Achado registrado', salvo.title);

        if (registrarOutro) {
          // Tipo e capítulo ficam: o próximo achado costuma ser do mesmo lugar e da mesma
          // forma. Título, texto e quem fala são do achado que acabou de sair.
          this.formTitulo.set('');
          this.formTexto.set('');
          this.formQuemFala.set('');
          this.rolarParaCima();
        } else {
          this.irParaVisaoGeral();
        }
      },
      error: (err: HttpErrorResponse) => this.falhaAoSalvar(err),
    });
  }

  private falhaAoSalvar(err: HttpErrorResponse): void {
    this.salvando.set(false);
    this.toast.error(
      'Não foi possível salvar',
      err.status === 409
        ? 'Este jogo está fora do escopo do site e não tem arquivo.'
        : 'O texto continua aqui. Tente de novo em instantes.',
    );
  }

  protected excluir(): void {
    const d = this.detalhe();
    if (!d) return;

    this.confirm
      .ask({
        title: 'Excluir achado',
        message: `"${d.title}" sai do seu arquivo, junto com as ligações dele.`,
        confirmLabel: 'excluir',
        tone: 'danger',
      })
      .pipe(
        filter((ok) => ok),
        switchMap(() => this.service.delete(d.id)),
      )
      .subscribe({
        next: () => {
          this.achados.update((lista) => lista.filter((a) => a.id !== d.id));
          this.ligacoes.update((lista) =>
            lista.filter((l) => l.fromId !== d.id && l.toId !== d.id),
          );
          if (this.fioEscolhido() === d.id) this.fioEscolhido.set(null);
          this.detalheId.set(null);
          this.toast.success('Achado excluído', 'As ligações dele saíram junto.');
          this.tela.set('visao-geral');
          this.rolarParaCima();
        },
        error: () => this.toast.error('Erro', 'Não foi possível excluir o achado.'),
      });
  }

  // ─── Anotação ──────────────────────────────────────────────────────────────

  /**
   * A anotação se grava sozinha, pouco depois de a pessoa parar de digitar — e na hora, ao
   * sair do campo ou da tela. Não há botão de salvar: é caderno, e caderno não pergunta.
   */
  protected escreverAnotacao(valor: string): void {
    this.anotacao.set(valor);
    this.anotacaoEstado.set('');
    if (this.temporizadorAnotacao) clearTimeout(this.temporizadorAnotacao);
    this.temporizadorAnotacao = setTimeout(() => this.gravarAnotacaoPendente(), 900);
  }

  protected gravarAnotacaoPendente(): void {
    if (this.temporizadorAnotacao) {
      clearTimeout(this.temporizadorAnotacao);
      this.temporizadorAnotacao = null;
    }
    const d = this.detalhe();
    if (!d) return;
    const texto = this.anotacao();
    if ((d.note ?? '') === texto) return;

    this.anotacaoEstado.set('guardando');
    this.service.saveNote(d.id, { note: texto }).subscribe({
      next: (salvo) => {
        this.achados.update((lista) => lista.map((a) => (a.id === salvo.id ? salvo : a)));
        this.anotacaoEstado.set('guardada');
      },
      error: () => {
        this.anotacaoEstado.set('');
        this.toast.error('Anotação não guardada', 'Tente de novo em instantes.');
      },
    });
  }

  // ─── Ligar ─────────────────────────────────────────────────────────────────

  protected abrirLigador(): void {
    this.ligadorBusca.set('');
    this.ligadorEscolhido.set(null);
    this.ligadorTipo.set('SAME_SUBJECT');
    this.ligadorPorque.set('');
    this.ligadorAberto.set(true);
  }

  protected fecharLigador(): void {
    this.ligadorAberto.set(false);
  }

  @HostListener('document:keydown.escape')
  protected aoApertarEsc(): void {
    if (this.ligadorAberto()) this.fecharLigador();
  }

  protected criarLigacao(): void {
    const d = this.detalhe();
    const alvo = this.ligadorEscolhido();
    if (!d || alvo === null || this.ligando()) return;

    this.ligando.set(true);
    this.service
      .link(d.id, { targetId: alvo, kind: this.ligadorTipo(), why: this.ligadorPorque().trim() })
      .subscribe({
        next: (nova) => {
          this.ligacoes.update((lista) => [...lista, nova]);
          this.ligando.set(false);
          this.ligadorAberto.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.ligando.set(false);
          this.toast.error(
            'Ligação não criada',
            err.status === 409
              ? 'Esses dois achados já estão ligados com essa relação.'
              : 'Tente de novo em instantes.',
          );
        },
      });
  }

  protected desfazerLigacao(id: number): void {
    this.service.unlink(id).subscribe({
      next: () => this.ligacoes.update((lista) => lista.filter((l) => l.id !== id)),
      error: () => this.toast.error('Erro', 'Não foi possível desfazer a ligação.'),
    });
  }

  // ─── Apoio ─────────────────────────────────────────────────────────────────

  protected tipoLabel(tipo: StoryFindingKind): string {
    return TIPO_POR_CHAVE.get(tipo)?.label ?? tipo;
  }

  protected tipoIcone(tipo: StoryFindingKind): string {
    return TIPO_POR_CHAVE.get(tipo)?.icon ?? 'ti ti-note';
  }

  protected nomeDaLigacao(tipo: StoryLinkKind): string {
    return LIGACAO_POR_CHAVE.get(tipo)?.label ?? tipo;
  }

  private decorar(a: StoryFindingDTO, grau: number): AchadoDaTela {
    return {
      ...a,
      icon: this.tipoIcone(a.kind),
      typeLabel: this.tipoLabel(a.kind),
      firstLine: a.body.split('\n').find((linha) => linha.trim()) ?? '',
      chapterLabel: a.chapter || SEM_CAPITULO,
      degree: grau,
      linkLabel: grau === 0 ? 'peça solta' : grau === 1 ? '1 ligação' : `${grau} ligações`,
    };
  }

  /**
   * As ligações de um achado, cada uma lida a partir dele.
   *
   * <p>A ligação é gravada numa direção só, e "acontece antes" é a única que muda de sentido
   * com isso: lida a partir do destino, ela é "acontece depois". Mostrar "acontece antes" dos
   * dois lados diria que cada achado veio antes do outro.
   */
  private ligacoesVistasDe(id: number): LigacaoVista[] {
    const porId = this.porId();
    return this.ligacoes()
      .filter((l) => l.fromId === id || l.toId === id)
      .map((l) => {
        const tipo = LIGACAO_POR_CHAVE.get(l.kind)!;
        const souDestino = l.toId === id;
        const invertida = souDestino && l.kind === 'HAPPENS_BEFORE';
        const otherId = souDestino ? l.fromId : l.toId;
        return {
          id: l.id,
          otherId,
          title: porId.get(otherId)?.title ?? '—',
          label: invertida ? 'acontece depois' : tipo.label,
          short: invertida ? 'acontece depois' : tipo.short,
          color: tipo.color,
          bg:
            l.kind === 'CONTRADICTS'
              ? 'rgb(184 76 42 / 12%)'
              : l.kind === 'SAME_SUBJECT'
                ? 'rgb(201 168 76 / 12%)'
                : '#242424',
          why: l.why ?? null,
        };
      });
  }

  /**
   * A aba mora no meio da página do jogo. Trocar de tela com a rolagem lá embaixo deixaria a
   * pessoa olhando o rodapé da tela nova.
   */
  private rolarParaCima(): void {
    if (!this.noNavegador) return;
    const host = this.el.nativeElement as HTMLElement;
    if (host.getBoundingClientRect().top < 0) {
      host.scrollIntoView({ block: 'start' });
    }
  }

  // ─── Rascunho ──────────────────────────────────────────────────────────────
  // Só do registro novo, e só neste navegador: é o que o desenho promete ("rascunho
  // guardado enquanto você digita") para quem fecha a aba no meio de uma cutscene longa.

  private chaveDoRascunho(): string {
    return `sg_arquivo_rascunho_${this.gameId()}`;
  }

  private guardarRascunho(): void {
    if (!this.noNavegador || this.editandoId() !== null) return;
    try {
      localStorage.setItem(
        this.chaveDoRascunho(),
        JSON.stringify({
          tipo: this.formTipo(),
          titulo: this.formTitulo(),
          texto: this.formTexto(),
          capitulo: this.formCapitulo(),
          quemFala: this.formQuemFala(),
        }),
      );
    } catch {
      // Armazenamento bloqueado: o formulário continua funcionando, só não sobrevive à aba.
    }
  }

  private lerRascunho(): {
    tipo: StoryFindingKind;
    titulo: string;
    texto: string;
    capitulo: string;
    quemFala: string;
  } | null {
    if (!this.noNavegador) return null;
    try {
      const bruto = localStorage.getItem(this.chaveDoRascunho());
      if (!bruto) return null;
      const r = JSON.parse(bruto);
      // Rascunho sem título nem texto não é rascunho: é o capítulo que ficou de uma sessão
      // anterior, e ele atropelaria o último capítulo do arquivo.
      return r && (r.titulo || r.texto) ? r : null;
    } catch {
      return null;
    }
  }

  private apagarRascunho(): void {
    if (!this.noNavegador) return;
    try {
      localStorage.removeItem(this.chaveDoRascunho());
    } catch {
      // idem
    }
  }
}
