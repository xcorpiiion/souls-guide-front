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
import { NavigationExtras, Router } from '@angular/router';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { Observable, map, switchMap } from 'rxjs';
import { ToastService } from '@xcorpiiion/ui';
import type { StoryLinkDTO } from '@xcorpiiion/canonico';
import { CreateLoreRequest, LoreService } from '../../../core/services/lore.service';
import { PersonalLoreService } from '../../../core/services/personal-lore.service';
import { LoreApi } from '../../../shared/models/lore-article.model';
import { AchadoDaTela, LIGACAO_POR_CHAVE, contem, tipoDe } from '../arquivo.model';
import {
  Bloco,
  juntarTextosVizinhos,
  lerBlocos,
  origemDe,
  origemSemPessoas,
  serializar,
} from './blocos';
import { pessoasDaLore } from '../../../shared/utils/citacao-da-lore';

type Passo = 1 | 2 | 3;
type Envio = 'publicar' | 'rascunho' | null;

/**
 * Montar uma lore com o arquivo: escolher os achados, ordenar o fio, escrever entre as
 * citações e publicar. É o único jeito de escrever lore no site — criar e editar (ADR 0008).
 *
 * <h2>O que sai do arquivo, e o que não sai</h2>
 * Uma lore publicada é pública. O que a pessoa escolhe aqui vira <b>citação</b> dentro do
 * texto do artigo: o texto do achado, o título e o capítulo. A anotação dela não entra, e os
 * achados que não foram citados continuam só dela — a tela diz isso item por item antes do
 * botão de publicar.
 *
 * <h2>Por que a citação é texto, e não referência</h2>
 * O artigo guarda uma cópia do trecho, e não o id do achado (ADR 0007). A citação sai como
 * bloco de citação do markdown (`> `), que a página do artigo já desenha.
 *
 * <h2>Editar</h2>
 * Com `artigo`, a tela abre direto na escrita, com o texto salvo lido de volta em blocos
 * (`blocos.ts`). As citações que já estavam lá são <b>fixas</b>: guardam o trecho copiado.
 * Dá para voltar à escolha e acrescentar achados novos, que entram como citação comum.
 *
 * <p>O rascunho é uma lore pessoal e privada. Editá-lo oferece as mesmas duas saídas da
 * criação: guardar de novo, ou publicar — e publicar tira o rascunho do perfil, senão a
 * pessoa ficaria com duas cópias do mesmo texto divergindo.
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
  /** O artigo salvo, quando é edição. */
  readonly artigo = input<LoreApi | null>(null);
  /** O rótulo do "voltar" do topo: a aba diz "meu arquivo"; a página, "voltar". */
  readonly rotuloVoltar = input('meu arquivo');
  /**
   * Para quem é a lore. `perfil` é a que se monta a partir do perfil (`/profile/lore/new`): só a
   * pessoa vê, e o botão principal guarda nele. Editar um rascunho é o mesmo caso.
   */
  readonly destino = input<'comunidade' | 'perfil'>('comunidade');

  readonly voltar = output<void>();

  protected readonly passo = signal<Passo>(1);
  protected readonly busca = signal('');
  /** A ordem de leitura. No passo 1 é a ordem de escolha; o passo 2 a reorganiza. */
  protected readonly escolhidos = signal<number[]>([]);

  protected readonly titulo = signal('');
  protected readonly blocos = signal<Bloco[]>([{ id: 1, kind: 'texto', valor: '' }]);
  private proximoId = 2;
  private esqueletoMontado = false;
  protected readonly enviando = signal<Envio>(null);

  /** O que estava salvo ao abrir, para o aviso de sair sem salvar. */
  private inicial = '';
  private salvo = false;

  protected readonly tipoDe = tipoDe;

  protected readonly editando = computed(() => this.artigo() !== null);
  /** Rascunho é a lore pessoal: guardar de novo, ou publicar. */
  protected readonly editandoRascunho = computed(() => this.artigo()?.isPersonal === true);
  /** A lore é só da pessoa: veio do perfil, ou é um rascunho sendo editado. */
  protected readonly soMinha = computed(
    () => this.destino() === 'perfil' || this.editandoRascunho(),
  );

  ngOnInit(): void {
    const existentes = new Set(this.itens().map((a) => a.id));
    this.escolhidos.set(this.escolhidosIniciais().filter((id) => existentes.has(id)));

    const artigo = this.artigo();
    if (artigo) {
      this.titulo.set(artigo.title);
      this.blocos.set(lerBlocos(artigo.content, () => this.proximoId++));
      this.esqueletoMontado = true;
      this.passo.set(3);
    } else if (this.soMinha() && this.escolhidos().length === 0) {
      // A lore só da pessoa começa do zero: a página em branco, e não a escolha de achados.
      // Citar o arquivo continua possível, pelo "citar do meu arquivo" da escrita.
      this.esqueletoMontado = true;
      this.passo.set(3);
    }
    this.inicial = this.retrato();
  }

  /** Para o guard de rota: há texto que sairia sem ser salvo. */
  temAlteracoes(): boolean {
    return !this.salvo && this.retrato() !== this.inicial;
  }

  private retrato(): string {
    return JSON.stringify([this.titulo(), this.conteudo()]);
  }

  private readonly porId = computed(() => new Map(this.itens().map((a) => [a.id, a])));

  protected readonly visiveis = computed(() => {
    const q = this.busca();
    return this.itens().filter((a) => contem(`${a.title}\n${a.texto}`, q));
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

  /**
   * Os achados que o texto já cita: os escolhidos agora e os que uma citação fixa reconhece
   * pela linha de origem. Sem o segundo, editar ofereceria "inserir citação" de um achado
   * que já está no artigo.
   */
  protected readonly citados = computed(() => {
    const origens = new Set(
      this.blocos()
        .filter((b): b is Extract<Bloco, { kind: 'fixa' }> => b.kind === 'fixa')
        .map((b) => b.origem),
    );
    const ids = new Set<number>();
    for (const b of this.blocos()) if (b.kind === 'citacao') ids.add(b.achadoId);
    for (const a of this.itens()) {
      if (origens.has(origemDe(a)) || origens.has(origemSemPessoas(a))) ids.add(a.id);
    }
    return ids;
  });

  protected readonly totalDeCitacoes = computed(
    () => this.blocos().filter((b) => b.kind !== 'texto').length,
  );

  protected readonly restantes = computed(() =>
    this.ordem().filter((a) => !this.citados().has(a.id)),
  );

  protected readonly conteudo = computed(() => serializar(this.blocos(), this.porId()));

  /** A prévia do "sobre quem": o mesmo que a página de leitura vai tirar do texto. */
  protected readonly pessoas = computed(() => pessoasDaLore(this.conteudo()));

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
    // Editando, a escrita já existe: dá para ir a ela sem escolher nada de novo.
    const semEscolha = this.escolhidos().length === 0;
    if (passo === 2 && semEscolha) return;
    if (passo === 3 && semEscolha && !this.editando() && !this.soMinha()) return;
    if (passo === 3 && !this.esqueletoMontado) {
      // A primeira ida à escrita já traz as citações na ordem do fio, com um parágrafo
      // antes de cada uma. É o esqueleto que a pessoa preenche, e não uma página em branco.
      // Só na primeira: voltar para reordenar e retornar não pode apagar o que foi escrito.
      this.montarEsqueleto();
      this.esqueletoMontado = true;
    } else if (passo === 3 && this.soMinha()) {
      // Na lore só sua a escrita veio primeiro: o que foi escolhido agora entra no fim do texto,
      // em vez de esperar um "inserir citação" por achado.
      this.inserirTodasAsRestantes();
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

  private inserirTodasAsRestantes(): void {
    const novas = this.restantes();
    if (!novas.length) return;
    this.blocos.update((lista) => [
      ...lista,
      ...novas.flatMap((a): Bloco[] => [
        { id: this.proximoId++, kind: 'citacao', achadoId: a.id },
        { id: this.proximoId++, kind: 'texto', valor: '' },
      ]),
    ]);
  }

  protected achado(id: number): AchadoDaTela | undefined {
    return this.porId().get(id);
  }

  // ─── Salvar ────────────────────────────────────────────────────────────────

  private pedido(): CreateLoreRequest {
    const artigo = this.artigo();
    return {
      title: this.titulo().trim(),
      // "Do mundo ou de personagem" saiu da tela: quem a lore cita sai das citações (ADR 0011).
      // O servidor ainda exige o campo, e editar mantém o que a lore antiga já tinha.
      type: artigo?.type === 'CHARACTER' ? 'CHARACTER' : 'WORLD',
      gameId: this.gameId(),
      characterName: artigo?.type === 'CHARACTER' ? (artigo.characterName ?? undefined) : undefined,
      content: this.conteudo(),
      // A escrita não mexe nestes dois; editar não pode apagá-los de quem já os tinha.
      coverImageFileKey: artigo?.coverImageFileKey ?? undefined,
      tags: artigo?.tags?.length ? artigo.tags : undefined,
    };
  }

  /**
   * "Publicar como teoria" na criação e no rascunho; "salvar alterações" numa lore publicada.
   */
  protected publicar(): void {
    if (!this.podePublicar()) return;
    const artigo = this.artigo();
    const pedido = this.pedido();

    let envio$: Observable<LoreApi>;
    let aviso: [string, string];
    if (artigo && !artigo.isPersonal) {
      envio$ = this.loreService.update(String(artigo.id), pedido);
      aviso = ['Alterações salvas', 'A versão anterior continua no histórico.'];
    } else if (artigo) {
      // Rascunho privado sai do perfil ao virar lore; lore pessoal pública é conteúdo de
      // perfil com vida própria, e continua lá.
      const publicada$ = this.loreService.create(pedido);
      envio$ = artigo.isPublic
        ? publicada$
        : publicada$.pipe(
            switchMap((nova) =>
              this.personalLoreService.deletePersonal(String(artigo.id)).pipe(map(() => nova)),
            ),
          );
      aviso = ['Lore publicada', 'Ela nasce como teoria.'];
    } else {
      envio$ = this.loreService.create(pedido);
      aviso = ['Lore publicada', 'Ela nasce como teoria.'];
    }

    this.enviar('publicar', envio$, aviso, (salva) => [['/lore', salva.id]]);
  }

  /** O rascunho é uma lore pessoal e privada: fica no perfil, e só a pessoa vê. */
  protected guardarRascunho(): void {
    if (!this.podePublicar()) return;
    const artigo = this.artigo();
    if (artigo && !artigo.isPersonal) return;

    const { title, type, characterName, content, tags } = this.pedido();
    const envio$ = artigo
      ? this.personalLoreService.updatePersonal(String(artigo.id), {
          title,
          type,
          characterName,
          content,
          tags,
        })
      : this.personalLoreService.createPersonal({
          title,
          type,
          gameId: this.gameId(),
          characterName,
          content,
          isPublic: false,
          allowCopy: false,
        });

    this.enviar(
      'rascunho',
      envio$,
      ['Rascunho guardado', 'Está no seu perfil, visível só para você.'],
      (salva) => [['/profile', 'lore', salva.id], { queryParams: { personal: 'true' } }],
    );
  }

  private enviar(
    qual: Exclude<Envio, null>,
    envio$: Observable<LoreApi>,
    [titulo, texto]: [string, string],
    destino: (salva: LoreApi) => [(string | number)[], NavigationExtras?],
  ): void {
    this.enviando.set(qual);
    envio$.subscribe({
      next: (salva) => {
        this.enviando.set(null);
        this.salvo = true;
        this.toast.success(titulo, texto);
        const [rota, extras] = destino(salva);
        void this.router.navigate(rota, extras);
      },
      error: () => {
        this.enviando.set(null);
        this.toast.error('Não foi possível salvar', 'O texto continua aqui. Tente de novo.');
      },
    });
  }
}
