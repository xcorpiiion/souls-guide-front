import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PfPageLoader } from '@xcorpiiion/ui';
import { AuthService } from '@xcorpiiion/ng-core';
import type { BossDTO } from '@xcorpiiion/canonico';
import { BossService } from '../../core/services/boss.service';
import { StorageService } from '../../core/services/storage.service';
import { SeoService } from '../../core/services/seo.service';
import { naoEncontrado } from '../../shared/utils/http-error';

/**
 * A página de um chefe.
 *
 * Quem chega aqui na maior parte das vezes veio do Google, deslogado, morrendo para o
 * chefe agora, com o celular do lado da TV. A ordem da página é a ordem da pressa: onde
 * fica, como matar, fases, drops, guias — e a lore por último, recolhida.
 *
 * Sem abas de propósito: aba esconde metade do conteúdo de quem chegou pela busca, e a
 * página é renderizada no servidor — o que está numa aba fechada não vira preview de link.
 */
@Component({
  selector: 'app-boss-detail',
  imports: [RouterLink, PfPageLoader],
  templateUrl: './boss-detail.html',
  styleUrl: './boss-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BossDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly bossService = inject(BossService);
  private readonly storage = inject(StorageService);
  private readonly seo = inject(SeoService);
  private readonly auth = inject(AuthService);

  private readonly recurso = rxResource({
    params: () => this.route.snapshot.paramMap.get('id') ?? '',
    stream: ({ params: id }) => this.bossService.get(id),
  });

  protected readonly loading = this.recurso.isLoading;

  /**
   * Nunca `recurso.value` direto: `value()` lança quando o recurso está em erro, e o
   * `@if (boss(); as b)` do template estouraria justamente no caminho em que a página
   * deveria dizer "chefe não encontrado".
   */
  protected readonly boss = computed(() => (this.recurso.hasValue() ? this.recurso.value() : null));

  protected readonly error = computed(() => {
    const err = this.recurso.error();
    if (!err) return null;
    return naoEncontrado(err) ? 'Chefe não encontrado.' : 'Não foi possível carregar.';
  });

  protected readonly imagem = computed(() => {
    const key = this.boss()?.imageFileKey;
    return key ? this.storage.previewUrl(key) : null;
  });

  protected readonly loreAberta = signal(false);

  protected readonly logado = computed(() => this.auth.isLoggedIn());

  /** O cabeçalho é aplicado quando o dado chega, não na iniciação — senão o crawler lê "Carregando". */
  constructor() {
    effect(() => {
      const boss = this.boss();
      if (boss) {
        this.aplicarSeo(boss);
        return;
      }
      if (this.error()) {
        this.seo.aplicar({
          titulo: 'Chefe não encontrado',
          descricao: 'Este chefe não existe ou foi removido.',
          indexavel: false,
        });
      }
    });
  }

  protected alternarLore(): void {
    this.loreAberta.update((v) => !v);
  }

  /**
   * Marca o chefe como derrotado antes de o servidor confirmar, e desfaz se ele recusar.
   *
   * A escrita otimista continua valendo com o `resource`: `rxResource` devolve um recurso
   * **gravável**, então o valor local é trocado por `recurso.set()` e devolvido no
   * `error`. O que não dá é escrever no `computed` acima — ele é derivado, e a origem do
   * dado é o recurso.
   */
  protected alternarDerrotado(): void {
    const boss = this.boss();
    if (!boss || !this.logado()) return;

    const alvo = !boss.viewerHasDefeated;
    this.recurso.set({ ...boss, viewerHasDefeated: alvo });

    const chamada = alvo
      ? this.bossService.marcarDerrotado(boss.id)
      : this.bossService.desmarcarDerrotado(boss.id);

    chamada.subscribe({
      error: () => this.recurso.set({ ...boss, viewerHasDefeated: !alvo }),
    });
  }

  /**
   * A descrição do buscador sai de onde o chefe fica, e não da lore.
   *
   * Quem pesquisa "como matar X" quer confirmar em uma linha que caiu na página certa —
   * lore no snippet gasta o espaço com o que essa pessoa não veio ler.
   */
  private aplicarSeo(boss: BossDTO): void {
    const onde = boss.location?.trim();
    const papel = boss.mandatory ? 'chefe obrigatório' : 'chefe opcional';

    this.seo.aplicar({
      titulo: `${boss.name} — ${boss.gameName}`,
      descricao: onde
        ? `${boss.name}, ${papel} de ${boss.gameName}. ${onde}`
        : `Como derrotar ${boss.name} em ${boss.gameName}: fraquezas, o que funciona e o que evitar.`,
    });
  }
}
