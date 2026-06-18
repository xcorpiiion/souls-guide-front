import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { EMPTY, interval, merge } from 'rxjs';
import { filter, startWith, switchMap, throttleTime } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { Notification, NotificationType } from '../../shared/models/notification.model';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Navbar implements OnInit {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notifService = inject(NotificationService);
  readonly auth = inject(AuthService);

  readonly navLinks = [
    { path: '/home', label: 'Início' },
    { path: '/games', label: 'Jogos' },
    { path: '/quests', label: 'Quests' },
    { path: '/lore', label: 'Lore' },
    { path: '/comunidade', label: 'Comunidade' },
    { path: '/profile', label: 'Perfil' },
  ];

  protected readonly mobileOpen = signal(false);
  protected readonly searchOpen = signal(false);

  protected readonly unreadCount = signal(0);
  protected readonly notifOpen = signal(false);
  protected readonly notifications = signal<Notification[]>([]);
  protected readonly notifLoading = signal(false);

  ngOnInit(): void {
    const onNav$ = this.router.events.pipe(filter((e) => e instanceof NavigationEnd));
    const onInterval$ = interval(60_000);

    merge(onNav$, onInterval$)
      .pipe(
        startWith(null),
        throttleTime(2_000, undefined, { leading: true, trailing: false }),
        switchMap(() => (this.auth.isLoggedIn() ? this.notifService.getUnreadCount() : EMPTY)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({ next: (r) => this.unreadCount.set(r.count) });
  }

  protected toggleNotifPanel(): void {
    const opening = !this.notifOpen();
    this.notifOpen.set(opening);
    if (opening) this.loadNotifications();
  }

  private loadNotifications(): void {
    this.notifLoading.set(true);
    this.notifService.getNotifications(0).subscribe({
      next: (list) => {
        this.notifications.set(list);
        this.notifLoading.set(false);
      },
      error: () => this.notifLoading.set(false),
    });
  }

  protected readonly markingRead = signal(false);

  protected markAllRead(): void {
    if (this.markingRead()) return;
    this.markingRead.set(true);
    this.notifService.markAllRead().subscribe({
      next: () => {
        this.unreadCount.set(0);
        this.notifications.update((list) => list.map((n) => ({ ...n, read: true })));
        this.markingRead.set(false);
      },
      error: () => this.markingRead.set(false),
    });
  }

  protected notifText(n: Notification): string {
    const actor = n.actorName;
    const title = n.targetTitle ? `"${n.targetTitle}"` : '';
    const map: Record<NotificationType, string> = {
      QUEST_LIKE: `${actor} curtiu sua quest ${title}`,
      LORE_LIKE: `${actor} curtiu seu lore ${title}`,
      COMMENT_LIKE: `${actor} curtiu seu comentário`,
      COMMENT_ON_QUEST: `${actor} comentou na sua quest ${title}`,
      COMMENT_ON_LORE: `${actor} comentou no seu lore ${title}`,
      REPLY_TO_COMMENT: `${actor} respondeu seu comentário`,
      QUEST_NEW_VERSION: `A quest ${title} que você segue recebeu uma atualização`,
      LORE_NEW_VERSION: `O lore ${title} que você segue recebeu uma atualização`,
      GAME_NEW_QUEST: `${actor} criou a quest ${title} em um jogo que você segue`,
      GAME_NEW_LORE: `${actor} criou o lore ${title} em um jogo que você segue`,
      USER_FOLLOW: `${actor} começou a te seguir`,
    };
    return map[n.type] ?? `Nova notificação de ${actor}`;
  }

  protected notifTimeLabel(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60_000);
    if (min < 1) return 'agora';
    if (min < 60) return `há ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `há ${h}h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `há ${d} dia${d > 1 ? 's' : ''}`;
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  protected notifRoute(n: Notification): string[] {
    if (n.targetType === 'LORE') return ['/lore', String(n.targetId)];
    if (n.targetType === 'USER') return ['/profile'];
    // QUEST / COMMENT — rota completa exige gameId que não vem na notificação
    return ['/quests'];
  }

  protected onNotifClick(n: Notification): void {
    if (!n.read) {
      this.notifications.update((list) =>
        list.map((item) => (item.id === n.id ? { ...item, read: true } : item)),
      );
      this.unreadCount.update((c) => Math.max(0, c - 1));
      this.notifService.markOneRead(n.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }
    this.notifOpen.set(false);
    this.router.navigate(this.notifRoute(n));
  }

  @HostListener('document:click')
  protected onDocumentClick(): void {
    this.notifOpen.set(false);
  }

  protected toggleMobile(): void {
    this.mobileOpen.update((v) => !v);
    if (this.searchOpen()) this.searchOpen.set(false);
  }

  protected openSearch(): void {
    this.searchOpen.set(true);
    this.mobileOpen.set(false);
  }

  protected closeSearch(): void {
    this.searchOpen.set(false);
  }

  protected onSearchSubmit(event: Event): void {
    event.preventDefault();
    const q = (event.target as HTMLFormElement).querySelector('input')?.value.trim();
    if (q) {
      this.router.navigate(['/search'], { queryParams: { q } });
      this.searchOpen.set(false);
    }
  }

  protected closeMobile(): void {
    this.mobileOpen.set(false);
  }
}
