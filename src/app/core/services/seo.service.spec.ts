import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { describe, beforeEach, it, expect } from 'vitest';
import { resumo, SeoService } from './seo.service';

describe('SeoService', () => {
  let service: SeoService;
  let doc: Document;

  const conteudo = (seletor: string): string | null =>
    doc.head.querySelector<HTMLMetaElement>(seletor)?.content ?? null;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SeoService);
    doc = TestBed.inject(DOCUMENT);
    doc.head.querySelectorAll('meta, link[rel="canonical"], #sg-jsonld').forEach((n) => n.remove());
  });

  it('acrescenta o nome do site ao título', () => {
    service.aplicar({ titulo: 'Ranni, a Bruxa', descricao: 'A quest mais longa do jogo.' });
    expect(TestBed.inject(Title).getTitle()).toBe('Ranni, a Bruxa · SoulGuide');
  });

  it('usa só o nome do site quando a página não tem título próprio', () => {
    service.padrao();
    expect(TestBed.inject(Title).getTitle()).toBe('SoulGuide');
  });

  it('preenche description, Open Graph e Twitter card', () => {
    service.aplicar({
      titulo: 'Ranni',
      descricao: 'Passo a passo.',
      imagem: '/local-files/capa.png',
      tipo: 'article',
    });

    expect(conteudo('meta[name="description"]')).toBe('Passo a passo.');
    expect(conteudo('meta[property="og:title"]')).toBe('Ranni · SoulGuide');
    expect(conteudo('meta[property="og:type"]')).toBe('article');
    expect(conteudo('meta[name="twitter:card"]')).toBe('summary_large_image');
  });

  it('absolutiza a imagem: crawler não resolve caminho relativo', () => {
    service.aplicar({ titulo: 'x', descricao: 'y', imagem: '/local-files/capa.png' });

    const og = conteudo('meta[property="og:image"]');
    expect(og).toBe(`${doc.location.origin}/local-files/capa.png`);
  });

  it('mantém a URL absoluta que já veio pronta', () => {
    service.aplicar({ titulo: 'x', descricao: 'y', imagem: 'https://cdn.exemplo/capa.png' });
    expect(conteudo('meta[property="og:image"]')).toBe('https://cdn.exemplo/capa.png');
  });

  // O defeito que este serviço existe para não ter: navegar de uma página com capa
  // para outra sem capa deixaria a imagem da anterior no <head>, e o link
  // compartilhado sairia com a capa da quest errada.
  it('não deixa tag da página anterior para trás', () => {
    service.aplicar({ titulo: 'Com capa', descricao: 'a', imagem: '/local-files/capa.png' });
    service.aplicar({ titulo: 'Sem capa', descricao: 'b' });

    expect(conteudo('meta[property="og:image"]')).toBe(`${doc.location.origin}/og-default.png`);
    expect(conteudo('meta[name="twitter:card"]')).toBe('summary');
    expect(doc.head.querySelectorAll('meta[property="og:title"]').length).toBe(1);
  });

  it('remove article:modified_time ao sair de uma página de conteúdo', () => {
    service.aplicar({ titulo: 'a', descricao: 'b', atualizadoEm: '2026-08-18T10:00:00Z' });
    expect(conteudo('meta[property="article:modified_time"]')).toBe('2026-08-18T10:00:00Z');

    service.aplicar({ titulo: 'c', descricao: 'd' });
    expect(conteudo('meta[property="article:modified_time"]')).toBeNull();
  });

  it('marca noindex só quando a página pede', () => {
    service.aplicar({ titulo: 'a', descricao: 'b' });
    expect(conteudo('meta[name="robots"]')).toBeNull();

    service.aplicar({ titulo: 'a', descricao: 'b', indexavel: false });
    expect(conteudo('meta[name="robots"]')).toBe('noindex, follow');
  });

  it('mantém um único canonical, atualizado a cada página', () => {
    service.aplicar({ titulo: 'a', descricao: 'b' });
    service.aplicar({ titulo: 'c', descricao: 'd' });

    const links = doc.head.querySelectorAll('link[rel="canonical"]');
    expect(links.length).toBe(1);
    expect(links[0].getAttribute('href')).toBe(`${doc.location.origin}${doc.location.pathname}`);
  });

  /**
   * A mesma página abre por `/games/17/quests/45` e por
   * `/games/elden-ring/quests/45-ranni-a-bruxa`. Sem declarar qual é o endereço
   * definitivo, o buscador vê duas páginas iguais e divide entre elas o peso de uma só.
   */
  it('declara como canônico o caminho que a página pediu, não o da barra de endereços', () => {
    service.aplicar({
      titulo: 'Ranni',
      descricao: 'x',
      canonical: '/games/elden-ring/quests/45-ranni-a-bruxa',
    });

    expect(doc.head.querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe(
      `${doc.location.origin}/games/elden-ring/quests/45-ranni-a-bruxa`,
    );
  });

  it('sem caminho declarado, o canônico é a URL atual', () => {
    service.aplicar({ titulo: 'a', descricao: 'b' });

    expect(doc.head.querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe(
      `${doc.location.origin}${doc.location.pathname}`,
    );
  });

  describe('estruturado()', () => {
    it('injeta o JSON-LD com o @context', () => {
      service.estruturado({ '@type': 'Article', headline: 'Ranni' });

      const script = doc.getElementById('sg-jsonld');
      expect(script).not.toBeNull();
      expect(JSON.parse(script!.textContent!)).toEqual({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'Ranni',
      });
    });

    it('troca em vez de acumular', () => {
      service.estruturado({ '@type': 'Article' });
      service.estruturado({ '@type': 'VideoGame' });

      expect(doc.querySelectorAll('#sg-jsonld').length).toBe(1);
      expect(doc.getElementById('sg-jsonld')!.textContent).toContain('VideoGame');
    });

    it('remove quando a página não tem dado estruturado', () => {
      service.estruturado({ '@type': 'Article' });
      service.estruturado(null);
      expect(doc.getElementById('sg-jsonld')).toBeNull();
    });
  });

  describe('resumo()', () => {
    it('tira imagem e link do markdown', () => {
      const texto = '![capa](file:abc) Veja o [mapa](/games/1) completo.';
      expect(resumo(texto)).toBe('Veja o mapa completo.');
    });

    it('tira título e ênfase', () => {
      expect(resumo('## A Bruxa\n\nEla **dorme** no `Rise`.')).toBe('A Bruxa Ela dorme no Rise.');
    });

    it('corta na palavra e marca o corte', () => {
      const texto = 'palavra '.repeat(40);
      const saida = resumo(texto, 40);

      expect(saida.length).toBeLessThanOrEqual(41);
      expect(saida.endsWith('…')).toBe(true);
      expect(saida).not.toContain('palav…');
    });

    it('devolve vazio para texto ausente', () => {
      expect(resumo(null)).toBe('');
      expect(resumo(undefined)).toBe('');
    });
  });
});
