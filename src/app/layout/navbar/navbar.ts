import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Navbar {
  readonly navLinks = [
    { path: '/home',    label: 'Início' },
    { path: '/games',   label: 'Jogos'  },
    { path: '/quests',  label: 'Quests' },
    { path: '/lore',    label: 'Lore'   },
    { path: '/profile', label: 'Perfil' },
  ];
}
