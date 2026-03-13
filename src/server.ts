import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import authRoutes from './server/auth.routes';
import { requestContext } from './server/utils/request-context';

import { createAdminRouter, createApiKeyMiddleware } from 'awesome-node-auth';
import {
  userStore,
  settingsStore,
  rbacStore,
  metadataStore,
  sessionStore,
  apiKeyStore,
  webhookStore,
  telemetryStore,
  uploadDir,
  ADMIN_SECRET,
} from './server/auth.config';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
let angularApp: AngularNodeAppEngine | undefined;

// ---- Early logging for debug ----
console.log('[SERVER] isMainModule:', isMainModule(import.meta.url));
console.log('[SERVER] process.argv[1]:', process.argv[1]);

// ---- Middleware ----
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use((req, res, next) => {
  requestContext.run({ req }, () => next());
});

// ---- 1. API Key Protection (M2M) ----
// Protect everything under /api EXCEPT /api/auth (which is handles login/registration)
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth')) return next();
  createApiKeyMiddleware(apiKeyStore)(req, res, next);
});

// ---- 2. Auth UI Redirects - handle at server level to break SPA routing loops ----
const authPaths = ['login', 'register', 'forgot-password', 'reset-password', '2fa', 'verify-email'];
authPaths.forEach(p => {
  app.get(`/${p}`, (req, res) => res.redirect(`/api/auth/ui/${p}${req.url.includes('?') ? '?' + req.url.split('?')[1] : ''}`));
});

// ---- 3. Auth routes (mounted at /api/auth) ----
app.use('/api/auth', authRoutes);
console.log('[SERVER] Auth routes mounted');

// ---- 4. Mount the admin router ----
// Now with full set of stores to enable all tabs
const adminRouter = createAdminRouter(userStore, {
  adminSecret: ADMIN_SECRET,
  settingsStore,
  rbacStore,
  userMetadataStore: metadataStore,
  sessionStore,
  apiKeyStore,
  webhookStore,
  uploadDir,
  apiPrefix: '/api/auth',
  swagger: true, // Enable swagger UI for documentation
});
app.use('/admin/auth', adminRouter);
console.log('[SERVER] Admin routes mounted');

// ---- Maintenance Timer: Clear in-memory users every 30 minutes ----
setInterval(() => {
  console.log('[SERVER] Running scheduled store maintenance...');
  userStore.deleteUser('dummy-test-user').catch(() => { }); // example
}, 30 * 60 * 1000);

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 * Lazily instantiate AngularNodeAppEngine only when needed (not during build).
 */
app.use((req, res, next) => {
  if (!angularApp) {
    angularApp = new AngularNodeAppEngine();
  }
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4200.
 * 
 * This block is SKIPPED during `ng build` when isMainModule() returns false.
 */
const isProcessServer = process.argv[1]?.includes('server.mjs') || process.env['pm_id'];

if (isMainModule(import.meta.url) || isProcessServer) {
  const port = process.env['PORT'] || 4200;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`\n[SERVER] ✓ Express server listening on http://localhost:${port}`);
    console.log(`[SERVER] - Demo Dashboard: http://localhost:${port}/`);
    console.log(`[SERVER] - Auth API: http://localhost:${port}/api/auth`);
    console.log(`[SERVER] - Tools API: http://localhost:${port}/api/auth/tools`);
    console.log(`[SERVER] - Admin Panel: http://localhost:${port}/admin/auth\n`);
  });
} else {
  console.log('[SERVER] Bypassing app.listen() - running in build/import context\n');
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
