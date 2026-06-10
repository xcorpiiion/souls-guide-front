import { isDevMode } from '@angular/core';
import {
  BehaviorSubject, debounceTime, distinctUntilChanged, filter,
  finalize, iif, map, Observable, of, OperatorFunction, retry,
  switchMap, tap, timer,
} from 'rxjs';

export function filterNil<T>(): OperatorFunction<T | null | undefined, T> {
  return filter((value): value is T => value != null);
}

export function tapLog<T>(tag: string): OperatorFunction<T, T> {
  if (!isDevMode()) return tap();
  return tap({
    next:     (v) => console.log(`%c[${tag}] Next:`,     'color: cyan',    v),
    error:    (e) => console.error(`%c[${tag}] Error:`,  'color: red',     e),
    complete: () => console.log(`%c[${tag}] Complete`,   'color: green'),
  });
}

export function mapArrayItems<T, K extends keyof T>(key: K): OperatorFunction<T[], T[K][]> {
  return map((array: T[]) => array.map((item) => item[key]));
}

export function retryWithBackoff<T>(maxRetries = 3, initialDelay = 1000): OperatorFunction<T, T> {
  return retry({
    count: maxRetries,
    delay: (retryCount) => timer(initialDelay * Math.pow(2, retryCount - 1)),
  });
}

export function distinctUntilChangedBy<T>(keyGetter: (item: T) => unknown): OperatorFunction<T, T> {
  return distinctUntilChanged((prev, curr) => keyGetter(prev) === keyGetter(curr));
}

export function onNilReturn<T>(defaultValue: T): OperatorFunction<T | null | undefined, T> {
  return map((value) => value ?? defaultValue);
}

export function searchInput(debounceMs = 300, minLength = 2): (source: Observable<string>) => Observable<string> {
  return (source) =>
    source.pipe(
      debounceTime(debounceMs),
      map((text) => text.trim()),
      filter((text) => text.length === 0 || text.length >= minLength),
      distinctUntilChanged(),
    );
}

export function indicate<T>(indicator: BehaviorSubject<boolean>): (source: Observable<T>) => Observable<T> {
  return (source) =>
    source.pipe(
      tap(() => indicator.next(true)),
      finalize(() => indicator.next(false)),
    );
}

export function switchMapAndCombine<T, R>(project: (value: T) => Observable<R>): OperatorFunction<T, [T, R]> {
  return switchMap((outer: T) => project(outer).pipe(map((inner: R) => [outer, inner] as [T, R])));
}

export function iifPipe<T, R, F>(
  condition: (value: T) => boolean,
  trueResult: (value: T) => Observable<R>,
  falseResult: (value: T) => Observable<F> = () => of() as Observable<F>,
): OperatorFunction<T, R | F> {
  return switchMap((value: T) => iif(() => condition(value), trueResult(value), falseResult(value)));
}
