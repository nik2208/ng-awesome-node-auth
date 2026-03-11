import {
  AuthConfigurator,
  AuthConfig,
  AuthError,
} from 'awesome-node-auth';
import { InMemoryUserStore } from './in-memory-user-store';
import { InMemorySettingsStore } from './in-memory-settings-store';

import { join } from 'node:path';

// ---- Initialize Stores ----
export const userStore = new InMemoryUserStore();
export const settingsStore = new InMemorySettingsStore();
export const uploadDir = join(process.cwd(), 'public/uploads');

// ---- Configure Auth ----
const JWT_SECRET = process.env['JWT_SECRET'] || 'your-secret-key-change-in-production';
const ADMIN_SECRET = process.env['ADMIN_SECRET'] || 'admin-secret-key-change-in-production';

export const authConfig: AuthConfig = {
  apiPrefix: '/api/auth',
  accessTokenSecret: JWT_SECRET,
  refreshTokenSecret: JWT_SECRET + '_refresh',
  accessTokenExpiresIn: '15m',
  refreshTokenExpiresIn: '7d',
  cookieOptions: {
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'lax',
  },
  ui: {
    enabled: true,
  },
  csrf: {
    enabled: true,
  },
  emailVerificationMode: (process.env['EMAIL_VERIFICATION_MODE'] || 'none') as 'none' | 'lazy' | 'strict',
  bcryptSaltRounds: 10,
  email: {
    siteUrl: process.env['SITE_URL'] || 'http://localhost:4200',
    sendWelcome: async (email: string, data: any) => {
      console.log(`[AUTH] Welcome email for ${email}`, data);
      // In production, integrate with MailerService (SendGrid, PostMark, etc.)
    },
  },
};

// ---- Instantiate AuthConfigurator ----
export const authConfigurator = new AuthConfigurator(authConfig, userStore);

// ---- Export admin secret for admin router ----
export { ADMIN_SECRET };
