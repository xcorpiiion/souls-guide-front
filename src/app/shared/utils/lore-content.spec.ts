import { describe, expect, it } from 'vitest';
import {
  extractImageFileKeys,
  loreImageMarkdown,
  parseLoreContent,
  renderMarkdown,
} from './lore-content';

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
      { kind: 'image', fileKey: 'k1', alt: 'alt' },
      { kind: 'paragraph', text: 'parágrafo' },
    ]);
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

  it('mostra marcador em vez de imagem quebrada quando a chave não resolveu', () => {
    const html = renderMarkdown('![Ranni](file:k1)');
    expect(html).not.toContain('<img');
    expect(html).toContain('imagem enviando');
  });

  it('escapa aspas do alt para não quebrar o atributo', () => {
    const html = renderMarkdown('![a"b](file:k1)', new Map([['k1', 'https://cdn/x.png']]));
    expect(html).toContain('alt="a&quot;b"');
  });

  it('continua formatando o markdown de sempre', () => {
    expect(renderMarkdown('**forte**')).toContain('<strong>forte</strong>');
  });
});
