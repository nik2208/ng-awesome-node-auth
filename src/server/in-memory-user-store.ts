import { IUserStore, BaseUser, IUserMetadataStore, IRolesPermissionsStore, ISessionStore, SessionInfo } from 'awesome-node-auth';
import { requestContext } from './utils/request-context';

interface EnhancedUser extends BaseUser {
  metadata?: Record<string, unknown>;
  roles?: Set<string>;
  picture?: string;
  firstName?: string | null;
  lastName?: string | null;
}

export class InMemoryUserStore implements IUserStore, IUserMetadataStore, IRolesPermissionsStore {
  private users = new Map<string, EnhancedUser>();
  private rolePermissions = new Map<string, Set<string>>();
  private nextId = 1;
  private sessionStore: ISessionStore | null = null;

  setSessionStore(store: ISessionStore): void {
    this.sessionStore = store;
  }

  // ---- Core CRUD -------------------------------------------------------

  async findByEmail(email: string): Promise<BaseUser | null> {
    return [...this.users.values()].find(u => u.email === email) ?? null;
  }

  async findById(id: string): Promise<BaseUser | null> {
    return this.users.get(id) ?? null;
  }

  async create(data: Partial<EnhancedUser>): Promise<EnhancedUser> {
    const id = String(this.nextId++);
    const user: EnhancedUser = {
      id,
      email: data.email ?? '',
      ...data,
      metadata: data.metadata ?? {},
      roles: data.roles ?? new Set()
    };
    this.users.set(id, user);
    return user;
  }

  // ---- Token updates ---------------------------------------------------

  async updateRefreshToken(userId: string, token: string | null, expiry: Date | null): Promise<void> {
    const u = this.users.get(userId);
    if (!u) return;

    u.refreshToken = token;
    u.refreshTokenExpiry = expiry;

    if (token && this.sessionStore) {
      const ctx = requestContext.getStore();
      const req = ctx?.req;
      if (req) {
        this.sessionStore.createSession({
          userId,
          tenantId: undefined,
          userAgent: req.headers['user-agent'],
          ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown',
          createdAt: new Date(),
          lastActiveAt: new Date(),
          expiresAt: expiry || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }).catch(err => console.error('[AUTH-STORE] Failed to create session:', err));
      }
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

  // ---- IUserMetadataStore ----------------------------------------------

  async getMetadata(userId: string): Promise<Record<string, unknown>> {
    const u = this.users.get(userId);
    return u?.metadata ?? {};
  }

  async updateMetadata(userId: string, metadata: Record<string, unknown>): Promise<void> {
    const u = this.users.get(userId);
    if (u) {
      u.metadata = { ...(u.metadata ?? {}), ...metadata };
    }
  }

  async clearMetadata(userId: string): Promise<void> {
    const u = this.users.get(userId);
    if (u) u.metadata = {};
  }

  // ---- IRolesPermissionsStore -------------------------------------------

  async addRoleToUser(userId: string, role: string, _tenantId?: string): Promise<void> {
    const u = this.users.get(userId);
    if (u) {
      if (!u.roles) u.roles = new Set();
      u.roles.add(role);
    }
  }

  async removeRoleFromUser(userId: string, role: string, _tenantId?: string): Promise<void> {
    const u = this.users.get(userId);
    if (u) u.roles?.delete(role);
  }

  async getRolesForUser(userId: string, _tenantId?: string): Promise<string[]> {
    const u = this.users.get(userId);
    return Array.from(u?.roles ?? []);
  }

  async createRole(role: string, permissions: string[] = []): Promise<void> {
    this.rolePermissions.set(role, new Set(permissions));
  }

  async deleteRole(role: string): Promise<void> {
    this.rolePermissions.delete(role);
    for (const u of this.users.values()) {
      u.roles?.delete(role);
    }
  }

  async addPermissionToRole(role: string, permission: string): Promise<void> {
    let perms = this.rolePermissions.get(role);
    if (!perms) {
      perms = new Set();
      this.rolePermissions.set(role, perms);
    }
    perms.add(permission);
  }

  async removePermissionFromRole(role: string, permission: string): Promise<void> {
    this.rolePermissions.get(role)?.delete(permission);
  }

  async getPermissionsForRole(role: string): Promise<string[]> {
    return Array.from(this.rolePermissions.get(role) ?? []);
  }

  async getPermissionsForUser(userId: string, _tenantId?: string): Promise<string[]> {
    const roles = await this.getRolesForUser(userId);
    const perms = new Set<string>();
    for (const r of roles) {
      (await this.getPermissionsForRole(r)).forEach(p => perms.add(p));
    }
    return Array.from(perms);
  }

  async userHasPermission(userId: string, permission: string, tenantId?: string): Promise<boolean> {
    const perms = await this.getPermissionsForUser(userId, tenantId);
    return perms.includes(permission);
  }

  async getAllRoles(): Promise<string[]> {
    return Array.from(this.rolePermissions.keys());
  }

  async clearAll(): Promise<void> {
    this.users.clear();
    this.rolePermissions.clear();
    this.nextId = 1;
    console.log('[InMemoryUserStore] All data cleared!');
  }
}
