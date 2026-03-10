import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isPlatformServer, isPlatformBrowser } from '@angular/common';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { NG_AUTH_OPTIONS, resolveOptions } from './auth.config';

/**
 * Route guard for public-only routes (login, register, etc.).
 *
 * - **SSR + not initialized**: returns `true` (avoid premature redirect).
 * - **Authenticated**: redirects to `homeUrl` (default: `'/'`).
 * - **Not authenticated**: returns `true`.
 * - **Not initialized**: calls `AuthService.checkSession()` first, then decides.
 *
 * @example
 * ```ts
 * { path: 'login', canActivate: [guestGuard], component: LoginComponent }
 * ```
 */
export const guestGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const platformId = inject(PLATFORM_ID);
    const opts = resolveOptions(inject(NG_AUTH_OPTIONS, { optional: true }));

    // SSR: avoid redirect during server-side rendering
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

    if (authService.isAuthenticated()) {
        return redirect(opts.homeUrl);
    }

    if (authService.isInitialized()) return true;

    // Not yet initialized: check session first
    return authService.checkSession().pipe(
        map(user => user ? redirect(opts.homeUrl) : true)
    );
};
