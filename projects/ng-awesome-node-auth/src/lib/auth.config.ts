import { InjectionToken } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Configuration options for ng-awesome-node-auth.
 */
export interface NgAuthOptions {
    /**
     * Base path where the awesome-node-auth router is mounted on the backend.
     * @default '/auth'
     * @example '/api/auth'
     */
    apiPrefix?: string;

    /**
     * URL to redirect to after a successful login (used by guestGuard).
     * @default '/'
     */
    homeUrl?: string;

    /**
     * URL to redirect to when the user is not authenticated.
     * Defaults to `${apiPrefix}/ui/login` which points to the built-in UI
     * served by the awesome-node-auth backend.
     * Override this if you have your own login page in the Angular app.
     * @default `${apiPrefix}/ui/login`
     * @example '/login'
     */
    loginUrl?: string;

    /**
     * Custom AuthService class to use instead of the default implementation.
     * Must extend AuthService.
     * @example
     * ```ts
     * class MyAuthService extends AuthService {
     *   override login(email: string, password: string) {
     *     return super.login(email, password);
     *   }
     * }
     * provideAuth({ apiPrefix: '/api/auth', authService: MyAuthService })
     * ```
     */
    authService?: new () => AuthService;

    /**
     * Whether provideAuth should automatically call AuthService.checkSession()
     * on application startup via APP_INITIALIZER.
     * Set to false if you need to control initialization order manually.
     * @default true
     */
    initializeOnStartup?: boolean;

    /**
     * If true, prevents automatic window.location redirects (e.g. on 401/403 or logout).
     * Useful for apps that want to manage navigation manually.
     * @default false
     */
    headless?: boolean;
}

/** @internal resolved defaults */
export function resolveOptions(opts: NgAuthOptions | null): {
    apiPrefix: string;
    homeUrl: string;
    loginUrl: string;
    headless: boolean;
} {
    const apiPrefix = opts?.apiPrefix ?? '/auth';
    return {
        apiPrefix,
        homeUrl: opts?.homeUrl ?? '/',
        loginUrl: opts?.loginUrl ?? `${apiPrefix}/ui/login`,
        headless: opts?.headless ?? false,
    };
}

export const NG_AUTH_OPTIONS = new InjectionToken<NgAuthOptions>('NG_AUTH_OPTIONS');

/**
 * Injection token for the active `AuthService` instance.
 * Use this for explicit token-based injection when you don't know the concrete type.
 */
export const AUTH_SERVICE = new InjectionToken<AuthService>('AUTH_SERVICE');
