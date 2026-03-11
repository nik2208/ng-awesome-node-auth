# NG Awesome Node Auth Project

This project combines a powerful Node.js authentication backend using `awesome-node-auth` with a modern Angular frontend utilizing the `ng-awesome-node-auth` library.

## Project Structure

- **Angular Application**: Located in `src/app`.
- **Express Server**: Located in `src/server.ts` (handles SSR and API routing).
- **In-Memory Stores**: Located in `src/server/` (User and Settings stores).

---

## 🚀 Server-Side Implementation

The server is built with Express and handles both the Angular SSR engine and the `awesome-node-auth` backend.

### 1. Auth Configuration (`src/server/auth.config.ts`)

Define your stores and core authentication settings.

```typescript
import { AuthConfigurator, AuthConfig } from 'awesome-node-auth';
import { InMemoryUserStore } from './in-memory-user-store';
import { InMemorySettingsStore } from './in-memory-settings-store';
import { join } from 'node:path';

export const userStore = new InMemoryUserStore();
export const settingsStore = new InMemorySettingsStore();
export const uploadDir = join(process.cwd(), 'public/uploads');

export const authConfig: AuthConfig = {
  apiPrefix: '/api/auth',
  accessTokenSecret: process.env['JWT_SECRET'],
  ui: { enabled: true },
  email: { siteUrl: 'http://localhost:4200' }
};

export const authConfigurator = new AuthConfigurator(authConfig, userStore);
```

### 2. API Routes (`src/server/auth.routes.ts`)

Mount the authentication router and the Admin Panel.

```typescript
import { Router } from 'express';
import { authConfigurator, settingsStore, uploadDir } from './auth.config';

const router = Router();

router.use('/', authConfigurator.router({
  settingsStore,
  uploadDir,
  onRegister: async (data) => {
    // Custom registration logic (e.g., password hashing)
    return userStore.create(data);
  }
}));

export default router;
```

### 3. Main Server Entry (`src/server.ts`)

Wire everything together, including the Admin Panel and Angular SSR.

```typescript
import express from 'express';
import { createAdminRouter } from 'awesome-node-auth';
import authRoutes from './server/auth.routes';
import { userStore, settingsStore, uploadDir, ADMIN_SECRET } from './server/auth.config';

const app = express();

// Auth API & UI
app.use('/api/auth', authRoutes);

// Admin Panel (mounted at root for correct path resolution)
app.use('/admin/auth', createAdminRouter(userStore, {
  adminSecret: ADMIN_SECRET,
  settingsStore,
  uploadDir,
  apiPrefix: '/api/auth'
}));

// Fallback for all other routes to Angular SSR
app.use('**', angularSsrHandler);
```

---

### 1. Breaking SSR Routing Loops
When using Angular SSR, the server tries to render all routes. If an unauthenticated user hits `/dashboard`, Angular redirects to `/login`. If `/login` is also handled by Angular (and it's a SPA), this can lead to infinite loops.

**The Solution:**
Handle auth redirects at the **Express server level** before the Angular engine. This ensures the browser is redirected to the backend-served UI pages:

```typescript
const authPaths = ['login', 'register', 'forgot-password', 'reset-password', '2fa', 'verify-email'];

authPaths.forEach(p => {
  app.get(`/${p}`, (req, res) => {
    // Redirect to the backend-served UI, preserving query parameters
    const query = req.url.includes('?') ? '?' + req.url.split('?')[1] : '';
    res.redirect(`/api/auth/ui/${p}${query}`);
  });
});
```

### 2. Preventing Build-Time Server Starts
Angular's build process (`ng build`) imports your server module to extract routes. If your server starts listening on a port during this phase, the build will hang.

**The Solution:**
Wrap your `app.listen()` block with a check for `isMainModule()`:

```typescript
import { isMainModule } from '@angular/ssr/node';

if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4200;
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}
```
This ensures the server only starts during actual execution, not during the build.

### 3. Wildcard SSR Route
In `src/app/app.routes.server.ts`, ensure you have a wildcard route configured for server rendering to handle the fallback correctly:
  ```typescript
  export const serverRoutes: ServerRoute[] = [
    { path: '**', renderMode: RenderMode.Server }
  ];
  ```

---

## ⚙️ Enabling Full Admin Features
To unlock all features in the Admin Panel (Settings, Uploads, Theme Sync), the `createAdminRouter` must be configured with:
- `settingsStore`: Enables the "Control" tab for real-time UI customization.
- `uploadDir`: Enables file uploads for logos and backgrounds.
- `apiPrefix`: Essential for the Admin Panel to correctly resolve the Auth API endpoints.

```typescript
app.use('/admin/auth', createAdminRouter(userStore, {
  adminSecret: ADMIN_SECRET,
  settingsStore,
  uploadDir,
  apiPrefix: '/api/auth'
}));
```

---

## 🎨 Frontend Implementation

The Angular app uses the `ng-awesome-node-auth` library for seamless integration.

### 1. App Configuration (`src/app/app.config.ts`)

```typescript
import { provideAuth, provideAuthUi } from 'ng-awesome-node-auth';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAuth({ apiPrefix: '/api/auth' }),
    provideAuthUi() // For theme synchronization and config-aware UI
  ]
};
```

### 2. Route Protection (`src/app/app.routes.ts`)

```typescript
import { authGuard, guestGuard } from 'ng-awesome-node-auth';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] }
];
```

---

## 🛠️ Development

### Scripts

- `npm run dev`: Start Angular dev server.
- `npm run build:ssr`: Build the Angular application and the Express server for production.
- `node dist/ng-awesome-node-auth-prj/server/server.mjs`: Start the production server.

### Maintenance

The project includes an auto-cleanup timer in `server.ts` that clears the in-memory user database every 5 minutes during testing.
