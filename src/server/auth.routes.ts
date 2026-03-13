import { Router } from 'express';
import {
  createAuthMiddleware,
  AuthError,
  AuthEventBus,
  AuthTools,
  createToolsRouter,
  SseManager,
  WebhookSender,
} from 'awesome-node-auth';
import {
  authConfigurator,
  authConfig,
  userStore,
  settingsStore,
  rbacStore,
  metadataStore,
  sessionStore,
  apiKeyStore,
  webhookStore,
  telemetryStore,
  googleStrategy,
  uploadDir,
  ADMIN_SECRET,
} from './auth.config';

const router = Router();



// ---- 1. Event system setup ----
const bus = new AuthEventBus();

// ---- 2. Tools (SSE, Webhooks, Telemetry) ----
const authTools = new AuthTools(bus, {
  telemetryStore,
  webhookStore,
  sse: true,
  sseOptions: {
    heartbeatIntervalMs: 30000,
    deduplicate: true,
  },
});

// Note: AuthTools doesn't have a listen() method in this version.
// It process events when track() is called.
// If your library version had listen(), it's likely removed or replaced by constructor logic.

// ---- 3. Middleware for validating auth tokens ----
const authMiddleware = createAuthMiddleware(authConfig);

// ---- 4. Mount the main auth router ----
// This exposes: /login, /register, /logout, /refresh, /reset-password, /verify-email, etc.
// Now includes session and RBAC stores.
router.use(
  '/',
  authConfigurator.router({
    settingsStore,
    rbacStore,
    metadataStore,
    sessionStore,
    googleStrategy,
    uploadDir,
    onRegister: async (data: any, config: any, options: any) => {
      // Validation
      if (!data.email || !data.password) {
        throw new AuthError('Email and password are required', 'MISSING_FIELDS', 400);
      }

      // Check if user already exists
      const existing = await userStore.findByEmail(data.email);
      if (existing) {
        throw new AuthError('Email already registered', 'EMAIL_EXISTS', 409);
      }

      // Hash the password before saving
      const passwordService = authConfigurator.passwordService;
      const hashed = await passwordService.hash(data.password, authConfig.bcryptSaltRounds || 10);

      // Create the user in the database
      const user = await userStore.create({
        ...data,
        password: hashed,
        loginProvider: 'local',
      });

      console.log(`[AUTH] New user registered: ${user.email} (ID: ${user.id})`);
      return user;
    },
  }),
);

// ---- 5. Mount the tools router at /tools (relative to /api/auth) ----
// Exposes: POST /tools/track/:event, GET /tools/telemetry, GET /tools/stream (SSE), etc.
router.use(
  '/tools',
  createToolsRouter(authTools, {
    authMiddleware,
    telemetryStore, // Required for GET /tools/telemetry
  }),
);

// ---- Custom endpoint: PATCH /profile ----
// Update user metadata (name, metadata, etc.)
router.patch('/profile', authMiddleware, async (req: any, res) => {
  try {
    const { firstName, lastName } = req.body;
    const userId = req.user.sub;

    const user = await userStore.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Update user fields (implement as needed)
    if (firstName) (user as any).firstName = firstName;
    if (lastName) (user as any).lastName = lastName;

    res.json({ success: true, user });
  } catch (err) {
    console.error('[AUTH] Profile update failed:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
