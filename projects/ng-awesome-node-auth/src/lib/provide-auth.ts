import {
    EnvironmentProviders,
    makeEnvironmentProviders,
    provideAppInitializer,
    inject
} from '@angular/core';
import {
    provideHttpClient,
    withFetch,
    withInterceptors,
} from '@angular/common/http';
import { NgAuthOptions, NG_AUTH_OPTIONS, AUTH_SERVICE } from './auth.config';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';

/**
 * Configures ng-awesome-node-auth for the Angular application.
 *
 * Registers:
 * - `NG_AUTH_OPTIONS` injection token
 * - `AuthService` (or a custom subclass via `authService` option)
 * - `AUTH_SERVICE` token (aliased to the same instance)
 * - `provideHttpClient(withFetch(), withInterceptors([authInterceptor]))`
 * - An `APP_INITIALIZER` that calls `AuthService.checkSession()` on startup
 *
 * @example
 * ```ts
 * // Default — uses awesome-node-auth built-in UI for login redirect
 * provideAuth({ apiPrefix: '/api/auth' })
 *
 * // Custom Angular login page
 * provideAuth({ apiPrefix: '/api/auth', loginUrl: '/login' })
 *
 * // Manual initialization order control
 * provideAuth({ apiPrefix: '/api/auth', initializeOnStartup: false })
 *
 * // Custom AuthService subclass
 * provideAuth({ apiPrefix: '/api/auth', authService: MyAuthService })
 *
 * // Bring your own HttpClient
 * provideAuth({ apiPrefix: '/api/auth', manageHttpClient: false })
 * ```
 */
export function provideAuth(
    options?: NgAuthOptions & { manageHttpClient?: boolean }
): EnvironmentProviders {
    const {
        manageHttpClient = true,
        initializeOnStartup = true,
        authService: CustomAuthService,
        ...authOptions
    } = options ?? {};

    const ServiceClass = CustomAuthService ?? AuthService;

    const providers: any[] = [
        { provide: NG_AUTH_OPTIONS, useValue: authOptions },
        // useFactory ensures Angular sets up the DI context BEFORE calling new ServiceClass(),
        // which makes inject() calls inside the constructor valid (fixes NG0203).
        {
            provide: AuthService,
            useFactory: () => new ServiceClass(),
        },
        { provide: AUTH_SERVICE, useExisting: AuthService },
    ];

    if (initializeOnStartup) {
        providers.push(
            provideAppInitializer(() => {
                const authService = inject(AuthService);
                return authService.checkSession();
            })
        );
    }

    if (manageHttpClient) {
        providers.push(
            provideHttpClient(withFetch(), withInterceptors([authInterceptor]))
        );
    }

    return makeEnvironmentProviders(providers);
}
