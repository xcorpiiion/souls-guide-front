import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Navbar {
  private readonly router = inject(Router);
  protected readonly themeService = inject(ThemeService);

  readonly navLinks = [
    { path: '/home', label: 'Início' },
    { path: '/games', label: 'Jogos' },
    { path: '/quests', label: 'Quests' },
    { path: '/lore', label: 'Lore' },
    { path: '/profile', label: 'Perfil' },
  ];

  protected readonly mobileOpen = signal(false);
  protected readonly searchOpen = signal(false);

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
