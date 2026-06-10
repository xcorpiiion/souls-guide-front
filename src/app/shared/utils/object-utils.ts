export function deepClone<T>(source: T): T {
  if (Array.isArray(source)) return source.map((item) => deepClone(item)) as unknown as T;
  if (typeof source === 'object' && source !== null) {
    const clone = {} as T;
    for (const key in source) {
      if (Object.hasOwn(source, key)) clone[key] = deepClone(source[key]);
    }
    return clone;
  }
  return source;
}

export function isNull(value: unknown): value is null | undefined {
  return value == null;
}

export function isEmpty(value: unknown): boolean {
  if (isNull(value)) return true;
  if (typeof value === 'string' || Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

export function getAllAsNonNull<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return (Object.keys(obj) as Array<keyof T>).reduce<Partial<T>>((acc, key) => {
    const val = typeof obj[key] === 'string' ? (obj[key] as string).trim() as T[keyof T] : obj[key];
    if (!isEmpty(val)) acc[key] = val;
    return acc;
  }, {});
}

export function pluck<T, P extends keyof T>(array: T[], property: P): T[P][] {
  return array.map((item) => item[property]);
}

export function pick<T extends object, K extends keyof T>(source: T, ...properties: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const prop of properties) {
    if (prop in source) result[prop] = source[prop];
  }
  return result;
}

export function debounce<T extends (...args: unknown[]) => unknown>(func: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (this: unknown, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
