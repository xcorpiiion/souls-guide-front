import { describe, it, expect } from 'vitest';
import { citaPessoa, lerCitacao, semRepetir } from './citacao-da-lore';

describe('lerCitacao', () => {
  it('diálogo: separa as falas por quem fala, e junta quem aparece', () => {
    const c = lerCitacao(
      'MULHER DE BRANCO: Você já esteve aqui.\nSó não lembra.\nJAMES: Nunca estive.',
      'Conversa na ponte · diálogo, Cap. 2 — Hospital · com Mulher de branco, James, Laura',
    );
    expect(c.tipo).toBe('diálogo');
    expect(c.titulo).toBe('Conversa na ponte');
    expect(c.capitulo).toBe('Cap. 2 — Hospital');
    expect(c.falas).toEqual([
      { nome: 'MULHER DE BRANCO', texto: 'Você já esteve aqui.\nSó não lembra.' },
      { nome: 'JAMES', texto: 'Nunca estive.' },
    ]);
    // "Mulher de branco" e "MULHER DE BRANCO" são a mesma pessoa.
    expect(c.pessoas).toEqual(['Mulher de branco', 'James', 'Laura']);
  });

  /** Numa nota, "Dia 14:" é texto; separar como fala inventaria alguém chamado Dia 14. */
  it('nota: dois pontos não viram fala, e quem escreveu entra nas pessoas', () => {
    const c = lerCitacao('Dia 14: a menina voltou.', 'Diário · documento, Cap. 2 · por Enfermeira');
    expect(c.falas).toEqual([]);
    expect(c.texto).toBe('Dia 14: a menina voltou.');
    expect(c.pessoas).toEqual(['Enfermeira']);
  });

  it('citação de antes deste formato: sem "com", os nomes saem das falas', () => {
    const c = lerCitacao('MULHER: Treze.', 'O sino · cutscene, sem capítulo');
    expect(c.tipo).toBe('cutscene');
    expect(c.pessoas).toEqual(['MULHER']);
  });

  it('origem que não é do montar lore não quebra: sem tipo, tudo é texto', () => {
    const c = lerCitacao('uma frase citada', '');
    expect(c.tipo).toBeNull();
    expect(c.texto).toBe('uma frase citada');
  });

  it('citaPessoa ignora maiúscula', () => {
    const c = lerCitacao('JAMES: oi', 'x · diálogo, Cap. 1');
    expect(citaPessoa(c, 'James')).toBe(true);
    expect(semRepetir(['A', 'a', 'B'])).toEqual(['A', 'B']);
  });
});
