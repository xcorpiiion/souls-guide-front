import { AfterViewInit, ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './layout/navbar/navbar';
import { ToastContainer } from './shared/components/toast/toast';
import { LoadingBar } from './shared/components/loading-bar/loading-bar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, ToastContainer, LoadingBar],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements AfterViewInit {
  ngAfterViewInit(): void {
    const splash = document.getElementById('sg-splash');
    if (splash) {
      splash.classList.add('sg-splash--hidden');
      setTimeout(() => splash.remove(), 450);
    }
  }
}
