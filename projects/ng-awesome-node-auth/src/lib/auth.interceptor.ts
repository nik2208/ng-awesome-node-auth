import {
    HttpInterceptorFn,
    HttpRequest,
    HttpHandlerFn,
    HttpEvent,
    HttpErrorResponse,
} from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
    Observable,
    catchError,
    throwError,
    switchMap,
    finalize,
    shareReplay,
} from 'rxjs';
import { AuthService } from './auth.service';
import { NG_AUTH_OPTIONS, resolveOptions } from './auth.config';

let _refreshInProgress: Observable<{ success: boolean }> | null = null;

/**
 * Angular `HttpInterceptorFn` compatible with awesome-node-auth backends.
 *
 * Responsibilities:
 * 1. **Browser only**: attaches the `X-CSRF-Token` header from the `csrf-token` cookie.
 * 2. On **401 / 403** responses (excluding auth endpoints): calls `AuthService.refreshToken()`,
 *    then retries the original request with the fresh CSRF token.
 * 3. If refresh fails, delegates logout (and login redirect) to `AuthService`.
 * 4. **SSR**: skips all the above and passes the request through unchanged.
 *
 * Register via `withInterceptors([authInterceptor])` or via `provideAuth()`.
 */
export const authInterceptor: HttpInterceptorFn = (
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
    const platformId = inject(PLATFORM_ID);
    const authService = inject(AuthService);
    const opts = resolveOptions(inject(NG_AUTH_OPTIONS, { optional: true }));

    // ── SSR: pass through untouched ─────────────────────────────────────────
    if (!isPlatformBrowser(platformId)) {
        return next(req);
    }

    // ── Browser: attach CSRF token only for backend requests ────────────────
    const isBackendRequest = checkIsBackendRequest(req.url, opts.apiPrefix, platformId);
    const outgoing = isBackendRequest ? withCsrf(req) : req;

    return next(outgoing).pipe(
        catchError((err: unknown) => {
            if (
                err instanceof HttpErrorResponse &&
                (err.status === 401 || err.status === 403) &&
                !isAuthEndpoint(req.url, opts.apiPrefix)
            ) {
                // SESSION_REVOKED: permanent failure — skip refresh to avoid looping.
                // Call logout() to clear state and redirect as per config.
                if ((err.error as { code?: string } | null)?.code === 'SESSION_REVOKED') {
                    authService.logout();
                    return throwError(() => err);
                }
                return handleUnauthorized(req, next, authService, opts, platformId);
            }
            return throwError(() => err);
        })
    );
};

/**
 * Shared refresh flow: only one refresh request is in-flight at a time.
 * Concurrent requests queue up and all retry once the refresh resolves.
 */
function handleUnauthorized(
    req: HttpRequest<unknown>,
    next: HttpHandlerFn,
    authService: AuthService,
    opts: ReturnType<typeof resolveOptions>,
    platformId: object
): Observable<HttpEvent<unknown>> {
    const { apiPrefix, loginUrl, headless } = opts;
    
    if (!_refreshInProgress) {
        _refreshInProgress = authService.refreshToken().pipe(
            shareReplay(1),
            finalize(() => { _refreshInProgress = null; })
        );
    }

    return _refreshInProgress.pipe(
        switchMap(res => {
            if (res.success) {
                return next(withCsrf(req));
            }
            // Refresh failed. Clear user state.
            authService._setUser(null);

            // Redirection logic: only if NOT in headless mode and NOT an initial session check
            if (!headless && !req.url.includes(`${apiPrefix}/me`) && isPlatformBrowser(platformId)) {
                window.location.href = loginUrl;
            }

            return throwError(() => new Error('Session expired'));
        })
    );
}

function checkIsBackendRequest(url: string, prefix: string, platformId: object): boolean {
    if (!isPlatformBrowser(platformId)) return false;
    try {
        const pageBase = window.location.href;
        const backendOrigin = prefix.startsWith('http')
            ? new URL(prefix).origin
            : new URL(pageBase).origin;
        const requestOrigin = new URL(url, pageBase).origin;
        return backendOrigin === requestOrigin;
    } catch {
        return false;
    }
}

function withCsrf(req: HttpRequest<unknown>): HttpRequest<unknown> {
    const token = readCookie('__Host-csrf-token') || readCookie('__Secure-csrf-token') || readCookie('csrf-token');
    return token ? req.clone({ setHeaders: { 'X-CSRF-Token': token } }) : req;
}

function readCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const m = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[2]) : null;
}

function isAuthEndpoint(url: string, prefix: string): boolean {
    return [
        `${prefix}/login`,
        `${prefix}/logout`,
        `${prefix}/refresh`,
        `${prefix}/register`,
        `${prefix}/forgot-password`,
        `${prefix}/reset-password`,
        `${prefix}/2fa/verify`,
        `${prefix}/verify-email`,
        // /me is intentionally omitted so 401s on it trigger a token refresh
    ].some(p => url.includes(p));
}
