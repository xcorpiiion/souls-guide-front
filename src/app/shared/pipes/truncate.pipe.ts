import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'truncate' })
export class TruncatePipe implements PipeTransform {
  transform(value: string | null | undefined, limit = 100, ellipsis = '...'): string {
    if (!value || value.length <= limit) return value ?? '';
    return value.substring(0, limit) + ellipsis;
  }
}
