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
  StoryArchiveSpace,
  StoryCharacterDTO,
  StoryCharacterRequest,
  StoryFindingDTO,
  StoryFindingKind,
  StoryLinkDTO,
  StoryLinkKind,
} from '@xcorpiiion/canonico';
import { StoryArchiveService } from '../../core/services/story-archive.service';
import {
  AchadoDaTela,
  ELENCO_POR_CHAVE,
  LIGACOES,
  SEM_CAPITULO,
  TIPOS,
  USO_DO_TIPO,
  contem,
  decorar,
  janela,
  ligacoesVistasDe,
  candidatosDaLigacao,
  sugestoesPara,
  tipoDe,
  tituloDoTexto,
  trechos,
} from './arquivo.model';
import { MontarLore } from './montar-lore/montar-lore';
import { GuiaDoArquivo, PassoDoGuia } from './guia-do-arquivo/guia-do-arquivo';
import { EscolherElenco, NovoNoElenco } from './escolher-elenco/escolher-elenco';
import { EditorDeFalas, FalaDoForm, novaFala } from './editor-de-falas/editor-de-falas';
import { FichaDoPersonagem } from './ficha-do-personagem/ficha-do-personagem';

type Tela = 'visao-geral' | 'registrar' | 'detalhe' | 'montar' | 'personagem';

/** Onde entra quem acabou de ser cadastrado pelo nome digitado no formulário. */
type CampoDoElenco = 'autor' | 'presentes';

/** Quantas fichas a grade mostra antes de pedir "mostrar mais". */
const FICHAS_POR_VEZ = 24;
/** Quantos capítulos a espinha lista antes de recolher o resto. */
const CAPITULOS_VISIVEIS = 9;

/**
 * O arquivo pessoal de achados de um jogo — a aba "meu arquivo". Ver ADR 0032 do
 * souls-guide-api, e o artboard `Meu arquivo - redesenho.dc.html` ("A mesa").
 *
 * <p><b>O capítulo é a espinha</b>, fixa à esquerda; o achado é uma <b>ficha</b> com o texto do
 * jogo à vista; e a ligação vive dentro da própria ficha, que é o único lugar onde ela
 * aparece (não há tela de ligações). No
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
  imports: [
    RouterLink,
    NgTemplateOutlet,
    MontarLore,
    GuiaDoArquivo,
    EscolherElenco,
    EditorDeFalas,
    FichaDoPersonagem,
  ],
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
  /**
   * Qual dos dois arquivos da pessoa (ADR 0035 do souls-guide-api): o da mesa de `/lore` ou o
   * do perfil. A tela é a mesma; o que se registra num não aparece no outro.
   */
  readonly espaco = input<StoryArchiveSpace>('COMMUNITY');

  protected readonly tipos = TIPOS;
  protected readonly relacoes = LIGACOES;
  protected readonly semCapitulo = SEM_CAPITULO;
  protected readonly trechos = trechos;
  protected readonly tipoDe = tipoDe;
  protected readonly uso = USO_DO_TIPO;

  // ─── Dados ─────────────────────────────────────────────────────────────────
  protected readonly carregando = signal(true);
  protected readonly falhou = signal(false);
  protected readonly achados = signal<StoryFindingDTO[]>([]);
  protected readonly ligacoes = signal<StoryLinkDTO[]>([]);
  /** O elenco do arquivo, em ordem alfabética, como o servidor devolve. ADR 0033. */
  protected readonly elenco = signal<StoryCharacterDTO[]>([]);

  // ─── Navegação dentro da aba ───────────────────────────────────────────────
  protected readonly tela = signal<Tela>('visao-geral');
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
  protected readonly ligadorFiltroTipo = signal<StoryFindingKind | 'todos'>('todos');
  protected readonly ligando = signal(false);

  // ─── Registrar / editar ────────────────────────────────────────────────────
  protected readonly faixa = signal('');
  protected readonly editandoId = signal<number | null>(null);
  protected readonly formTipo = signal<StoryFindingKind>('NOTE');
  protected readonly formTitulo = signal('');
  protected readonly formTexto = signal('');
  protected readonly formCapitulo = signal('');
  protected readonly formQuemFala = signal('');
  /** Quem escreveu (nota e documento). Lista de um só, na forma que o seletor de elenco usa. */
  protected readonly formAutor = signal<number[]>([]);
  protected readonly formData = signal('');
  /** Quem está presente (diálogo e cutscene), ou a criatura descrita. */
  protected readonly formPresentes = signal<number[]>([]);
  protected readonly formFalas = signal<FalaDoForm[]>([]);
  protected readonly salvando = signal(false);

  // ─── Elenco ────────────────────────────────────────────────────────────────
  /** A ficha aberta; `null` na tela de personagem é "cadastrar". */
  protected readonly personagemId = signal<number | null>(null);
  protected readonly salvandoPersonagem = signal(false);
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
    decorar(this.achados(), this.ligacoes(), this.elenco()),
  );

  private readonly porId = computed(() => new Map(this.itens().map((a) => [a.id, a])));

  protected readonly vazio = computed(() => this.achados().length === 0);

  // ─── O que já serve ────────────────────────────────────────────────────────
  // A mesa inteira de uma vez, para quem tem um achado só, é ruído: filtro sem o que filtrar,
  // busca sem o que buscar. Cada controle aparece quando passa a ter uso.

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
    return this.doRecorte().filter((a) => contem(`${a.title}\n${a.texto}`, q));
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
      trecho: janela(a.texto, this.busca()),
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
    return d ? sugestoesPara(d.id, this.itens(), this.ligacoes()) : null;
  });

  /**
   * Os achados que dá para ligar ao do detalhe: todos menos ele, filtrados pela busca. O
   * escolhido fica sempre na lista, mesmo que a busca mude — senão a escolha some da tela
   * e continua valendo.
   */
  /** Todos os outros achados, os prováveis primeiro e o resto por capítulo. Ver arquivo.model. */
  protected readonly candidatos = computed(() => {
    const d = this.detalhe();
    return d
      ? candidatosDaLigacao(
          d.id,
          this.itens(),
          this.ligacoes(),
          this.ligadorBusca(),
          this.ligadorFiltroTipo(),
        )
      : null;
  });

  /** O achado escolhido, para ler inteiro ao lado antes de ligar — sem sair da folha. */
  protected readonly escolhidoParaLigar = computed(() => {
    const id = this.ligadorEscolhido();
    return id === null ? null : (this.itens().find((a) => a.id === id) ?? null);
  });

  /** Só os tipos que existem no arquivo viram filtro na folha. */
  protected readonly tiposNaFolha = computed(() => {
    const presentes = new Set(this.itens().map((a) => a.kind));
    return TIPOS.filter((t) => presentes.has(t.key));
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

  /**
   * O rótulo livre de quem fala é de antes do elenco. Só aparece para editar um achado antigo
   * que o tem — achado novo diz quem fala pelas falas.
   */
  protected readonly mostraQuemFala = computed(
    () =>
      this.formQuemFala().trim().length > 0 &&
      (this.formTipo() === 'DIALOGUE' || this.formTipo() === 'CUTSCENE'),
  );

  protected readonly usoDoForm = computed(() => USO_DO_TIPO[this.formTipo()]);

  /** O que o texto é, em cada tipo. */
  protected readonly rotuloDoTexto = computed(() => {
    switch (this.formTipo()) {
      case 'DIALOGUE':
        return 'contexto';
      case 'CUTSCENE':
        return 'o que acontece';
      case 'CREATURE':
        return 'o que você descobriu';
      default:
        return 'texto';
    }
  });

  private readonly falasComTexto = computed(() => this.formFalas().filter((f) => f.text.trim()));

  /** Texto ou, onde há falas, pelo menos uma fala escrita — a mesma regra do servidor. */
  protected readonly podeSalvar = computed(
    () =>
      (this.formTexto().trim().length > 0 ||
        (this.usoDoForm().falas && this.falasComTexto().length > 0)) &&
      !this.salvando(),
  );

  // ─── Elenco ────────────────────────────────────────────────────────────────

  private readonly nomeDoElenco = computed(() => new Map(this.elenco().map((c) => [c.id, c.name])));

  /** O elenco com quantos achados cada um tem, para a espinha. */
  protected readonly elencoDaEspinha = computed(() => {
    const contagem = new Map<number, number>();
    for (const a of this.achados()) {
      const ids = new Set<number>([
        ...(a.characterIds ?? []),
        ...(a.authorId != null ? [a.authorId] : []),
        ...(a.lines ?? []).map((l) => l.characterId).filter((id): id is number => id != null),
      ]);
      for (const id of ids) contagem.set(id, (contagem.get(id) ?? 0) + 1);
    }
    return this.elenco().map((c) => ({
      ...c,
      icon: ELENCO_POR_CHAVE.get(c.kind)?.icon ?? 'ti ti-user',
      total: contagem.get(c.id) ?? 0,
    }));
  });

  protected readonly personagem = computed(() => {
    const id = this.personagemId();
    return id === null ? null : (this.elenco().find((c) => c.id === id) ?? null);
  });

  /** Ids do elenco com o nome, para os chips do detalhe. Quem saiu do elenco não aparece. */
  protected nomesDe(ids: readonly number[]): { id: number; nome: string }[] {
    const nomes = this.nomeDoElenco();
    return ids.map((id) => ({ id, nome: nomes.get(id) ?? '' })).filter((x) => x.nome);
  }

  protected readonly contagemDoTexto = computed(() =>
    this.formTexto().length.toLocaleString('pt-BR'),
  );

  // ─── Carga ─────────────────────────────────────────────────────────────────

  protected carregar(id = this.gameId()): void {
    this.carregando.set(true);
    this.falhou.set(false);
    this.service.archive(id, this.espaco()).subscribe({
      next: (arquivo) => {
        this.achados.set(arquivo.findings);
        this.ligacoes.set(arquivo.links);
        this.elenco.set(arquivo.characters ?? []);
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
    this.recomecarGrade();
  }

  // ─── Navegação ─────────────────────────────────────────────────────────────

  protected irParaVisaoGeral(): void {
    this.gravarAnotacaoPendente();
    this.ligadorAberto.set(false);
    this.tela.set('visao-geral');
    this.rolarParaCima();
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
    this.formAutor.set(rascunho?.autor ?? []);
    this.formData.set(rascunho?.data ?? '');
    this.formPresentes.set(rascunho?.presentes ?? []);
    this.formFalas.set((rascunho?.falas ?? []).map((f) => novaFala(f)));
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
    this.formAutor.set(d.authorId != null ? [d.authorId] : []);
    this.formData.set(d.inGameDate ?? '');
    this.formPresentes.set([...(d.characterIds ?? [])]);
    this.formFalas.set(
      (d.lines ?? []).map((l) =>
        novaFala({ characterId: l.characterId ?? null, speaker: l.speaker ?? '', text: l.text }),
      ),
    );
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
    // Diálogo nasce com uma fala vazia: sem nenhuma linha, o formulário não diz o que fazer.
    if (tipo === 'DIALOGUE' && this.formFalas().length === 0) this.formFalas.set([novaFala()]);
    this.guardarRascunho();
  }

  protected mudarAutor(ids: number[]): void {
    this.formAutor.set(ids.slice(-1));
    this.guardarRascunho();
  }

  protected mudarPresentes(ids: number[]): void {
    this.formPresentes.set(this.formTipo() === 'CREATURE' ? ids.slice(-1) : ids);
    this.guardarRascunho();
  }

  protected mudarData(valor: string): void {
    this.formData.set(valor);
    this.guardarRascunho();
  }

  /** Quem fala passa a estar presente: escolher nos dois lugares seria trabalho repetido. */
  protected mudarFalas(falas: FalaDoForm[]): void {
    this.formFalas.set(falas);
    const presentes = new Set(this.formPresentes());
    const faltam = falas
      .map((f) => f.characterId)
      .filter((id): id is number => id !== null && !presentes.has(id));
    if (faltam.length) this.formPresentes.set([...presentes, ...new Set(faltam)]);
    this.guardarRascunho();
  }

  /** Alguém digitado no formulário, cadastrado ali mesmo e já escolhido. */
  protected cadastrarPeloFormulario(novo: NovoNoElenco, campo: CampoDoElenco): void {
    this.cadastrarNoElenco({ kind: novo.tipo, name: novo.nome }, (c) => {
      if (campo === 'autor') this.mudarAutor([c.id]);
      else this.mudarPresentes([...this.formPresentes(), c.id]);
    });
  }

  /** O rótulo de uma fala vira alguém do elenco, e as falas com esse rótulo passam a ser dele. */
  protected cadastrarRotulo(nome: string): void {
    this.cadastrarNoElenco({ kind: 'CHARACTER', name: nome }, (c) => {
      const alvo = nome.trim().toLowerCase();
      this.mudarFalas(
        this.formFalas().map((f) =>
          f.characterId === null && f.speaker.trim().toLowerCase() === alvo
            ? { ...f, characterId: c.id, speaker: '' }
            : f,
        ),
      );
    });
  }

  private cadastrarNoElenco(
    request: StoryCharacterRequest,
    depois: (criado: StoryCharacterDTO) => void,
  ): void {
    this.service.addCharacter(this.gameId(), request, this.espaco()).subscribe({
      next: (criado) => {
        this.acrescentarNoElenco(criado);
        depois(criado);
      },
      error: (err: HttpErrorResponse) =>
        this.toast.error(
          'Não foi possível cadastrar',
          err.status === 409
            ? 'Já existe alguém com esse nome no seu elenco.'
            : 'Tente de novo em instantes.',
        ),
    });
  }

  private acrescentarNoElenco(personagem: StoryCharacterDTO): void {
    this.elenco.update((lista) =>
      [...lista.filter((c) => c.id !== personagem.id), personagem].sort((a, b) =>
        a.name.localeCompare(b.name, 'pt-BR'),
      ),
    );
  }

  // ─── Tela do personagem ────────────────────────────────────────────────────

  protected abrirPersonagem(id: number | null): void {
    this.gravarAnotacaoPendente();
    this.personagemId.set(id);
    this.tela.set('personagem');
    this.rolarParaCima();
  }

  protected salvarPersonagem(request: StoryCharacterRequest, ficha: FichaDoPersonagem): void {
    const id = this.personagemId();
    this.salvandoPersonagem.set(true);
    const envio$ =
      id === null
        ? this.service.addCharacter(this.gameId(), request, this.espaco())
        : this.service.updateCharacter(id, request);
    envio$.subscribe({
      next: (salvo) => {
        this.salvandoPersonagem.set(false);
        this.acrescentarNoElenco(salvo);
        this.personagemId.set(salvo.id);
        ficha.terminarEdicao();
        this.toast.success(id === null ? 'No elenco' : 'Ficha atualizada', salvo.name);
      },
      error: (err: HttpErrorResponse) => {
        this.salvandoPersonagem.set(false);
        this.toast.error(
          'Não foi possível salvar',
          err.status === 409
            ? 'Já existe alguém com esse nome no seu elenco.'
            : 'Tente de novo em instantes.',
        );
      },
    });
  }

  protected tirarDoElenco(): void {
    const p = this.personagem();
    if (!p) return;
    this.confirm
      .ask({
        title: 'Tirar do elenco',
        message: `"${p.name}" sai do elenco. Os achados em que aparece continuam, e as falas dele ficam com o nome escrito.`,
        confirmLabel: 'tirar',
        tone: 'danger',
      })
      .pipe(
        filter((ok) => ok),
        switchMap(() => this.service.removeCharacter(p.id)),
      )
      .subscribe({
        next: () => {
          this.elenco.update((lista) => lista.filter((c) => c.id !== p.id));
          // O servidor já desfez presença, autoria e falas; a lista em memória acompanha.
          this.achados.update((lista) =>
            lista.map((a) => ({
              ...a,
              authorId: a.authorId === p.id ? null : a.authorId,
              characterIds: (a.characterIds ?? []).filter((id) => id !== p.id),
              lines: (a.lines ?? []).map((l) =>
                l.characterId === p.id
                  ? { ...l, characterId: null, speaker: l.speaker ?? p.name }
                  : l,
              ),
            })),
          );
          this.personagemId.set(null);
          this.toast.success('Fora do elenco', 'Os achados continuam no arquivo.');
          this.irParaVisaoGeral();
        },
        error: () => this.toast.error('Erro', 'Não foi possível tirar do elenco.'),
      });
  }

  protected salvar(registrarOutro: boolean): void {
    if (!this.podeSalvar()) return;
    this.salvando.set(true);

    const uso = this.usoDoForm();
    const falas = uso.falas ? this.falasComTexto() : [];
    const request = {
      kind: this.formTipo(),
      title:
        this.formTitulo().trim() ||
        tituloDoTexto(this.formTexto().trim() ? this.formTexto() : (falas[0]?.text ?? '')),
      body: this.formTexto(),
      chapter: this.formCapitulo().trim(),
      speaker: this.mostraQuemFala() ? this.formQuemFala().trim() : '',
      authorId: uso.autor ? this.formAutor()[0] : undefined,
      inGameDate: uso.data ? this.formData().trim() : undefined,
      characterIds: uso.presentes ? this.formPresentes() : [],
      lines: falas.map((f) => ({
        characterId: f.characterId ?? undefined,
        speaker: f.characterId === null ? f.speaker.trim() : undefined,
        text: f.text,
      })),
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

    this.service.register(this.gameId(), request, this.espaco()).subscribe({
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
          this.formData.set('');
          // Quem está presente costuma continuar na cena seguinte; as falas, não.
          this.formFalas.set(this.formTipo() === 'DIALOGUE' ? [novaFala()] : []);
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
    this.ligadorFiltroTipo.set('todos');
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
    // O rascunho é de um arquivo: o do perfil não pode abrir com o texto colado para a lore.
    const doPerfil = this.espaco() === 'PROFILE' ? '_perfil' : '';
    return `sg_arquivo_rascunho_${this.gameId()}${doPerfil}`;
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
          autor: this.formAutor(),
          data: this.formData(),
          presentes: this.formPresentes(),
          falas: this.formFalas().map(({ characterId, speaker, text }) => ({
            characterId,
            speaker,
            text,
          })),
        }),
      );
      this.rascunhoGuardado.set(
        this.formTexto().trim().length > 0 || this.falasComTexto().length > 0,
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
    autor?: number[];
    data?: string;
    presentes?: number[];
    falas?: Omit<FalaDoForm, 'chave'>[];
  } | null {
    if (!this.noNavegador) return null;
    try {
      const bruto = localStorage.getItem(this.chaveDoRascunho());
      if (!bruto) return null;
      const r = JSON.parse(bruto);
      // Rascunho sem título nem texto não é rascunho: é o capítulo que ficou de uma sessão
      // anterior, e ele atropelaria o último capítulo do arquivo.
      const temFala = Array.isArray(r?.falas) && r.falas.some((f: { text?: string }) => f.text);
      return r && (r.titulo || r.texto || temFala) ? r : null;
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
