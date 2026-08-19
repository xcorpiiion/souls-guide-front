import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { PfPageLoader } from '@xcorpiiion/ui';
import type { ItemDTO } from '@xcorpiiion/canonico';
import { ItemService } from '../../core/services/item.service';
import { StorageService } from '../../core/services/storage.service';
import { SeoService } from '../../core/services/seo.service';
import { ITEM_TYPE_LABEL } from '../../shared/models/item.model';

/**
 * A página de um item.
 *
 * Existe separada da listagem por causa da busca de fora: "onde achar tal talismã" é o que
 * traz gente ao site, e o que responde a isso é uma página por item — uma listagem
 * filtrável não aparece no resultado.
 */
@Component({
  selector: 'app-item-detail',
  imports: [RouterLink, PfPageLoader],
  templateUrl: './item-detail.html',
  styleUrl: './item-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly itemService = inject(ItemService);
  private readonly storage = inject(StorageService);
  private readonly seo = inject(SeoService);

  protected readonly typeLabel = ITEM_TYPE_LABEL;

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly item = signal<ItemDTO | null>(null);
  protected readonly imagem = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';

    this.itemService.get(id).subscribe({
      next: (item) => {
        this.item.set(item);
        this.imagem.set(item.imageFileKey ? this.storage.previewUrl(item.imageFileKey) : null);
        this.aplicarSeo(item);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.status === 404 ? 'Item não encontrado.' : 'Não foi possível carregar.');
        this.seo.aplicar({
          titulo: 'Item não encontrado',
          descricao: 'Este item não existe ou foi removido.',
          indexavel: false,
        });
        this.loading.set(false);
      },
    });
  }

  /**
   * A descrição prioriza **onde encontrar**, e não o texto do item.
   *
   * É a pergunta que traz a pessoa da busca: quem procura "onde achar o talismã do lobo"
   * quer o lugar, e o resultado do Google mostra a descrição — não a página inteira.
   */
  private aplicarSeo(item: ItemDTO): void {
    const tipo = this.typeLabel[item.type ?? 'OTHER'];
    const onde = item.location ? `Onde encontrar: ${item.location}.` : '';
    const guia = item.foundAtQuestTitle ? ` Aparece no guia ${item.foundAtQuestTitle}.` : '';

    this.seo.aplicar({
      titulo: `${item.name} · ${item.gameName ?? 'itens'}`,
      descricao: `${onde}${guia}`.trim() || `${item.name} — ${tipo} de ${item.gameName ?? ''}.`,
      imagem: item.imageFileKey ? this.storage.previewUrl(item.imageFileKey) : null,
      tipo: 'article',
    });
  }
}
