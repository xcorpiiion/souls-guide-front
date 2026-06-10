import { describe, expect, it } from 'vitest';
import { addDays, formatDate, formatRelative } from './date-utils';

describe('formatDate', () => {
  const date = new Date(2025, 5, 10, 14, 30, 5); // 10/06/2025 14:30:05

  it('formata shortDate', () => {
    expect(formatDate(date, 'shortDate')).toBe('10/06/2025');
  });

  it('formata longDate', () => {
    expect(formatDate(date, 'longDate')).toBe('10 de junho de 2025');
  });

  it('formata shortTime', () => {
    expect(formatDate(date, 'shortTime')).toBe('14:30');
  });

  it('formata shortDateTime', () => {
    expect(formatDate(date, 'shortDateTime')).toBe('10/06/2025 14:30');
  });

  it('formata datePicker', () => {
    expect(formatDate(date, 'datePicker')).toBe('2025-06-10');
  });

  it('retorna string vazia para data inválida', () => {
    expect(formatDate(new Date('invalid'), 'shortDate')).toBe('');
  });
});

describe('addDays', () => {
  it('adiciona dias corretamente', () => {
    const base = new Date(2025, 5, 10);
    const result = addDays(base, 5);
    expect(result.getDate()).toBe(15);
  });

  it('não muta a data original', () => {
    const base = new Date(2025, 5, 10);
    addDays(base, 5);
    expect(base.getDate()).toBe(10);
  });

  it('subtrai dias com valor negativo', () => {
    const base = new Date(2025, 5, 10);
    expect(addDays(base, -3).getDate()).toBe(7);
  });
});

describe('formatRelative', () => {
  it('retorna "hoje" para a data atual', () => {
    expect(formatRelative(new Date())).toBe('hoje');
  });

  it('retorna "ontem" para o dia anterior', () => {
    expect(formatRelative(addDays(new Date(), -1))).toBe('ontem');
  });

  it('retorna "amanhã" para o dia seguinte', () => {
    expect(formatRelative(addDays(new Date(), 1))).toBe('amanhã');
  });

  it('retorna data formatada para datas mais distantes', () => {
    const data = new Date(2024, 0, 15);
    expect(formatRelative(data)).toBe('15/01/2024');
  });
});
