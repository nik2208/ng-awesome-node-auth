import { ISettingsStore, AuthSettings } from 'awesome-node-auth';

/**
 * In-memory ISettingsStore — persists global auth settings for the admin control panel.
 * Controls email verification policy, mandatory 2FA toggle, theme, feature flags, etc.
 * 
 * Usage:
 *   const settingsStore = new InMemorySettingsStore();
 *   app.use('/admin', createAdminRouter(userStore, { adminSecret, settingsStore }));
 *   app.use('/auth', createAuthRouter(userStore, config, { settingsStore }));
 */
export class InMemorySettingsStore implements ISettingsStore {
  private settings: Partial<AuthSettings> = {};

  async getSettings(): Promise<Partial<AuthSettings>> {
    return { ...this.settings };
  }

  async updateSettings(updates: Partial<AuthSettings>): Promise<void> {
    this.settings = { ...this.settings, ...updates };
  }
}
