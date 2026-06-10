import { failure, Result, success } from '../models/result';

export function groupBy<T>(array: T[], keyGetter: (item: T) => string | number): Record<string | number, T[]> {
  return array.reduce<Record<string | number, T[]>>((acc, item) => {
    const key = keyGetter(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

export function uniqBy<T>(array: T[], keyGetter: (item: T) => unknown): T[] {
  const seen = new Set();
  return array.filter((item) => {
    const key = keyGetter(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function toDictionary<T>(array: T[], keyGetter: (item: T) => string | number): Record<string | number, T> {
  return array.reduce<Record<string | number, T>>((acc, item) => {
    acc[keyGetter(item)] = item;
    return acc;
  }, {});
}

export function safeFind<T>(array: T[], predicate: (item: T) => boolean): Result<T> {
  const item = array.find(predicate);
  return item === undefined ? failure(new Error('Item não encontrado.')) : success(item);
}

export function sortBy<T>(array: T[], keyGetter: (item: T) => string | number, direction: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const valA = keyGetter(a);
    const valB = keyGetter(b);
    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

export function chunk<T>(array: T[], size: number): T[][] {
  if (size <= 0) return [];
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) result.push(array.slice(i, i + size));
  return result;
}

export function splitBy<T>(array: T[], predicate: (item: T) => boolean): [T[], T[]] {
  const pass: T[] = [];
  const fail: T[] = [];
  for (const item of array) (predicate(item) ? pass : fail).push(item);
  return [pass, fail];
}
