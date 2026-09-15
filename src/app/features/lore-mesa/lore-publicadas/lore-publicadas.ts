import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
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
import { LoreCategory, LoreSummary } from '../../../shared/models/lore-article.model';

const POR_VEZ = 10;

type Categoria = LoreCategory | '';

interface Pedido {
  readonly q: string;
  readonly categoria: Categoria;
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

  protected readonly categorias: readonly { id: Categoria; rotulo: string }[] = [
    { id: '', rotulo: 'todas' },
    { id: 'WORLD', rotulo: 'do mundo' },
    { id: 'CHARACTER', rotulo: 'de personagem' },
  ];

  protected readonly busca = signal('');
  protected readonly categoria = signal<Categoria>('');
  protected readonly lores = signal<LoreSummary[]>([]);
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
            p.categoria || undefined,
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

  protected escolherCategoria(c: Categoria): void {
    this.categoria.set(c);
    this.pedir(0);
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
    return this.busca().trim().length > 0 || this.categoria() !== '';
  }

  private pedir(pagina: number): void {
    this.pagina = pagina;
    this.pedidos$.next({ q: this.busca(), categoria: this.categoria(), pagina });
  }
}
