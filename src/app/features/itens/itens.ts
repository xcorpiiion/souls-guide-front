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
import { Subject, debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  private readonly destroyRef = inject(DestroyRef);

  protected readonly typeLabel = ITEM_TYPE_LABEL;
  protected readonly types = ITEM_TYPE_ORDER;

  protected readonly gameId = this.route.snapshot.paramMap.get('id') ?? '';
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

  ngOnInit(): void {
    this.gameService.get(this.gameId).subscribe({
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

    this.itemService.list({ gameId: this.gameId, type: this.tipo(), q: this.busca() }).subscribe({
      next: (page) => {
        this.itens.set(page.content);
        this.total.set(page.totalElements);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
