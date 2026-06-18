import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LoreVersionService, LoreVersion } from '../../core/services/lore-version.service';
import { ToastService } from '../../shared/components/toast/toast.service';

@Component({
  selector: 'app-lore-history',
  imports: [RouterLink],
  templateUrl: './lore-history.html',
  styleUrl: './lore-history.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoreHistory implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly versionService = inject(LoreVersionService);
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

  protected readonly isLoggedIn = this.authService.isLoggedIn;
  protected readonly versions = signal<LoreVersion[]>([]);
  protected readonly loading = signal(true);
  protected readonly reverting = signal<number | null>(null);
  protected readonly voting = signal(false);

  protected readonly current = computed(
    () => this.versions().find((v) => v.status === 'current') ?? null,
  );

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
  }

  protected revert(version: LoreVersion): void {
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
          this.toast.error(
            'Acesso negado',
            'Você está temporariamente banido de editar artigos de lore.',
          );
        } else if (err.status === 404) {
          this.toast.error('Não encontrado', 'Versão não encontrada.');
        } else {
          this.toast.error('Erro', 'Não foi possível reverter. Tente novamente.');
        }
      },
    });
  }

  protected toggleVote(): void {
    const cur = this.current();
    if (!cur) return;
    this.voting.set(true);

    const action$ = cur.userHasVoted
      ? this.versionService.removeVoteRevert(this.loreId)
      : this.versionService.voteRevert(this.loreId);

    action$.subscribe({
      next: (updated) => {
        this.versions.update((list) => list.map((v) => (v.status === 'current' ? updated : v)));
        this.voting.set(false);
        if (!cur.userHasVoted) {
          this.toast.warning(
            'Voto registrado',
            `${updated.revertVotes}/${updated.revertVotesNeeded} votos para reverter automaticamente.`,
          );
        }
      },
      error: (err) => {
        this.voting.set(false);
        if (err.status === 409) {
          this.toast.error('Voto duplicado', 'Você já votou nesta versão.');
        } else if (err.status === 403) {
          this.toast.error(
            'Acesso negado',
            'Você está temporariamente banido de editar artigos de lore.',
          );
        } else if (err.status === 404) {
          this.toast.error('Não encontrado', 'Você não tem voto registrado nesta versão.');
        } else {
          this.toast.error('Erro', 'Não foi possível registrar seu voto.');
        }
      },
    });
  }

  protected votePercent(v: LoreVersion): number {
    if (!v.revertVotesNeeded) return 0;
    return Math.min(100, Math.round((v.revertVotes / v.revertVotesNeeded) * 100));
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
