import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const user = auth.currentUser();

  if (!user) return next(req);

  const enriched = req.clone({
    setHeaders: {
      'X-User-Role':  user.role  ?? '',
      'X-User-Email': user.email ?? '',
    },
  });

  return next(enriched);
};
