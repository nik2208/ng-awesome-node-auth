import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isPlatformServer, isPlatformBrowser } from '@angular/common';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { NG_AUTH_OPTIONS, resolveOptions } from './auth.config';

/**
 * Route guard for protected routes.
 *
 * - **SSR + not initialized**: returns `true` to avoid premature server-side redirect.
 * - **Authenticated**: returns `true`.
 * - **Not authenticated (initialized)**: redirects to `loginUrl` (default: `<apiPrefix>/ui/login`).
 * - **Not initialized**: calls `AuthService.checkSession()` first, then decides.
 *
 * @example
 * ```ts
 * { path: 'dashboard', canActivate: [authGuard], component: DashboardComponent }
 * ```
 */
export const authGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const platformId = inject(PLATFORM_ID);
    const opts = resolveOptions(inject(NG_AUTH_OPTIONS, { optional: true }));

    // SSR: avoid redirect during server-side rendering before session is known
    if (isPlatformServer(platformId) && !authService.isInitialized()) {
        return true;
    }

    const redirect = (targetUrl: string) => {
        if (targetUrl.startsWith('http') || targetUrl.startsWith(opts.apiPrefix)) {
            if (isPlatformBrowser(platformId)) {
                window.location.href = targetUrl;
            }
            return false;
        }
        return router.createUrlTree([targetUrl]);
    };

    if (authService.isAuthenticated()) return true;

    if (authService.isInitialized()) {
        return redirect(opts.loginUrl);
    }

    // Not yet initialized: check session first
    return authService.checkSession().pipe(
        map(user => user ? true : redirect(opts.loginUrl))
    );
};
