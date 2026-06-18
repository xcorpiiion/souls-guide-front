import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject, switchMap, of, catchError } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserService } from '../../core/services/user.service';
import { GameService } from '../../core/services/game.service';
import { AuthService } from '../../core/services/auth.service';
import { UserSummary } from '../../shared/models/user.model';
import { FeaturedGame } from '../../shared/models/game.model';

@Component({
  selector: 'app-comunidade',
  imports: [RouterLink],
  templateUrl: './comunidade.html',
  styleUrl: './comunidade.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Comunidade implements OnInit {
  private readonly userService = inject(UserService);
  private readonly gameService = inject(GameService);
  private readonly authService = inject(AuthService);

  protected readonly users = signal<UserSummary[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadingMore = signal(false);
  protected readonly searchQuery = signal('');
  protected readonly selectedGameId = signal<string | null>(null);
  protected readonly games = signal<FeaturedGame[]>([]);
  protected readonly page = signal(0);
  protected readonly hasMore = signal(false);
  protected readonly followingIds = signal<Set<number>>(new Set());

  protected readonly isLoggedIn = computed(() => this.authService.isLoggedIn());
  private readonly myNickname = this.authService.getNickname();
  private readonly myUserId = this.authService.getUserId();

  protected isMe(user: { id: number; handle: string }): boolean {
    if (this.myUserId && String(user.id) === String(this.myUserId)) return true;
    if (this.myNickname && user.handle.toLowerCase() === this.myNickname.toLowerCase()) return true;
    return false;
  }

  private readonly search$ = new Subject<string>();

  constructor() {
    this.search$
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        switchMap((q) => {
          this.loading.set(true);
          this.page.set(0);
          return this.userService
            .listUsers(q, 0, 20, this.selectedGameId() ?? undefined)
            .pipe(catchError(() => of(null)));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((res) => {
        this.loading.set(false);
        if (res) {
          const filtered = this.filterSelf(res.content);
          this.users.set(filtered);
          this.hasMore.set(!res.last);
          this.syncFollowing(filtered);
        }
      });
  }

  ngOnInit(): void {
    this.gameService.getFeatured().subscribe({
      next: (list) => this.games.set(list),
      error: () => {
        /* silenced */
      },
    });
    this.loadPage(0);
  }

  private loadPage(p: number): void {
    if (p === 0) this.loading.set(true);
    else this.loadingMore.set(true);

    this.userService
      .listUsers(this.searchQuery(), p, 20, this.selectedGameId() ?? undefined)
      .subscribe({
        next: (res) => {
          const filtered = this.filterSelf(res.content);
          if (p === 0) {
            this.users.set(filtered);
          } else {
            this.users.update((list) => [...list, ...filtered]);
          }
          this.page.set(p);
          this.hasMore.set(!res.last);
          this.syncFollowing(filtered);
          this.loading.set(false);
          this.loadingMore.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.loadingMore.set(false);
        },
      });
  }

  private filterSelf(users: UserSummary[]): UserSummary[] {
    if (!this.myNickname) return users;
    return users.filter((u) => u.handle.toLowerCase() !== this.myNickname!.toLowerCase());
  }

  private syncFollowing(users: UserSummary[]): void {
    const ids = new Set(this.followingIds());
    for (const u of users) {
      if (u.isFollowing) ids.add(u.id);
    }
    this.followingIds.set(ids);
  }

  protected onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.search$.next(value);
  }

  protected selectGame(gameId: string | null): void {
    this.selectedGameId.set(gameId);
    this.loadPage(0);
  }

  protected loadMore(): void {
    this.loadPage(this.page() + 1);
  }

  protected isFollowing(userId: number): boolean {
    return this.followingIds().has(userId);
  }

  protected toggleFollow(user: UserSummary, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.isLoggedIn()) return;

    const following = this.isFollowing(user.id);
    const ids = new Set(this.followingIds());
    if (following) {
      ids.delete(user.id);
      this.followingIds.set(ids);
      this.userService.unfollow(user.id).subscribe({
        error: () => {
          const r = new Set(this.followingIds());
          r.add(user.id);
          this.followingIds.set(r);
        },
      });
    } else {
      ids.add(user.id);
      this.followingIds.set(ids);
      this.userService.follow(user.id).subscribe({
        error: () => {
          const r = new Set(this.followingIds());
          r.delete(user.id);
          this.followingIds.set(r);
        },
      });
    }
  }

  protected initial(name: string): string {
    return name[0]?.toUpperCase() ?? '?';
  }
}
