import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '@xcorpiiion/ng-core';
import { LoreVersionService, LoreVersion } from '../../core/services/lore-version.service';
import { LoreService } from '../../core/services/lore.service';
import { LoreApi } from '../../shared/models/lore-article.model';
import { ToastService } from '@xcorpiiion/ui';
import { PfPageLoader } from '@xcorpiiion/ui';

/**
 * O histórico de uma lore. Todos leem; só o autor volta a uma versão anterior (ADR 0034 do
 * souls-guide-api). A votação para reverter saiu: com a lore só do autor, ela seria outras
 * pessoas desfazendo o texto de quem escreveu.
 */
@Component({
  selector: 'app-lore-history',
  imports: [RouterLink, PfPageLoader],
  templateUrl: './lore-history.html',
  styleUrl: './lore-history.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoreHistory implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly versionService = inject(LoreVersionService);
  private readonly loreService = inject(LoreService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly loreId =
    this.route.snapshot.paramMap.get('loreId') ?? this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly handle = this.route.snapshot.paramMap.get('handle') ?? '';
  protected readonly context: 'community' | 'profile' | 'usuario' =
    this.route.snapshot.url[0]?.path === 'profile'
      ? 'profile'
      : this.route.snapshot.paramMap.has('handle')
        ? 'usuario'
        : 'community';

  protected readonly versions = signal<LoreVersion[]>([]);
  protected readonly loading = signal(true);
  protected readonly reverting = signal<number | null>(null);
  private readonly artigo = signal<LoreApi | null>(null);

  protected readonly current = computed(
    () => this.versions().find((v) => v.status === 'current') ?? null,
  );

  /** A mesma conta da página da lore: na de perfil o dono é quem guarda; na outra, quem escreveu. */
  protected readonly ehAutor = computed(() => {
    const a = this.artigo();
    if (!a || !this.authService.isLoggedIn()) return false;
    const eu = String(this.authService.userId());
    return a.isPersonal ? String(a.ownerId) === eu : String(a.userId) === eu;
  });

  ngOnInit(): void {
    this.versionService.list(this.loreId).subscribe({
      next: (list) => {
        this.versions.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
    // Sem o artigo, ninguém é autor: o botão de reverter fica escondido, que é o lado seguro.
    this.loreService.get(this.loreId).subscribe({
      next: (a) => this.artigo.set(a),
      error: () => this.artigo.set(null),
    });
  }

  protected revert(version: LoreVersion): void {
    if (!this.ehAutor()) return;
    this.reverting.set(version.versionNumber);
    this.versionService.revert(this.loreId, version.versionNumber).subscribe({
      next: (newVersion) => {
        this.versions.update((list): LoreVersion[] => [
          ...list.map((v) => (v.status === 'current' ? { ...v, status: 'active' as const } : v)),
          newVersion,
        ]);
        this.reverting.set(null);
        this.toast.success(
          'Versão restaurada',
          `Nova versão criada a partir da v${version.versionNumber}.`,
        );
      },
      error: (err) => {
        this.reverting.set(null);
        if (err.status === 400) {
          this.toast.error('Não permitido', 'Não é possível reverter para esta versão.');
        } else if (err.status === 403) {
          this.toast.error('Não permitido', 'Só o autor altera esta lore.');
        } else if (err.status === 404) {
          this.toast.error('Não encontrado', 'Versão não encontrada.');
        } else {
          this.toast.error('Erro', 'Não foi possível reverter. Tente novamente.');
        }
      },
    });
  }

  protected initials(nickname: string): string {
    return nickname.slice(0, 2).toUpperCase();
  }

  protected formatDate(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 60) return `há ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `há ${h}h`;
    const d = Math.floor(h / 24);
    return `há ${d} dia${d > 1 ? 's' : ''}`;
  }
}
