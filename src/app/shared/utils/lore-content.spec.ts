import { describe, expect, it } from 'vitest';
import {
  parseInline,
  extractImageFileKeys,
  loreImageMarkdown,
  parseLoreContent,
} from './lore-content';
import { IMAGENS_DE_USUARIO_HABILITADAS } from '../../core/services/storage.service';

describe('loreImageMarkdown', () => {
  it('escreve a chave, nunca a URL', () => {
    expect(loreImageMarkdown('abc-123', 'Ranni')).toBe('![Ranni](file:abc-123)');
  });
});

describe('extractImageFileKeys', () => {
  it('encontra todas as chaves citadas no texto', () => {
    const content = ['## Seção', '![a](file:k1)', 'texto', '![b](file:k2)'].join('\n\n');
    expect(extractImageFileKeys(content)).toEqual(['k1', 'k2']);
  });

  it('ignora imagem com URL externa — só resolvemos o que é nosso', () => {
    expect(extractImageFileKeys('![x](https://exemplo.com/a.png)')).toEqual([]);
  });

  it('devolve vazio quando não há imagem', () => {
    expect(extractImageFileKeys('só texto')).toEqual([]);
  });
});

describe('parseLoreContent', () => {
  it('classifica cada bloco pelo que ele é', () => {
    const content = ['## Título', '> citação', '![alt](file:k1)', 'parágrafo'].join('\n\n');

    expect(parseLoreContent(content)).toEqual([
      { kind: 'heading', text: 'Título' },
      { kind: 'quote', text: 'citação' },
      // O bloco de imagem some enquanto imagem de usuário está desligada, e some inteiro
      // — em vez de virar um espaço vazio no meio do artigo.
      ...(IMAGENS_DE_USUARIO_HABILITADAS ? [{ kind: 'image', fileKey: 'k1', alt: 'alt' }] : []),
      { kind: 'paragraph', text: 'parágrafo' },
    ]);
  });

  /** A origem saía na leitura como mais uma linha do texto do jogo, no mesmo estilo. */
  it('a citação do montar lore separa o trecho da linha de origem', () => {
    expect(parseLoreContent('> Se você ler isto,\n> não volte.\n— Bilhete · nota, Cap. 1')).toEqual(
      [{ kind: 'quote', text: 'Se você ler isto,\nnão volte.', origem: 'Bilhete · nota, Cap. 1' }],
    );
  });

  it('o texto do artigo sobrevive à imagem removida', () => {
    const blocos = parseLoreContent('![alt](file:k1)\n\ntexto que fica');

    expect(blocos.some((b) => b.kind === 'image')).toBe(IMAGENS_DE_USUARIO_HABILITADAS);
    expect(blocos).toContainEqual({ kind: 'paragraph', text: 'texto que fica' });
  });

  it('descarta blocos vazios', () => {
    expect(parseLoreContent('a\n\n\n\n\nb')).toHaveLength(2);
  });
});

describe('parseInline', () => {
  it('quebra negrito e italico em segmentos, preservando o texto em volta', () => {
    expect(parseInline('o **sino** tocou *duas* vezes')).toEqual([
      { kind: 'texto', text: 'o ' },
      { kind: 'forte', text: 'sino' },
      { kind: 'texto', text: ' tocou ' },
      { kind: 'enfase', text: 'duas' },
      { kind: 'texto', text: ' vezes' },
    ]);
  });

  it('negrito ganha do italico, senao sobra um asterisco solto', () => {
    expect(parseInline('**forte**')).toEqual([{ kind: 'forte', text: 'forte' }]);
  });

  it('link http e https vira link', () => {
    expect(parseInline('ver [a fonte](https://exemplo.com/x)')).toEqual([
      { kind: 'texto', text: 'ver ' },
      { kind: 'link', text: 'a fonte', href: 'https://exemplo.com/x' },
    ]);
  });

  /**
   * O texto da lore e escrito por usuario e a pagina e publica. A allowlist de esquema e a
   * unica coisa entre um artigo e um `javascript:` no href de um link que todo visitante ve.
   */
  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    '/lore/10',
  ])('%s nao vira link, e volta como o texto que a pessoa escreveu', (url) => {
    const texto = `[clique](${url})`;
    expect(parseInline(texto)).toEqual([{ kind: 'texto', text: texto }]);
  });

  it('texto sem marcacao sai como um segmento so', () => {
    expect(parseInline('sem nada')).toEqual([{ kind: 'texto', text: 'sem nada' }]);
  });
});

describe('parseLoreContent com tabela', () => {
  it('le uma tabela com cabecalho', () => {
    const blocos = parseLoreContent('| Deus | Por que trocou |\n|---|---|\n| Dragao | era o gas |');
    expect(blocos).toEqual([
      { kind: 'table', cabecalho: ['Deus', 'Por que trocou'], linhas: [['Dragao', 'era o gas']] },
    ]);
  });

  /** O caso comum da lore: tabela de pares, em que o cabecalho existe so porque o markdown exige. */
  it('cabecalho todo em branco vira cabecalho vazio', () => {
    const blocos = parseLoreContent(
      '| | |\n|---|---|\n| O nome | Fujitori |\n| A mascara | a cicatriz |',
    );
    expect(blocos).toEqual([
      {
        kind: 'table',
        cabecalho: [],
        linhas: [
          ['O nome', 'Fujitori'],
          ['A mascara', 'a cicatriz'],
        ],
      },
    ]);
  });

  /**
   * Sem exigir a linha separadora, texto do jogo que comece com barra vertical viraria
   * tabela de uma coluna — e o conteudo da lore e cheio de texto colado do jogo.
   */
  it('sem a linha separadora continua sendo paragrafo', () => {
    const texto = '| isto nao e tabela\n| so comeca com barra';
    expect(parseLoreContent(texto)[0].kind).toBe('paragraph');
  });

  it('tabela sem nenhuma linha de dados continua sendo paragrafo', () => {
    expect(parseLoreContent('| a | b |\n|---|---|')[0].kind).toBe('paragraph');
  });
});
