import { Router } from 'express';
import { createAuthMiddleware, AuthError } from 'awesome-node-auth';
import {
  authConfigurator,
  authConfig,
  userStore,
  settingsStore,
  uploadDir,
  ADMIN_SECRET,
} from './auth.config';

const router = Router();

// ---- Middleware for validating auth tokens ----
const authMiddleware = createAuthMiddleware(authConfig);

// ---- Mount the main auth router ----
// This exposes: /login, /register, /logout, /refresh, /reset-password, /verify-email, etc.
// Plus: GET /login.html, /register.html, etc. (zero-dependency UI)
router.use(
  '/',
  authConfigurator.router({
    /* NOT NEEDED ON MAIN RELEASE OF awesome-node-auth (non beta)*/
    /*uiAssetsDir: require.resolve('awesome-node-auth-beta/package.json').replace('package.json', 'dist/ui-assets'),*/
    /* --------------------------------------------------------- */
    settingsStore,
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
