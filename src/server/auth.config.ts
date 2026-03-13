import {
  AuthConfigurator,
  AuthConfig,
  AuthError,
  BaseUser,
  GoogleStrategy,
} from 'awesome-node-auth';
import { InMemoryUserStore } from './in-memory-user-store';
import { InMemorySettingsStore } from './in-memory-settings-store';
import { InMemorySessionStore } from './in-memory-session-store';
import { InMemoryApiKeyStore } from './in-memory-api-key-store';
import { InMemoryWebhookStore } from './in-memory-webhook-store';
import { InMemoryTelemetryStore } from './in-memory-telemetry-store';

import { join } from 'node:path';

// ---- Initialize Stores ----
export const userStore = new InMemoryUserStore();
export const rbacStore = userStore; // Consolidated
export const metadataStore = userStore; // Consolidated
export const settingsStore = new InMemorySettingsStore();
export const sessionStore = new InMemorySessionStore();
userStore.setSessionStore(sessionStore);
export const apiKeyStore = new InMemoryApiKeyStore();
export const webhookStore = new InMemoryWebhookStore();
export const telemetryStore = new InMemoryTelemetryStore();

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
    },
    mailer: {
      endpoint: process.env['MAILER_ENDPOINT'] || '',
      apiKey: process.env['MAILER_APIKEY'] || '',
      provider: process.env['MAILER_PROVIDER'] || 'smtp',
      from: process.env['MAILER_FROM_EMAIL'] || 'noreply@example.com',
      fromName: process.env['MAILER_FROM_NAME'] || 'Demo App',
    }
  },
  oauth: {
    google: {
      clientId: process.env['GOOGLE_CLIENT_ID'] || '',
      clientSecret: process.env['GOOGLE_CLIENT_SECRET'] || '',
      callbackUrl: process.env['GOOGLE_CALLBACK_URL'] || 'http://localhost:4200/api/auth/oauth/google/callback',
    }
  },
  buildTokenPayload: (user: BaseUser) => ({
    sub: user.id,
    email: user.email,
    firstName: (user as any).firstName,
    lastName: (user as any).lastName,
    role: user.role,
  }),
};

// ---- OAuth Strategies ----

export class MyGoogleStrategy extends GoogleStrategy {
  constructor() {
    super(authConfig);
  }

  async findOrCreateUser(profile: { id: string; email: string; emailVerified?: boolean; name?: string; picture?: string }): Promise<BaseUser> {
    const { id, email, name, picture, emailVerified } = profile;

    const existingByProvider = await userStore.findByProviderAccount('google', id);
    if (existingByProvider) return existingByProvider;

    const existingByEmail = await userStore.findByEmail(email);
    if (existingByEmail) return existingByEmail;

    const [firstName, ...lastNameParts] = (name || '').split(' ');
    const lastName = lastNameParts.join(' ');

    const newUser = await userStore.create({
      email,
      firstName,
      lastName,
      picture,
      loginProvider: 'google',
      providerAccountId: id,
      isEmailVerified: emailVerified || false,
      role: 'user',
    });

    return newUser;
  }
}

export const googleStrategy = new MyGoogleStrategy();

// ---- Instantiate AuthConfigurator ----
export const authConfigurator = new AuthConfigurator(authConfig, userStore);

// ---- Export admin secret for admin router ----
export { ADMIN_SECRET };
