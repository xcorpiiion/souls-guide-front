import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, shareReplay, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '@xcorpiiion/ng-core';
import { PfPageLoader } from '@xcorpiiion/ui';
import type { ItemDTO, ItemType } from '@xcorpiiion/canonico';
import { ItemService } from '../../core/services/item.service';
import { GameService } from '../../core/services/game.service';
import { SeoService } from '../../core/services/seo.service';
import { ITEM_TYPE_LABEL, ITEM_TYPE_ORDER } from '../../shared/models/item.model';

@Component({
  selector: 'app-itens',
  imports: [RouterLink, FormsModule, PfPageLoader],
  templateUrl: './itens.html',
  styleUrl: './itens.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Itens implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly itemService = inject(ItemService);
  private readonly gameService = inject(GameService);
  private readonly seo = inject(SeoService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  /** Escrever exige token: para quem não está logado o convite não leva a lugar nenhum. */
  protected readonly logado = computed(() => this.auth.isLoggedIn());

  protected readonly typeLabel = ITEM_TYPE_LABEL;
  protected readonly types = ITEM_TYPE_ORDER;

  /**
   * O que veio na URL é uma **referência**, não um id: `1-lies-of-p`, e num link antigo
   * só `lies-of-p`. Serve para montar link de volta, e é o que o endpoint de jogo sabe
   * resolver — os outros, não.
   */
  protected readonly gameRef = this.route.snapshot.paramMap.get('id') ?? '';

  /**
   * O jogo resolvido, uma vez só.
   *
   * `/items?gameId=` recebe `Long`: mandar a referência da URL responde 400, e foi o que
   * a página fez enquanto passava `gameRef` direto — o nome do jogo carregava e a lista
   * de itens vinha vazia com erro no console. O id numérico só existe depois desta
   * chamada, então a listagem sai dela, e não ao lado dela.
   */
  private readonly jogo$ = this.gameService.get(this.gameRef).pipe(shareReplay(1));

  protected readonly gameName = signal<string>('');

  protected readonly itens = signal<ItemDTO[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);

  protected readonly busca = signal('');
  protected readonly tipo = signal<ItemType | null>(null);

  /**
   * Só a digitação passa por aqui.
   *
   * O clique num filtro e a primeira carga chamam a busca direto: esperar 300 ms por um
   * clique é latência inventada, e na abertura da página seria a tela em branco por um
   * terço de segundo sem motivo.
   */
  private readonly digitou = new Subject<void>();

  protected readonly vazio = computed(() => !this.loading() && this.itens().length === 0);

  /**
   * Vazio porque ninguém cadastrou, e não porque o filtro não achou.
   *
   * A diferença decide o que a tela oferece: sem filtro nenhum aplicado, o que falta é
   * alguém cadastrar — e é aí que cabe o convite. Com filtro, o catálogo pode estar cheio,
   * e um "cadastre o primeiro" seria mentira.
   */
  protected readonly catalogoVazio = computed(
    () => this.vazio() && !this.busca().trim() && this.tipo() === null,
  );

  ngOnInit(): void {
    this.jogo$.subscribe({
      next: (game) => {
        this.gameName.set(game.name);
        this.seo.aplicar({
          titulo: `Itens de ${game.name}`,
          descricao: `Armas, talismãs, consumíveis e chaves de ${game.name} — onde encontrar cada um, ligado ao passo do guia.`,
        });
      },
    });

    this.digitou
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.carregar());

    this.carregar();
  }

  protected buscar(termo: string): void {
    this.busca.set(termo);
    this.loading.set(true);
    this.digitou.next();
  }

  protected filtrarPor(tipo: ItemType | null): void {
    this.tipo.set(tipo);
    this.carregar();
  }

  private carregar(): void {
    this.loading.set(true);

    this.jogo$
      .pipe(
        switchMap((game) =>
          this.itemService.list({
            gameId: String(game.id),
            type: this.tipo(),
            q: this.busca(),
          }),
        ),
      )
      .subscribe({
        next: (page) => {
          this.itens.set(page.content);
          this.total.set(page.totalElements);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}
