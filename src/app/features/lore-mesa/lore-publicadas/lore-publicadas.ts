import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, switchMap } from 'rxjs';
import { AuthService } from '@xcorpiiion/ng-core';
import { LoreService } from '../../../core/services/lore.service';
import { LoreSummary } from '../../../shared/models/lore-article.model';
import { ICONE_DO_TIPO } from '../../../shared/utils/citacao-da-lore';

const POR_VEZ = 10;

interface Pedido {
  readonly q: string;
  readonly pagina: number;
}

/**
 * A aba "publicadas" da mesa: as lores da comunidade, para ler. Ver ADR 0010.
 *
 * <p><b>Lista, e não grade de cartões iguais.</b> A grade era o formato de blog que o brief
 * pediu para não repetir, e ela escondia o que distingue uma lore montada com o arquivo: as
 * citações. Cada linha mostra o primeiro parágrafo escrito e a primeira citação como trecho
 * de jogo, em mono — a lore se lê pelo que ela cita.
 *
 * <p><b>O jogo é da mesa.</b> O filtro de jogo que a lista antiga tinha repetia o que já está
 * no topo, e os dois podiam discordar.
 *
 * <p>"Mostrar mais" no lugar de página numerada: numa lista de leitura, quem desce quer
 * continuar lendo, não pular para a página 4.
 */
@Component({
  selector: 'app-lore-publicadas',
  imports: [RouterLink],
  templateUrl: './lore-publicadas.html',
  styleUrl: './lore-publicadas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LorePublicadas implements OnInit {
  private readonly lore = inject(LoreService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);

  /** O id numérico do jogo; o filtro do servidor recusa o slug. `null` é "todos os jogos". */
  readonly jogoId = input<string | null>(null);
  readonly jogoNome = input<string | null>(null);

  /** Pedido de ir ao arquivo, para o estado vazio. */
  readonly irAoArquivo = output<void>();

  protected readonly busca = signal('');
  protected readonly lores = signal<LoreSummary[]>([]);

  /**
   * "Sobre quem", no lugar de mundo/personagem: os nomes que as lores carregadas citam, dos mais
   * citados para os menos. Sai das citações, então não depende de alguém ter marcado à mão.
   */
  protected readonly pessoas = computed(() => {
    const vezes = new Map<string, { nome: string; vezes: number }>();
    for (const l of this.lores()) {
      for (const nome of l.resumo?.pessoas ?? []) {
        const chave = nome.toLocaleLowerCase('pt-BR');
        const atual = vezes.get(chave);
        vezes.set(chave, { nome: atual?.nome ?? nome, vezes: (atual?.vezes ?? 0) + 1 });
      }
    }
    return [...vezes.values()].sort((a, b) => b.vezes - a.vezes).slice(0, 12);
  });

  /** Filtra o que já veio: o servidor não sabe quem uma citação cita. */
  protected readonly pessoa = signal<string | null>(null);

  protected readonly visiveis = computed(() => {
    const alvo = this.pessoa()?.toLocaleLowerCase('pt-BR');
    if (!alvo) return this.lores();
    return this.lores().filter((l) =>
      (l.resumo?.pessoas ?? []).some((p) => p.toLocaleLowerCase('pt-BR') === alvo),
    );
  });
  protected readonly total = signal(0);
  protected readonly carregando = signal(true);
  protected readonly falhou = signal(false);
  private pagina = 0;

  private readonly pedidos$ = new Subject<Pedido>();

  ngOnInit(): void {
    this.pedidos$
      .pipe(
        debounceTime(200),
        switchMap((p) => {
          this.carregando.set(true);
          this.falhou.set(false);
          return this.lore.list(
            p.pagina,
            POR_VEZ,
            p.q.trim() || undefined,
            this.jogoId() ?? undefined,
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (pagina) => {
          this.lores.update((atual) =>
            this.pagina === 0 ? pagina.content : [...atual, ...pagina.content],
          );
          this.total.set(pagina.totalElements ?? pagina.content.length);
          this.carregando.set(false);
        },
        error: () => {
          this.falhou.set(true);
          this.carregando.set(false);
        },
      });
    this.pedir(0);
  }

  protected buscar(q: string): void {
    this.busca.set(q);
    this.pedir(0);
  }

  protected escolherPessoa(nome: string | null): void {
    this.pessoa.update((atual) => (atual === nome ? null : nome));
  }

  protected mostrarMais(): void {
    this.pedir(this.pagina + 1);
  }

  protected tentarDeNovo(): void {
    this.pedir(this.pagina);
  }

  protected ehMinha(l: LoreSummary): boolean {
    const eu = this.auth.isLoggedIn() ? this.auth.userId() : null;
    return !!eu && String(l.userId) === String(eu);
  }

  protected rotuloDoStatus(status: string): string {
    return status === 'CANONICO' ? 'canônica' : status === 'CONSOLIDADO' ? 'consolidada' : 'teoria';
  }

  protected buscando(): boolean {
    return this.busca().trim().length > 0 || this.pessoa() !== null;
  }

  protected readonly iconeDoTipo = ICONE_DO_TIPO;

  private pedir(pagina: number): void {
    this.pagina = pagina;
    this.pedidos$.next({ q: this.busca(), pagina });
  }
}
