import { IUserStore, BaseUser } from 'awesome-node-auth';

/**
 * In-memory IUserStore implementation for MVE (Minimal Viable Example).
 * Data is lost on server restart — suitable for testing/prototyping only.
 * 
 * Implements all required IUserStore methods so every auth feature works:
 * password reset, magic link, TOTP, email verification, account linking, etc.
 */
export class InMemoryUserStore implements IUserStore {
  private users = new Map<string, BaseUser>();
  private nextId = 1;

  // ---- Core CRUD -------------------------------------------------------

  async findByEmail(email: string): Promise<BaseUser | null> {
    return [...this.users.values()].find(u => u.email === email) ?? null;
  }

  async findById(id: string): Promise<BaseUser | null> {
    return this.users.get(id) ?? null;
  }

  async create(data: Partial<BaseUser>): Promise<BaseUser> {
    const id = String(this.nextId++);
    const user: BaseUser = {
      id,
      email: data.email ?? '',
      ...data
    };
    this.users.set(id, user);
    return user;
  }

  // ---- Token updates ---------------------------------------------------

  async updateRefreshToken(userId: string, token: string | null, expiry: Date | null): Promise<void> {
    const u = this.users.get(userId);
    if (u) {
      u.refreshToken = token;
      u.refreshTokenExpiry = expiry;
    }
  }

  async updateLastLogin(userId: string): Promise<void> {
    const u = this.users.get(userId);
    if (u) u.lastLogin = new Date();
  }

  async updateResetToken(userId: string, token: string | null, expiry: Date | null): Promise<void> {
    const u = this.users.get(userId);
    if (u) {
      u.resetToken = token;
      u.resetTokenExpiry = expiry;
    }
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    const u = this.users.get(userId);
    if (u) u.password = hashedPassword;
  }

  async updateTotpSecret(userId: string, secret: string | null): Promise<void> {
    const u = this.users.get(userId);
    if (u) {
      u.totpSecret = secret;
      u.isTotpEnabled = secret !== null;
    }
  }

  async updateMagicLinkToken(userId: string, token: string | null, expiry: Date | null): Promise<void> {
    const u = this.users.get(userId);
    if (u) {
      u.magicLinkToken = token;
      u.magicLinkTokenExpiry = expiry;
    }
  }

  async updateSmsCode(userId: string, code: string | null, expiry: Date | null): Promise<void> {
    const u = this.users.get(userId);
    if (u) {
      u.smsCode = code;
      u.smsCodeExpiry = expiry;
    }
  }

  // ---- Optional look-ups (needed for reset-password & magic-link) ------

  async findByResetToken(token: string): Promise<BaseUser | null> {
    return [...this.users.values()].find(u => u.resetToken === token) ?? null;
  }

  async findByMagicLinkToken(token: string): Promise<BaseUser | null> {
    return [...this.users.values()].find(u => u.magicLinkToken === token) ?? null;
  }

  // ---- Email verification -----------------------------------------------

  async updateEmailVerificationToken(
    userId: string,
    token: string | null,
    expiry: Date | null,
  ): Promise<void> {
    const u = this.users.get(userId);
    if (u) {
      u.emailVerificationToken = token;
      u.emailVerificationTokenExpiry = expiry;
    }
  }

  async updateEmailVerified(userId: string, isVerified: boolean): Promise<void> {
    const u = this.users.get(userId);
    if (u) u.isEmailVerified = isVerified;
  }

  async findByEmailVerificationToken(token: string): Promise<BaseUser | null> {
    return [...this.users.values()].find(u => u.emailVerificationToken === token) ?? null;
  }

  // ---- Change email -----------------------------------------------------

  async updateEmailChangeToken(
    userId: string,
    pendingEmail: string | null,
    token: string | null,
    expiry: Date | null,
  ): Promise<void> {
    const u = this.users.get(userId);
    if (u) {
      u.pendingEmail = pendingEmail;
      u.emailChangeToken = token;
      u.emailChangeTokenExpiry = expiry;
    }
  }

  async updateEmail(userId: string, newEmail: string): Promise<void> {
    const u = this.users.get(userId);
    if (u) {
      u.email = newEmail;
      u.pendingEmail = null;
      u.emailChangeToken = null;
      u.emailChangeTokenExpiry = null;
    }
  }

  async findByEmailChangeToken(token: string): Promise<BaseUser | null> {
    return [...this.users.values()].find(u => u.emailChangeToken === token) ?? null;
  }

  // ---- Account linking -------------------------------------------------

  async updateAccountLinkToken(
    userId: string,
    pendingEmail: string | null,
    pendingProvider: string | null,
    token: string | null,
    expiry: Date | null,
  ): Promise<void> {
    const u = this.users.get(userId);
    if (u) {
      u.accountLinkPendingEmail = pendingEmail;
      u.accountLinkPendingProvider = pendingProvider;
      u.accountLinkToken = token;
      u.accountLinkTokenExpiry = expiry;
    }
  }

  async findByAccountLinkToken(token: string): Promise<BaseUser | null> {
    return [...this.users.values()].find(u => u.accountLinkToken === token) ?? null;
  }

  // ---- OAuth provider lookup --------------------------------------------

  async findByProviderAccount(provider: string, providerAccountId: string): Promise<BaseUser | null> {
    return [...this.users.values()].find(
      u => u.loginProvider === provider && u.providerAccountId === providerAccountId
    ) ?? null;
  }

  // ---- 2FA policy -------------------------------------------------------

  async updateRequire2FA(userId: string, required: boolean): Promise<void> {
    const u = this.users.get(userId);
    if (u) u.require2FA = required;
  }

  // ---- Admin listing ---------------------------------------------------

  async listUsers(limit: number, offset: number): Promise<BaseUser[]> {
    return [...this.users.values()].slice(offset, offset + limit);
  }

  async deleteUser(userId: string): Promise<void> {
    this.users.delete(userId);
  }

  async clearAll(): Promise<void> {
    this.users.clear();
    this.nextId = 1;
    console.log('[InMemoryUserStore] All users cleared!');
  }
}
