import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { LoadingBarService } from '../services/loading-bar.service';

export const loadingBarInterceptor: HttpInterceptorFn = (req, next) => {
  const bar = inject(LoadingBarService);
  bar.increment();
  return next(req).pipe(finalize(() => bar.decrement()));
};
