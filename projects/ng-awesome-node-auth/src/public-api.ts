/**
 * ng-awesome-node-auth
 *
 * Angular interceptor, guards and session service for awesome-node-auth backends.
 *
 * @example
 * ```ts
 * // app.config.ts
 * import { provideAuth } from 'ng-awesome-node-auth';
 *
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideRouter(routes),
 *     provideAuth({ apiPrefix: '/api/auth' }),
 *   ]
 * };
 *
 * // app.routes.ts
 * import { authGuard, guestGuard } from 'ng-awesome-node-auth';
 *
 * export const routes: Routes = [
 *   { path: 'login', canActivate: [guestGuard], component: LoginComponent },
 *   { path: 'dashboard', canActivate: [authGuard], component: DashboardComponent },
 * ];
 * ```
 */

export { provideAuth } from './lib/provide-auth';
export { authInterceptor } from './lib/auth.interceptor';
export { authGuard } from './lib/auth.guard';
export { guestGuard } from './lib/guest.guard';
export { AuthService } from './lib/auth.service';
export type { AuthUser } from './lib/auth.service';
export type { NgAuthOptions } from './lib/auth.config';
export { NG_AUTH_OPTIONS, AUTH_SERVICE } from './lib/auth.config';
