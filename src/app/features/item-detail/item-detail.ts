import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '@xcorpiiion/ng-core';
import { PfPageLoader } from '@xcorpiiion/ui';
import type { ItemDTO } from '@xcorpiiion/canonico';
import { ItemService } from '../../core/services/item.service';
import { StorageService } from '../../core/services/storage.service';
import { SeoService } from '../../core/services/seo.service';
import { ITEM_TYPE_LABEL } from '../../shared/models/item.model';
import { naoEncontrado } from '../../shared/utils/http-error';

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
export class ItemDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly itemService = inject(ItemService);
  private readonly storage = inject(StorageService);
  private readonly seo = inject(SeoService);
  private readonly auth = inject(AuthService);

  protected readonly typeLabel = ITEM_TYPE_LABEL;

  /** Escrever exige token: sem sessão o lápis levaria a uma tela que não salva. */
  protected readonly logado = computed(() => this.auth.isLoggedIn());

  /**
   * A busca do item.
   *
   * Substitui o trio `loading`/`error`/`item` que era escrito e mantido à mão, com o
   * `subscribe` no `ngOnInit` — três signals que precisavam ser apagados na ordem certa
   * nos dois ramos do callback, e um `OnInit` que existia só para disparar a chamada.
   *
   * **Isto sobrevive ao SSR.** O `ResourceImpl` registra um `PendingTask`, e é isso que
   * faz o servidor esperar a resposta antes de serializar o HTML — sem isso o crawler
   * leria a tela de "Carregando", que é exatamente o defeito que o SSR daqui existe para
   * não ter.
   */
  private readonly recurso = rxResource({
    params: () => this.route.snapshot.paramMap.get('id') ?? '',
    stream: ({ params: id }) => this.itemService.get(id),
  });

  protected readonly loading = this.recurso.isLoading;

  /**
   * O valor, ou nulo — e nunca `recurso.value` direto.
   *
   * `value()` **lança** quando o recurso está em erro (`ResourceValueError`), o que é o
   * contrário do signal que estava aqui antes, que ficava em `null`. Aliasar `value` sem
   * guarda faz o `@if (item(); as i)` do template estourar exatamente no caminho em que a
   * página deveria mostrar "item não encontrado" — o erro engolindo a tela de erro.
   */
  protected readonly item = computed(() => (this.recurso.hasValue() ? this.recurso.value() : null));

  protected readonly error = computed(() => {
    const err = this.recurso.error();
    if (!err) return null;
    return naoEncontrado(err) ? 'Item não encontrado.' : 'Não foi possível carregar.';
  });

  protected readonly imagem = computed(() => {
    const key = this.item()?.imageFileKey;
    return key ? this.storage.previewUrl(key) : null;
  });

  /**
   * O cabeçalho é aplicado **quando o dado chega**, e não na iniciação.
   *
   * Montado antes da resposta, o que o crawler lê é "Carregando" — o efeito roda de novo
   * a cada mudança do recurso, que é o que garante a ordem certa sem ninguém orquestrar.
   */
  constructor() {
    effect(() => {
      const item = this.item();
      if (item) {
        this.aplicarSeo(item);
        return;
      }
      if (this.error()) {
        this.seo.aplicar({
          titulo: 'Item não encontrado',
          descricao: 'Este item não existe ou foi removido.',
          indexavel: false,
        });
      }
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
