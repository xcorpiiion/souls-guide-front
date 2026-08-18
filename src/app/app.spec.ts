import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { describe, beforeEach, it, expect } from 'vitest';
import { App } from './app';
import { provideAuth } from '@xcorpiiion/ng-core';

@Component({ selector: 'app-dummy', template: '' })
class Dummy {}

const ROTAS = [
  {
    path: 'com-seo',
    component: Dummy,
    data: { seo: { titulo: 'Jogos', descricao: 'Todos os souls-like.' } },
  },
  { path: 'sem-seo', component: Dummy },
];

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideAuth({ baseUrl: 'http://localhost/auth' }), provideRouter(ROTAS)],
    }).compileComponents();
  });

  it('deve criar o componente raiz', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('deve renderizar o router-outlet', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled: HTMLElement = fixture.nativeElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });

  describe('cabeçalho da página', () => {
    it('aplica o seo declarado na rota', async () => {
      TestBed.createComponent(App);
      await TestBed.inject(Router).navigateByUrl('/com-seo');

      expect(TestBed.inject(Title).getTitle()).toBe('Jogos · SoulGuide');
      expect(
        document.head.querySelector<HTMLMetaElement>('meta[name="description"]')?.content,
      ).toBe('Todos os souls-like.');
    });

    // Numa SPA nada troca o <title> sozinho. Sem isto, sair de uma página com
    // cabeçalho próprio deixaria o dela valendo na página seguinte.
    it('volta ao padrão do site em rota sem seo declarado', async () => {
      TestBed.createComponent(App);
      const router = TestBed.inject(Router);

      await router.navigateByUrl('/com-seo');
      await router.navigateByUrl('/sem-seo');

      expect(TestBed.inject(Title).getTitle()).toBe('SoulGuide');
    });
  });
});
