import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TopupService } from '../services/topup.service';

/**
 * Soft-launch gate for the Meowcoin top-up page.
 * Access = logged in AND (is_admin || !admin_only):
 *   - admin_only true  -> admins only; non-admins are redirected home.
 *   - admin_only false -> open to everyone (any logged-in user).
 * The login check is also covered by authGuard on the same route; kept here so the guard is
 * self-sufficient. Resolves `is_admin` exactly like adminGuard (cached `/auth/me`, else refresh).
 */
export const topupGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const topup = inject(TopupService);
  const router = inject(Router);

  if (!auth.token) { router.navigate(['/login']); return false; }

  const me = auth.current ?? (await firstValueFrom(auth.refreshMe()));
  const cfg = await firstValueFrom(topup.getTopupConfig());

  if (me?.is_admin || !cfg.admin_only) return true;

  router.navigate(['/']);
  return false;
};
