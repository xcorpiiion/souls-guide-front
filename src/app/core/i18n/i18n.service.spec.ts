import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/core';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';
import { I18nService } from './i18n.service';

describe('I18nService', () => {
  let service: I18nService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(I18nService);
  });

  afterEach(() => localStorage.clear());

  it('traduz a chave no idioma escolhido', () => {
    service.trocar('pt-BR');
    expect(service.t('nav.jogos')).toBe('Jogos');

    service.trocar('en');
    expect(service.t('nav.jogos')).toBe('Games');
  });

  /**
   * Sem escolha guardada, o palpite é o idioma do navegador — e o ambiente de teste
   * roda em inglês, o que este teste documenta em vez de contornar.
   */
  it('parte do idioma do navegador quando não há escolha guardada', () => {
    expect(service.idioma()).toBe(
      navigator.language.toLowerCase().startsWith('en') ? 'en' : 'pt-BR',
    );
  });

  /**
   * Uma tela com `home.titulo` escrito nela parece defeito; uma frase em português no meio
   * do inglês é compreensível.
   */
  it('chave sem tradução cai no português, não na chave crua', () => {
    service.trocar('en');

    // 'itens.ondeEncontrar' existe nos dois; a chave inventada não existe em nenhum.
    expect(service.t('itens.ondeEncontrar')).toBe('where to find it');
    expect(service.t('chave.que.nao.existe')).toBe('chave.que.nao.existe');
  });

  it('substitui os parâmetros da frase', () => {
    service.trocar('pt-BR');
    expect(service.t('itens.noCatalogo', { n: 12 })).toBe('12 no catálogo');

    service.trocar('en');
    expect(service.t('itens.noCatalogo', { n: 12 })).toBe('12 in the catalogue');
  });

  it('lembra a escolha entre sessões', () => {
    service.trocar('en');
    expect(localStorage.getItem('sg_idioma')).toBe('en');
  });

  /**
   * O `lang` do documento declara o idioma do **conteúdo**, e é dele que o Chrome parte
   * para oferecer "traduzir esta página". O conteúdo do site é em português mesmo com a
   * interface em inglês — mudar isto tiraria a oferta de tradução de quem mais precisa.
   */
  it('não muda o lang do documento ao trocar a interface', () => {
    const doc = TestBed.inject(DOCUMENT);
    const antes = doc.documentElement.getAttribute('lang');

    service.trocar('en');

    expect(doc.documentElement.getAttribute('lang')).toBe(antes);
    expect(doc.documentElement.getAttribute('data-ui-lang')).toBe('en');
  });
});
