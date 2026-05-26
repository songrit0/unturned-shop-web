import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.token) { router.navigate(['/login']); return false; }
  const me = auth.current ?? (await firstValueFrom(auth.refreshMe()));
  if (!me?.is_admin) { router.navigate(['/']); return false; }
  return true;
};
