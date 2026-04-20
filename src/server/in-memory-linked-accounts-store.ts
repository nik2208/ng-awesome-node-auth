import { ILinkedAccountsStore, LinkedAccount } from 'awesome-node-auth';

export class InMemoryLinkedAccountsStore implements ILinkedAccountsStore {
  private _links = new Map<string, LinkedAccount[]>();

  async getLinkedAccounts(userId: string): Promise<LinkedAccount[]> {
    return this._links.get(userId) ?? [];
  }

  async linkAccount(userId: string, account: LinkedAccount): Promise<void> {
    const existing = this._links.get(userId) ?? [];
    const idx = existing.findIndex(
      a => a.provider === account.provider && a.providerAccountId === account.providerAccountId,
    );
    if (idx >= 0) { existing[idx] = account; } else { existing.push(account); }
    this._links.set(userId, existing);
  }

  async unlinkAccount(userId: string, provider: string, providerAccountId: string): Promise<void> {
    const existing = this._links.get(userId) ?? [];
    this._links.set(
      userId,
      existing.filter(a => !(a.provider === provider && a.providerAccountId === providerAccountId)),
    );
  }

  async findUserByProviderAccount(provider: string, providerAccountId: string): Promise<{ userId: string } | null> {
    for (const [userId, accounts] of this._links.entries()) {
      if (accounts.some(a => a.provider === provider && a.providerAccountId === providerAccountId)) {
        return { userId };
      }
    }
    return null;
  }
}
