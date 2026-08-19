import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { PfPageLoader } from '@xcorpiiion/ui';
import { AuthService } from '@xcorpiiion/ng-core';
import type { BossDTO } from '@xcorpiiion/canonico';
import { BossService } from '../../core/services/boss.service';
import { StorageService } from '../../core/services/storage.service';
import { SeoService } from '../../core/services/seo.service';

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
export class BossDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly bossService = inject(BossService);
  private readonly storage = inject(StorageService);
  private readonly seo = inject(SeoService);
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly boss = signal<BossDTO | null>(null);
  protected readonly imagem = signal<string | null>(null);
  protected readonly loreAberta = signal(false);

  protected readonly logado = computed(() => this.auth.isLoggedIn());

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';

    this.bossService.get(id).subscribe({
      next: (boss) => {
        this.boss.set(boss);
        this.imagem.set(boss.imageFileKey ? this.storage.previewUrl(boss.imageFileKey) : null);
        this.aplicarSeo(boss);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.status === 404 ? 'Chefe não encontrado.' : 'Não foi possível carregar.');
        this.seo.aplicar({
          titulo: 'Chefe não encontrado',
          descricao: 'Este chefe não existe ou foi removido.',
          indexavel: false,
        });
        this.loading.set(false);
      },
    });
  }

  protected alternarLore(): void {
    this.loreAberta.update((v) => !v);
  }

  protected alternarDerrotado(): void {
    const boss = this.boss();
    if (!boss || !this.logado()) return;

    const alvo = !boss.viewerHasDefeated;
    this.boss.set({ ...boss, viewerHasDefeated: alvo });

    const chamada = alvo
      ? this.bossService.marcarDerrotado(boss.id)
      : this.bossService.desmarcarDerrotado(boss.id);

    chamada.subscribe({
      error: () => this.boss.set({ ...boss, viewerHasDefeated: !alvo }),
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
