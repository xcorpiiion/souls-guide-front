import { DOCUMENT, inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { SITE_URL } from '../ssr/api-base';

/** O que uma página precisa dizer sobre si mesma para quem não a renderiza. */
export interface SeoPagina {
  /** Sem o nome do site: ele é acrescentado aqui, para não sair repetido em cada chamada. */
  titulo: string;
  descricao: string;
  /** URL da imagem de capa. Relativa serve — é absolutizada aqui. */
  imagem?: string | null;
  tipo?: 'website' | 'article';
  /**
   * `false` marca `noindex`. Vale para o que não é conteúdo — login, formulário,
   * resultado de busca — e para conteúdo de perfil, que é do dono e não do público.
   */
  indexavel?: boolean;
  /**
   * O caminho que esta página declara como seu endereço definitivo, quando ele não é o da
   * barra de endereços.
   *
   * Existe por causa do slug: a mesma página abre por `/games/17/quests/45` e por
   * `/games/elden-ring/quests/45-ranni-a-bruxa`. Sem dizer qual é o definitivo, o
   * buscador vê duas páginas com o mesmo conteúdo e divide entre elas o peso que deveria
   * ser de uma só.
   */
  canonical?: string | null;
  publicadoEm?: string | null;
  atualizadoEm?: string | null;
  autor?: string | null;
}

const NOME_DO_SITE = 'SoulGuide';
const DESCRICAO_PADRAO =
  'Guias colaborativos de souls-like: quests passo a passo, finais, lore e progresso da sua run.';
const IMAGEM_PADRAO = '/og-default.png';

/**
 * As tags que este serviço administra. Existir aqui significa "eu ponho e eu tiro":
 * a cada navegação todas são removidas antes de as novas entrarem.
 *
 * O motivo é o modo de falha de SPA: numa página sem capa, a `og:image` da página
 * anterior continuaria no `<head>`, e o link compartilhado sairia com a imagem da
 * quest errada. Nada quebra, nada avisa — só o preview mente.
 */
const TAGS_GERENCIADAS = [
  'name="description"',
  'name="robots"',
  'name="author"',
  'property="og:title"',
  'property="og:description"',
  'property="og:type"',
  'property="og:url"',
  'property="og:image"',
  'property="og:site_name"',
  'property="og:locale"',
  'property="article:published_time"',
  'property="article:modified_time"',
  'name="twitter:card"',
  'name="twitter:title"',
  'name="twitter:description"',
  'name="twitter:image"',
];

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);

  /**
   * Fornecido só no servidor. No navegador fica nulo e vale a origem de verdade, que é
   * o que mantém o link do ambiente local apontando para o ambiente local.
   */
  private readonly siteUrl = inject(SITE_URL, { optional: true });

  /**
   * Aplica o cabeçalho da página.
   *
   * Chame no ponto em que o dado chegou, não no `ngOnInit`: com o título montado antes
   * da resposta, o que o crawler lê é "Carregando".
   */
  aplicar(pagina: SeoPagina): void {
    const titulo = pagina.titulo?.trim()
      ? `${pagina.titulo.trim()} · ${NOME_DO_SITE}`
      : NOME_DO_SITE;
    const descricao = resumo(pagina.descricao) || DESCRICAO_PADRAO;
    const imagem = this.absolutizar(pagina.imagem || IMAGEM_PADRAO);
    const url = this.urlCanonica(pagina.canonical);
    const indexavel = pagina.indexavel !== false;

    this.title.setTitle(titulo);

    for (const seletor of TAGS_GERENCIADAS) {
      this.meta.removeTag(seletor);
    }

    this.meta.addTags(
      [
        { name: 'description', content: descricao },
        { property: 'og:title', content: titulo },
        { property: 'og:description', content: descricao },
        { property: 'og:type', content: pagina.tipo ?? 'website' },
        { property: 'og:url', content: url },
        { property: 'og:image', content: imagem },
        { property: 'og:site_name', content: NOME_DO_SITE },
        { property: 'og:locale', content: 'pt_BR' },

        // `summary_large_image` é o que faz o card sair com a imagem grande em vez de
        // uma miniatura ao lado do texto. Sem imagem própria a miniatura é o certo.
        { name: 'twitter:card', content: pagina.imagem ? 'summary_large_image' : 'summary' },
        { name: 'twitter:title', content: titulo },
        { name: 'twitter:description', content: descricao },
        { name: 'twitter:image', content: imagem },

        ...(indexavel ? [] : [{ name: 'robots', content: 'noindex, follow' }]),
        ...(pagina.autor ? [{ name: 'author', content: pagina.autor }] : []),
        ...(pagina.publicadoEm
          ? [{ property: 'article:published_time', content: pagina.publicadoEm }]
          : []),
        ...(pagina.atualizadoEm
          ? [{ property: 'article:modified_time', content: pagina.atualizadoEm }]
          : []),
      ],
      true,
    );

    this.canonical(url);
  }

  /** Cabeçalho de quem não tem conteúdo próprio para descrever. */
  padrao(): void {
    this.aplicar({ titulo: '', descricao: DESCRICAO_PADRAO });
  }

  /**
   * Dado estruturado (JSON-LD). É o que faz o Google exibir autor e data no resultado,
   * em vez de só título e trecho.
   *
   * Um script só, trocado a cada página: dois blocos concorrentes descrevendo coisas
   * diferentes é pior do que nenhum.
   */
  estruturado(dado: Record<string, unknown> | null): void {
    const anterior = this.doc.getElementById('sg-jsonld');
    if (anterior) anterior.remove();
    if (!dado) return;

    const script = this.doc.createElement('script');
    script.id = 'sg-jsonld';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({ '@context': 'https://schema.org', ...dado });
    this.doc.head.appendChild(script);
  }

  /** A URL da página, sem query — filtro e paginação não são páginas diferentes. */
  private urlCanonica(caminho?: string | null): string {
    const loc = this.doc.location;
    if (!loc) return '';

    const path = caminho?.trim()
      ? caminho.startsWith('/')
        ? caminho
        : `/${caminho}`
      : loc.pathname;
    return `${this.origem()}${path}`;
  }

  private absolutizar(url: string): string {
    if (/^https?:\/\//i.test(url)) return url;
    return `${this.origem()}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  /**
   * De onde saem as URLs absolutas do cabeçalho.
   *
   * No servidor é o domínio configurado; no navegador, a origem de verdade.
   */
  private origem(): string {
    return this.siteUrl ?? this.doc.location?.origin ?? '';
  }

  private canonical(url: string): void {
    if (!url) return;
    let link = this.doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}

/**
 * Texto corrido a partir do que o autor escreveu, para caber na descrição.
 *
 * O conteúdo de lore é markdown, então o que vai para a meta precisa perder imagem,
 * link, título e ênfase — senão o resultado do Google mostra `![alt](file:abc123)`.
 */
export function resumo(texto: string | null | undefined, max = 160): string {
  if (!texto) return '';

  const limpo = texto
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // imagem
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // link vira o rótulo
    .replace(/^#{1,6}\s+/gm, '') // título
    .replace(/[*_`>~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (limpo.length <= max) return limpo;

  // Corta na palavra, não no meio dela: "Rani, a bruxa das est…" é melhor que "…es".
  const corte = limpo.slice(0, max);
  const ultimoEspaco = corte.lastIndexOf(' ');
  return `${(ultimoEspaco > max * 0.6 ? corte.slice(0, ultimoEspaco) : corte).trimEnd()}…`;
}
