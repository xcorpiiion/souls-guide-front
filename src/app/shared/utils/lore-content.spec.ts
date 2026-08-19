import { describe, expect, it } from 'vitest';
import {
  extractImageFileKeys,
  loreImageMarkdown,
  parseLoreContent,
  renderMarkdown,
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

  it('o texto do artigo sobrevive à imagem removida', () => {
    const blocos = parseLoreContent('![alt](file:k1)\n\ntexto que fica');

    expect(blocos.some((b) => b.kind === 'image')).toBe(IMAGENS_DE_USUARIO_HABILITADAS);
    expect(blocos).toContainEqual({ kind: 'paragraph', text: 'texto que fica' });
  });

  it('descarta blocos vazios', () => {
    expect(parseLoreContent('a\n\n\n\n\nb')).toHaveLength(2);
  });
});

describe('renderMarkdown', () => {
  it('troca a chave pela URL resolvida', () => {
    const html = renderMarkdown('![Ranni](file:k1)', new Map([['k1', 'https://cdn/x.png']]));
    expect(html).toContain('<img src="https://cdn/x.png" alt="Ranni" />');
  });

  /**
   * Desligado, nenhuma chave resolve nunca — então o marcador de "enviando" ficaria
   * mentindo para sempre em todo artigo que já tem imagem no texto. O bloco some.
   */
  it('não deixa marcador de envio quando imagem de usuário está desligada', () => {
    const html = renderMarkdown('![Ranni](file:k1)');

    expect(html).not.toContain('<img');
    expect(html).not.toContain('imagem enviando');
  });

  it.skipIf(!IMAGENS_DE_USUARIO_HABILITADAS)(
    'mostra marcador em vez de imagem quebrada quando a chave não resolveu',
    () => {
      const html = renderMarkdown('![Ranni](file:k1)');
      expect(html).not.toContain('<img');
      expect(html).toContain('imagem enviando');
    },
  );

  it('escapa aspas do alt para não quebrar o atributo', () => {
    const html = renderMarkdown('![a"b](file:k1)', new Map([['k1', 'https://cdn/x.png']]));
    expect(html).toContain('alt="a&quot;b"');
  });

  it('continua formatando o markdown de sempre', () => {
    expect(renderMarkdown('**forte**')).toContain('<strong>forte</strong>');
  });
});
