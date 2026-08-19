import { computed, DOCUMENT, inject, Injectable, signal } from '@angular/core';
import { PT_BR } from './pt-br';
import { EN } from './en';

/** Os idiomas que a interface fala. O conteúdo não é traduzido — ver o cabeçalho abaixo. */
export const IDIOMAS = ['pt-BR', 'en'] as const;
export type Idioma = (typeof IDIOMAS)[number];

/** Rótulo de cada idioma, escrito **no próprio idioma**: quem procura "English" lê inglês. */
export const IDIOMA_LABEL: Record<Idioma, string> = {
  'pt-BR': 'Português',
  en: 'English',
};

const CHAVE = 'sg_idioma';

/**
 * A interface em português e em inglês.
 *
 * <h2>O que é traduzido, e o que não é</h2>
 * Só a **interface**: botão, rótulo, mensagem de vazio, título de seção. O **conteúdo** —
 * guia, lore, final, comentário — fica como quem escreveu escreveu, e quem precisar usa a
 * tradução do navegador.
 *
 * A alternativa seria filtrar conteúdo por idioma, e ela é pior por um motivo concreto:
 * hoje 100% do acervo é em português, então um visitante que lê inglês veria um site
 * vazio. Guia mal traduzido por máquina ainda ajuda; guia escondido não ajuda ninguém.
 *
 * <h2>Por que não o i18n do Angular</h2>
 * O `@angular/localize` resolve tradução em **tempo de build**: um bundle por idioma, e o
 * servidor escolhe qual serve. Isso multiplica a imagem e o SSR por idioma, para um site
 * que hoje tem dois. Aqui a troca é em tempo de execução, sem recarregar a página e sem
 * segundo build.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly doc = inject(DOCUMENT);

  private readonly dicionarios: Record<Idioma, Record<string, string>> = {
    'pt-BR': PT_BR,
    en: EN,
  };

  private readonly atual = signal<Idioma>(this.inicial());

  readonly idioma = this.atual.asReadonly();
  readonly ehIngles = computed(() => this.atual() === 'en');

  constructor() {
    this.marcarIdiomaDaInterface(this.atual());
  }

  /**
   * O texto da chave no idioma atual.
   *
   * Chave sem tradução devolve o texto em português, e não a chave crua: uma tela com
   * `home.titulo` escrito nela é pior que uma tela com uma frase em português no meio do
   * inglês — a segunda é compreensível, a primeira parece defeito.
   */
  t(chave: string, params?: Record<string, string | number>): string {
    const texto = this.dicionarios[this.atual()][chave] ?? PT_BR[chave] ?? chave;

    if (!params) return texto;

    return Object.entries(params).reduce(
      (acc, [nome, valor]) => acc.replaceAll(`{${nome}}`, String(valor)),
      texto,
    );
  }

  trocar(idioma: Idioma): void {
    this.atual.set(idioma);
    this.marcarIdiomaDaInterface(idioma);

    try {
      localStorage.setItem(CHAVE, idioma);
    } catch {
      // Sem localStorage (servidor, ou navegador com armazenamento bloqueado) a escolha
      // vale só para esta sessão. É melhor que não deixar trocar.
    }
  }

  /**
   * A escolha guardada, depois o idioma do navegador, depois português.
   *
   * No servidor não há nem uma coisa nem outra, e o padrão é o português — que é o idioma
   * do conteúdo, e portanto o que o crawler deve ver.
   */
  private inicial(): Idioma {
    try {
      const guardado = localStorage.getItem(CHAVE);
      if (guardado && (IDIOMAS as readonly string[]).includes(guardado)) return guardado as Idioma;
    } catch {
      // segue para o palpite
    }

    const navegador = this.doc.defaultView?.navigator?.language ?? '';
    return navegador.toLowerCase().startsWith('en') ? 'en' : 'pt-BR';
  }

  /**
   * O `<html lang>` **não** acompanha a interface: ele continua dizendo `pt-BR`.
   *
   * Parece errado e é o contrário. Esse atributo declara o idioma do <b>conteúdo</b>, e é
   * dele que o Chrome parte para oferecer "traduzir esta página". O conteúdo do site é em
   * português mesmo quando a interface está em inglês — marcar a página como `en` faria a
   * oferta de tradução sumir justamente para quem precisa dela, que é o plano deste site
   * para leitor estrangeiro.
   *
   * O que acompanha a escolha é `data-ui-lang`, que não muda comportamento de tradução e
   * serve para CSS e para depuração.
   */
  private marcarIdiomaDaInterface(idioma: Idioma): void {
    this.doc.documentElement?.setAttribute('data-ui-lang', idioma);
  }
}
