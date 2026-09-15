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
import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
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
import {
  AchadoDaTela,
  LIGACOES,
  SEM_CAPITULO,
  TIPOS,
  contem,
  decorar,
  janela,
  ligacoesVistasDe,
  sugestoesPara,
  tipoDe,
  tituloDoTexto,
  trechos,
} from './arquivo.model';
import { ArquivoMural } from './arquivo-mural/arquivo-mural';
import { MontarLore } from './montar-lore/montar-lore';
import { GuiaDoArquivo, PassoDoGuia } from './guia-do-arquivo/guia-do-arquivo';

type Tela = 'visao-geral' | 'registrar' | 'detalhe' | 'montar';
type Visao = 'arquivo' | 'ligacoes';

/** Quantas fichas a grade mostra antes de pedir "mostrar mais". */
const FICHAS_POR_VEZ = 24;
/** Quantos capítulos a espinha lista antes de recolher o resto. */
const CAPITULOS_VISIVEIS = 9;

/**
 * O arquivo pessoal de achados de um jogo — a aba "meu arquivo". Ver ADR 0032 do
 * souls-guide-api, e o artboard `Meu arquivo - redesenho.dc.html` ("A mesa").
 *
 * <p><b>O capítulo é a espinha</b>, fixa à esquerda; o achado é uma <b>ficha</b> com o texto do
 * jogo à vista; e a ligação acende dentro da própria ficha, sem precisar ir ao mural. No
 * computador registrar não é mais uma tela: é a faixa de colar no topo da aba.
 *
 * <p>As telas moram aqui dentro, como estados da aba, e não em rotas — é o que mantém a
 * página do jogo em volta enquanto a pessoa registra um achado atrás do outro.
 *
 * <p>O arquivo chega inteiro, e tudo o mais é derivado dele. Cada escrita atualiza a lista em
 * memória em vez de recarregar: quem acabou de colar uma nota quer vê-la na hora.
 */
@Component({
  selector: 'app-meu-arquivo',
  imports: [RouterLink, NgTemplateOutlet, ArquivoMural, MontarLore, GuiaDoArquivo],
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
  /** O nome, para a prévia da lore montada. */
  readonly gameName = input<string>('');

  protected readonly tipos = TIPOS;
  protected readonly relacoes = LIGACOES;
  protected readonly semCapitulo = SEM_CAPITULO;
  protected readonly trechos = trechos;
  protected readonly tipoDe = tipoDe;

  // ─── Dados ─────────────────────────────────────────────────────────────────
  protected readonly carregando = signal(true);
  protected readonly falhou = signal(false);
  protected readonly achados = signal<StoryFindingDTO[]>([]);
  protected readonly ligacoes = signal<StoryLinkDTO[]>([]);

  // ─── Navegação dentro da aba ───────────────────────────────────────────────
  protected readonly tela = signal<Tela>('visao-geral');
  protected readonly visao = signal<Visao>('arquivo');
  protected readonly celular = signal(false);

  // ─── Filtros ───────────────────────────────────────────────────────────────
  /** `null` é "todos"; `''` é "sem capítulo". */
  protected readonly capitulo = signal<string | null>(null);
  protected readonly filtroTipo = signal<StoryFindingKind | 'todos'>('todos');
  protected readonly soSoltas = signal(false);
  protected readonly busca = signal('');
  protected readonly capitulosAbertos = signal(false);
  protected readonly limite = signal(FICHAS_POR_VEZ);
  /** Com busca num capítulo, as fichas que não bateram ficam recolhidas até pedir. */
  protected readonly mostrarOsOutros = signal(false);

  // ─── Ficha acesa, detalhe ──────────────────────────────────────────────────
  protected readonly selecionadoId = signal<number | null>(null);
  protected readonly detalheId = signal<number | null>(null);
  protected readonly anotacao = signal('');
  protected readonly anotacaoEstado = signal<'' | 'guardando' | 'guardada'>('');
  private temporizadorAnotacao: ReturnType<typeof setTimeout> | null = null;

  // ─── Ligar ─────────────────────────────────────────────────────────────────
  protected readonly ligadorAberto = signal(false);
  protected readonly ligadorBusca = signal('');
  protected readonly ligadorEscolhido = signal<number | null>(null);
  protected readonly ligadorTipo = signal<StoryLinkKind>('SAME_SUBJECT');
  protected readonly ligadorPorque = signal('');
  protected readonly ligadorTodasRelacoes = signal(false);
  protected readonly ligando = signal(false);

  // ─── Fio (celular) ─────────────────────────────────────────────────────────
  private readonly fioEscolhido = signal<number | null>(null);

  // ─── Registrar / editar ────────────────────────────────────────────────────
  protected readonly faixa = signal('');
  protected readonly editandoId = signal<number | null>(null);
  protected readonly formTipo = signal<StoryFindingKind>('NOTE');
  protected readonly formTitulo = signal('');
  protected readonly formTexto = signal('');
  protected readonly formCapitulo = signal('');
  protected readonly formQuemFala = signal('');
  protected readonly salvando = signal(false);
  protected readonly rascunhoGuardado = signal(false);

  // ─── Montar lore ───────────────────────────────────────────────────────────
  protected readonly montarCom = signal<number[]>([]);

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

  protected readonly itens = computed<AchadoDaTela[]>(() =>
    decorar(this.achados(), this.ligacoes()),
  );

  private readonly porId = computed(() => new Map(this.itens().map((a) => [a.id, a])));

  protected readonly vazio = computed(() => this.achados().length === 0);

  // ─── O que já serve ────────────────────────────────────────────────────────
  // A mesa inteira de uma vez, para quem tem um achado só, é ruído: filtro sem o que filtrar,
  // mural sem o que ligar. Cada controle aparece quando passa a ter uso.

  /** Ligar pede dois achados. */
  protected readonly mostrarLigacoes = computed(() => this.achados().length >= 2);
  protected readonly mostrarBusca = computed(() => this.achados().length >= 4);
  protected readonly mostrarFiltros = computed(() => this.achados().length >= 6);
  /** A espinha só ajuda a navegar quando há mais de um lugar para ir. */
  protected readonly mostrarCapitulos = computed(() => {
    const e = this.espinha();
    return e.capitulos.length + (e.semCapitulo > 0 ? 1 : 0) >= 2;
  });

  protected readonly soltas = computed(() => this.itens().filter((a) => a.degree === 0));

  protected readonly porcentagemSoltas = computed(() => {
    const total = this.achados().length;
    return total ? Math.round((this.soltas().length / total) * 100) : 0;
  });

  /**
   * A espinha: os capítulos na ordem em que apareceram, com contagem e a marca de peça solta.
   * "Sem capítulo" fica sempre no fim — é o estado de uma página sem cabeçalho, não um lugar
   * da história.
   */
  protected readonly espinha = computed(() => {
    const ordem: string[] = [];
    const contagem = new Map<string, number>();
    const comSolta = new Set<string>();
    let semCapitulo = 0;
    let semCapituloSolta = false;

    for (const a of this.itens()) {
      if (!a.chapter) {
        semCapitulo++;
        if (a.degree === 0) semCapituloSolta = true;
        continue;
      }
      if (!contagem.has(a.chapter)) ordem.push(a.chapter);
      contagem.set(a.chapter, (contagem.get(a.chapter) ?? 0) + 1);
      if (a.degree === 0) comSolta.add(a.chapter);
    }

    return {
      capitulos: ordem.map((nome) => ({
        nome,
        total: contagem.get(nome)!,
        solta: comSolta.has(nome),
      })),
      semCapitulo,
      semCapituloSolta,
    };
  });

  protected readonly capitulosDaEspinha = computed(() => {
    const todos = this.espinha().capitulos;
    if (this.capitulosAbertos() || todos.length <= CAPITULOS_VISIVEIS + 1) return todos;
    // O capítulo escolhido não pode sumir atrás do "+ N capítulos".
    const visiveis = todos.slice(0, CAPITULOS_VISIVEIS);
    const escolhido = todos.find((c) => c.nome === this.capitulo());
    return escolhido && !visiveis.includes(escolhido) ? [...visiveis, escolhido] : visiveis;
  });

  protected readonly capitulosEscondidos = computed(
    () => this.espinha().capitulos.length - this.capitulosDaEspinha().length,
  );

  /** Os achados do capítulo e dos filtros de tipo e de peça solta — antes da busca. */
  private readonly doRecorte = computed(() => {
    const capitulo = this.capitulo();
    const tipo = this.filtroTipo();
    const soSoltas = this.soSoltas();
    return this.itens().filter(
      (a) =>
        (capitulo === null || (a.chapter ?? '') === capitulo) &&
        (tipo === 'todos' || a.kind === tipo) &&
        (!soSoltas || a.degree === 0),
    );
  });

  private readonly queBatem = computed(() => {
    const q = this.busca();
    return this.doRecorte().filter((a) => contem(`${a.title}\n${a.body}`, q));
  });

  protected readonly buscando = computed(() => this.busca().trim().length > 0);

  /** "4 de 18" — quantos bateram, sobre quantos havia no recorte. */
  protected readonly contagemDaBusca = computed(
    () => `${this.queBatem().length} de ${this.doRecorte().length}`,
  );

  protected readonly naoBateram = computed(() => {
    if (!this.buscando()) return [];
    const batem = new Set(this.queBatem().map((a) => a.id));
    return this.doRecorte().filter((a) => !batem.has(a.id));
  });

  protected readonly fichas = computed(() => {
    const lista =
      this.buscando() && this.mostrarOsOutros()
        ? [...this.queBatem(), ...this.naoBateram()]
        : this.queBatem();
    return lista.slice(0, this.limite()).map((a) => ({
      ...a,
      trecho: janela(a.body, this.busca()),
    }));
  });

  protected readonly restantes = computed(() => {
    const total =
      this.buscando() && this.mostrarOsOutros() ? this.doRecorte().length : this.queBatem().length;
    return Math.max(0, total - this.limite());
  });

  protected readonly rotuloDoCapitulo = computed(() => {
    const c = this.capitulo();
    return c === null ? null : c || SEM_CAPITULO;
  });

  /** Os fios da ficha acesa, lidos a partir dela. */
  protected readonly fiosDaSelecionada = computed(() => {
    const id = this.selecionadoId();
    return id === null ? [] : ligacoesVistasDe(id, this.ligacoes(), this.porId());
  });

  // ─── Detalhe ───────────────────────────────────────────────────────────────

  protected readonly detalhe = computed(() => {
    const id = this.detalheId();
    return id === null ? null : (this.porId().get(id) ?? null);
  });

  protected readonly ligacoesDoDetalhe = computed(() => {
    const d = this.detalhe();
    return d ? ligacoesVistasDe(d.id, this.ligacoes(), this.porId()) : [];
  });

  protected readonly rotuloLigacoesDoDetalhe = computed(() => {
    const n = this.ligacoesDoDetalhe().length;
    return n === 0 ? 'nenhuma ligação' : n === 1 ? '1 ligação' : `${n} ligações`;
  });

  protected readonly sugestoes = computed(() => {
    const d = this.detalhe();
    return d ? sugestoesPara(d.id, this.achados(), this.ligacoes()) : null;
  });

  /**
   * Os achados que dá para ligar ao do detalhe: todos menos ele, filtrados pela busca. O
   * escolhido fica sempre na lista, mesmo que a busca mude — senão a escolha some da tela
   * e continua valendo.
   */
  protected readonly candidatos = computed(() => {
    const d = this.detalhe();
    const q = this.ligadorBusca();
    const escolhido = this.ligadorEscolhido();
    const lista = this.itens()
      .filter((a) => a.id !== d?.id)
      .filter((a) => a.id === escolhido || contem(a.title, q) || (q.trim() && contem(a.body, q)));
    const primeiro = lista.find((a) => a.id === escolhido);
    const resto = lista.filter((a) => a.id !== escolhido).slice(0, primeiro ? 5 : 6);
    return primeiro ? [primeiro, ...resto] : resto;
  });

  /** No celular a folha mostra três relações e recolhe as outras duas. */
  protected readonly relacoesDaFolha = computed(() => {
    if (!this.celular() || this.ligadorTodasRelacoes()) return LIGACOES;
    const principais = LIGACOES.filter((r) =>
      ['SAME_SUBJECT', 'CONTRADICTS', 'HAPPENS_BEFORE'].includes(r.key),
    );
    const escolhida = LIGACOES.find((r) => r.key === this.ligadorTipo());
    return escolhida && !principais.includes(escolhida) ? [...principais, escolhida] : principais;
  });

  // ─── Fio (celular) ─────────────────────────────────────────────────────────

  /**
   * O achado de onde o fio parte. Sem escolha, é o primeiro que tem ligação — abrir o fio
   * numa peça solta mostraria "esta peça está solta" para quem tem dez ligações.
   */
  protected readonly fio = computed(() => {
    const escolhido = this.fioEscolhido();
    const itens = this.itens();
    const achado =
      (escolhido !== null ? this.porId().get(escolhido) : undefined) ??
      itens.find((a) => a.degree > 0) ??
      itens[0];
    if (!achado) return null;
    const vizinhos = ligacoesVistasDe(achado.id, this.ligacoes(), this.porId());
    return {
      ...achado,
      vizinhos,
      rotulo:
        vizinhos.length === 0
          ? 'ligado a nenhum achado'
          : vizinhos.length === 1
            ? 'ligado a 1 achado'
            : `ligado a ${vizinhos.length} achados`,
    };
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
    () => this.formTexto().trim().length > 0 && !this.salvando(),
  );

  protected readonly contagemDoTexto = computed(() =>
    this.formTexto().length.toLocaleString('pt-BR'),
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

  // ─── Filtros ───────────────────────────────────────────────────────────────

  protected escolherCapitulo(capitulo: string | null): void {
    this.capitulo.set(capitulo);
    this.recomecarGrade();
  }

  protected escolherTipoDoFiltro(tipo: StoryFindingKind | 'todos'): void {
    this.filtroTipo.set(tipo);
    this.recomecarGrade();
  }

  protected alternarSoltas(): void {
    this.soSoltas.update((v) => !v);
    this.recomecarGrade();
  }

  protected buscar(valor: string): void {
    this.busca.set(valor);
    this.recomecarGrade();
  }

  protected mostrarMais(): void {
    this.limite.update((n) => n + FICHAS_POR_VEZ);
  }

  private recomecarGrade(): void {
    this.limite.set(FICHAS_POR_VEZ);
    this.mostrarOsOutros.set(false);
    this.selecionadoId.set(null);
  }

  protected verAsSoltas(): void {
    this.soSoltas.set(true);
    this.capitulo.set(null);
    this.visao.set('arquivo');
    this.recomecarGrade();
  }

  // ─── Navegação ─────────────────────────────────────────────────────────────

  protected irParaVisaoGeral(): void {
    this.gravarAnotacaoPendente();
    this.ligadorAberto.set(false);
    this.tela.set('visao-geral');
    this.rolarParaCima();
  }

  protected mostrarVisao(visao: Visao): void {
    this.visao.set(visao);
    this.selecionadoId.set(null);
  }

  /** Um toque acende a ficha e mostra os fios dela; o segundo, na mesma, a abre. */
  protected tocarFicha(id: number): void {
    if (this.selecionadoId() === id) {
      this.abrirAchado(id);
    } else {
      this.selecionadoId.set(id);
    }
  }

  protected abrirAchado(id: number): void {
    this.gravarAnotacaoPendente();
    this.detalheId.set(id);
    this.fioEscolhido.set(id);
    this.anotacao.set(this.porId().get(id)?.note ?? '');
    this.anotacaoEstado.set('');
    this.ligadorAberto.set(false);
    this.tela.set('detalhe');
    this.rolarParaCima();
  }

  /** Abre o achado já com a folha de ligar à mostra — o "+" da bandeja e das sugestões. */
  protected ligarAPartirDe(id: number, alvo: number | null = null): void {
    this.abrirAchado(id);
    this.abrirLigador(alvo);
  }

  /** O botão de cada passo do "como funciona". */
  protected agirPeloGuia(passo: PassoDoGuia): void {
    if (passo === 'registrar') this.irParaRegistrar();
    else if (passo === 'montar') this.montarLore();
    else {
      const origem = this.soltas()[0] ?? this.itens()[0];
      if (origem) this.ligarAPartirDe(origem.id);
    }
  }

  protected ligarAProximaSolta(): void {
    const primeira = this.soltas()[0];
    if (primeira) this.ligarAPartirDe(primeira.id);
  }

  protected seguirFio(id: number): void {
    this.fioEscolhido.set(id);
  }

  // ─── Registrar / editar ────────────────────────────────────────────────────

  /**
   * A faixa de colar. O texto colado leva direto ao registro, com o texto já no lugar — o
   * tipo e o capítulo vêm depois, como a faixa promete.
   *
   * <p>O colar é interceptado, e não lido do campo: a faixa é uma linha só, e um `input`
   * comeria as quebras de linha que a tela de registro promete preservar.
   */
  protected colarNaFaixa(evento: ClipboardEvent): void {
    const texto = evento.clipboardData?.getData('text') ?? '';
    if (!texto.trim()) return;
    evento.preventDefault();
    this.faixa.set('');
    this.irParaRegistrar(texto);
  }

  protected registrarDaFaixa(): void {
    const texto = this.faixa();
    this.faixa.set('');
    this.irParaRegistrar(texto);
  }

  protected irParaRegistrar(textoColado = ''): void {
    this.editandoId.set(null);
    const rascunho = textoColado ? null : this.lerRascunho();
    this.formTipo.set(rascunho?.tipo ?? 'NOTE');
    this.formTitulo.set(rascunho?.titulo ?? '');
    this.formTexto.set(textoColado || rascunho?.texto || '');
    this.formQuemFala.set(rascunho?.quemFala ?? '');
    // Vem preenchido com o último capítulo: numa sessão de jogo a pessoa registra vários
    // achados do mesmo lugar, um atrás do outro. Com um capítulo escolhido na espinha, é
    // ele — "cai no capítulo em que você está".
    this.formCapitulo.set(
      rascunho?.capitulo ?? this.capitulo() ?? this.sugestoesDeCapitulo()[0] ?? '',
    );
    this.rascunhoGuardado.set(!!rascunho);
    this.tela.set('registrar');
    if (textoColado) this.guardarRascunho();
    this.rolarParaCima();
  }

  protected irParaEditar(): void {
    const d = this.detalhe();
    if (!d) return;
    this.gravarAnotacaoPendente();
    this.editandoId.set(d.id);
    this.formTipo.set(d.kind);
    this.formTitulo.set(d.title);
    this.formTexto.set(d.body);
    this.formCapitulo.set(d.chapter ?? '');
    this.formQuemFala.set(d.speaker ?? '');
    this.rascunhoGuardado.set(false);
    this.tela.set('registrar');
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
      title: this.formTitulo().trim() || tituloDoTexto(this.formTexto()),
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
          this.rascunhoGuardado.set(false);
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
          if (this.selecionadoId() === d.id) this.selecionadoId.set(null);
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

  protected abrirLigador(alvo: number | null = null): void {
    this.ligadorBusca.set('');
    this.ligadorEscolhido.set(alvo);
    this.ligadorTipo.set('SAME_SUBJECT');
    this.ligadorPorque.set('');
    this.ligadorTodasRelacoes.set(false);
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

  // ─── Montar lore ───────────────────────────────────────────────────────────

  protected montarLore(comAchado: number | null = null): void {
    this.gravarAnotacaoPendente();
    this.montarCom.set(comAchado === null ? [] : [comAchado]);
    this.tela.set('montar');
    this.rolarParaCima();
  }

  // ─── Apoio ─────────────────────────────────────────────────────────────────

  protected corDaRelacao(kind: StoryLinkKind): 'ouro' | 'brasa' | 'neutra' {
    return kind === 'CONTRADICTS' ? 'brasa' : kind === 'SAME_SUBJECT' ? 'ouro' : 'neutra';
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
  // Só do registro novo, e só neste navegador: é o que o desenho promete ("sair não perde o
  // que foi colado") para quem fecha a aba no meio de uma cutscene longa.

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
      this.rascunhoGuardado.set(this.formTexto().trim().length > 0);
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
