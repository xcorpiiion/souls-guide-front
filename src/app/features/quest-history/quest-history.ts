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
import { QuestVersionService, QuestVersion } from '../../core/services/quest-version.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { PageLoader } from '../../shared/components/page-loader/page-loader';

@Component({
  selector: 'app-quest-history',
  imports: [RouterLink, PageLoader],
  templateUrl: './quest-history.html',
  styleUrl: './quest-history.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestHistory implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly versionService = inject(QuestVersionService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly gameId = this.route.snapshot.paramMap.get('gameId') ?? '';
  protected readonly questId = this.route.snapshot.paramMap.get('questId') ?? '';
  protected readonly handle = this.route.snapshot.paramMap.get('handle') ?? '';
  protected readonly context: 'game' | 'profile' | 'usuario' = this.route.snapshot.paramMap.has(
    'gameId',
  )
    ? 'game'
    : this.route.snapshot.paramMap.has('handle')
      ? 'usuario'
      : 'profile';

  protected readonly isLoggedIn = this.authService.isLoggedIn;
  protected readonly versions = signal<QuestVersion[]>([]);
  protected readonly loading = signal(true);
  protected readonly reverting = signal<number | null>(null);
  protected readonly voting = signal(false);

  protected readonly current = computed(
    () => this.versions().find((v) => v.status === 'current') ?? null,
  );

  protected readonly uniqueEditors = computed(
    () => new Set(this.versions().map((v) => v.editedBy.nickname)).size,
  );

  protected readonly lastEditedAgo = computed(() => {
    const list = this.versions();
    if (!list.length) return '';
    const latest = list.reduce((a, b) => (new Date(a.editedAt) > new Date(b.editedAt) ? a : b));
    const diff = Date.now() - new Date(latest.editedAt).getTime();
    const d = Math.floor(diff / 86400000);
    if (d < 1) return 'hoje';
    return `${d}d`;
  });

  ngOnInit(): void {
    this.versionService.list(this.questId).subscribe({
      next: (list) => {
        this.versions.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  protected revert(version: QuestVersion): void {
    this.reverting.set(version.versionNumber);
    this.versionService.revert(this.questId, version.versionNumber).subscribe({
      next: (newVersion) => {
        this.versions.update((list): QuestVersion[] => [
          ...list.map((v) => (v.status === 'current' ? { ...v, status: 'active' as const } : v)),
          newVersion,
        ]);
        this.reverting.set(null);
        this.toast.success(
          'Versão restaurada',
          `Uma nova versão foi criada a partir da v${version.versionNumber}.`,
        );
      },
      error: (err) => {
        this.reverting.set(null);
        if (err.status === 400) {
          this.toast.error('Não permitido', 'Não é possível reverter para esta versão.');
        } else if (err.status === 403) {
          this.toast.error('Acesso negado', 'Você está temporariamente banido de editar quests.');
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
      ? this.versionService.removeVoteRevert(this.questId)
      : this.versionService.voteRevert(this.questId);

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
          this.toast.error('Acesso negado', 'Você está temporariamente banido de editar quests.');
        } else if (err.status === 404) {
          this.toast.error('Não encontrado', 'Versão não encontrada.');
        } else {
          this.toast.error('Erro', 'Não foi possível registrar seu voto.');
        }
      },
    });
  }

  protected votePercent(v: QuestVersion): number {
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
