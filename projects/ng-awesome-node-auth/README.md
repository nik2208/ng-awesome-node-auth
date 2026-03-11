# ng-awesome-node-auth

An elegant, standalone Angular library providing interceptors, guards, and session management for frontends backed by `awesome-node-auth`.

This library is designed to be **lightweight and 100% tree-shakable**. You only ship the code you actually use.

## Installation

Install the library in your Angular project:

```bash
npm install ng-awesome-node-auth
```

## Quick Start

### 1. Configure Providers (`app.config.ts`)

Add `provideAuth` to your application configuration to set up the authentication interceptor and session manager.

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAuth, provideAuthUi } from 'ng-awesome-node-auth';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // Core Auth (Session management, interceptor, CSRF handling)
    provideAuth({ apiPrefix: '/api/auth' }),
    
    // Optional: UI Integration (Theme sync, config fetching)
    // If you don't call this, 0 bytes of UI code are added to your bundle.
    provideAuthUi(),
  ]
};
```

### 2. Protect Routes (`app.routes.ts`)

Use `authGuard` to protect private pages and `guestGuard` to redirect already-authenticated users away from login pages.

```typescript
import { Routes } from '@angular/router';
import { authGuard, guestGuard } from 'ng-awesome-node-auth';

export const routes: Routes = [
  { 
    path: 'login', 
    component: LoginComponent,
    canActivate: [guestGuard] // Redirects to '/' if already logged in
  },
  { 
    path: 'dashboard', 
    component: DashboardComponent,
    canActivate: [authGuard]  // Redirects to '/login' if not logged in
  }
];
```

## Optional UI Integration

If you use the built-in Vanilla UI from `awesome-node-auth` alongside your custom Angular frontend (e.g., for login pages or the Admin panel), you can strictly opt-in to UI Integration features.

By adding `provideAuthUi()` to your providers, the library will:
1. Automatically fetch the backend configuration (`apiPrefix/ui/config`) and expose it via the `UiConfigService`.
2. Automatically activate the `ThemeService`, which listens for live-preview CSS color updates from the Admin Panel and applies them instantly.

### Using `UiConfigService`

You can use the `UiConfigService` in your components to conditionally show features based on your backend configuration.

```typescript
import { Component, inject } from '@angular/core';
import { UiConfigService } from 'ng-awesome-node-auth';

@Component({
  template: `
    <div *ngIf="uiConfig.hasFeature('register')">
      <a routerLink="/register">Register</a>
    </div>
  `
})
export class LoginComponent {
  uiConfig = inject(UiConfigService);
}
```

## Advanced Configuration (`NgAuthOptions`)

The `provideAuth(options)` function accepts a configuration object with the following properties:

- `apiPrefix` (string): The base path of your auth API. Defaults to `'/auth'`.
- `homeUrl` (string): Where to redirect authenticated users when they hit a `guestGuard`. Defaults to `'/'`.
- `loginUrl` (string): Where to redirect unauthenticated users when they hit an `authGuard`. Defaults to `'/login'`.
- `manageHttpClient` (boolean): Whether the library should automatically provide `HttpClient` with the auth interceptor. Defaults to `true`.
- `initializeOnStartup` (boolean): Whether to automatically check the session (`/me`) on app startup. Defaults to `true`.
- `authService` (Type): Pass a custom subclass of `AuthService` if you need to override default behaviors.

## Services

### `AuthService` (Core)
Provides reactive signals and methods to manage the user's session.
- `user()`: Signal containing the current `AuthUser` or `null`.
- `isAuthenticated()`: Computed signal returning true if a user is logged in.
- `logout()`: Clears the session and redirects to the login page.
- `checkSession()`: Manually re-fetches the user session from the backend.
- `refreshToken()`: Manually attempts to refresh the access token using the HttpOnly refresh token cookie.
