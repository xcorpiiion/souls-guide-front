import { AfterViewInit, ChangeDetectionStrategy, Component, DOCUMENT, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Navbar } from './layout/navbar/navbar';
import { PfToastContainer } from '@xcorpiiion/ui';
import { PfLoadingBar } from '@xcorpiiion/ui';
import { SeoPagina, SeoService } from './core/services/seo.service';
import { AtualizacaoDoApp } from './core/services/atualizacao-do-app';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, PfToastContainer, PfLoadingBar],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements AfterViewInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);
  private readonly doc = inject(DOCUMENT);
  private readonly atualizacao = inject(AtualizacaoDoApp);

  constructor() {
    // Não faz nada no servidor nem em desenvolvimento: o service worker está desligado
    // nos dois.
    this.atualizacao.iniciar();

    // O cabeçalho de cada página sai da própria tabela de rotas (`data.seo`), e não de
    // uma lista à parte: rota nova sem cabeçalho cai no padrão do site, e rota removida
    // leva o dela junto. Página de conteúdo sobrescreve isto quando a resposta chega —
    // o que está aqui é o que vale enquanto ela não chegou.
    //
    // Aplicar a cada navegação, e não só na primeira, é o que impede o <head> da página
    // anterior de continuar valendo: numa SPA nada troca o `<title>` sozinho.
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.aplicarSeoDaRota());
  }

  ngAfterViewInit(): void {
    const splash = this.doc.getElementById('sg-splash');
    if (splash) {
      splash.classList.add('sg-splash--hidden');
      setTimeout(() => splash.remove(), 450);
    }
  }

  /** O cabeçalho da rota mais profunda ganha: é ela que descreve o que está na tela. */
  private aplicarSeoDaRota(): void {
    let rota = this.route;
    while (rota.firstChild) rota = rota.firstChild;

    const dados = rota.snapshot.data['seo'] as SeoPagina | undefined;
    if (dados) {
      this.seo.aplicar(dados);
    } else {
      this.seo.padrao();
    }
  }
}
