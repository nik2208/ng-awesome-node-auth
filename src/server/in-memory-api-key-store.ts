import type { IApiKeyStore, ApiKey, ApiKeyAuditEntry } from 'awesome-node-auth';

export class InMemoryApiKeyStore implements IApiKeyStore {
    private keys = new Map<string, ApiKey>();
    private auditLogs: ApiKeyAuditEntry[] = [];

    async save(key: ApiKey): Promise<void> {
        this.keys.set(key.id, key);
    }

    async findByPrefix(prefix: string): Promise<ApiKey | null> {
        for (const key of this.keys.values()) {
            if (key.keyPrefix === prefix && key.isActive) return key;
        }
        return null;
    }

    async findById(id: string): Promise<ApiKey | null> {
        return this.keys.get(id) ?? null;
    }

    async revoke(id: string): Promise<void> {
        const key = this.keys.get(id);
        if (key) {
            key.isActive = false;
        }
    }

    async updateLastUsed(id: string, at?: Date): Promise<void> {
        const key = this.keys.get(id);
        if (key) {
            key.lastUsedAt = at ?? new Date();
        }
    }

    async listByServiceId(serviceId: string): Promise<ApiKey[]> {
        return [...this.keys.values()].filter((k) => k.serviceId === serviceId);
    }

    async listAll(limit: number, offset: number): Promise<ApiKey[]> {
        return [...this.keys.values()].slice(offset, offset + limit);
    }

    async delete(id: string): Promise<void> {
        this.keys.delete(id);
    }

    async logUsage(entry: ApiKeyAuditEntry): Promise<void> {
        this.auditLogs.push(entry);
        // Keep only last 1000 logs in memory
        if (this.auditLogs.length > 1000) {
            this.auditLogs.shift();
        }
    }
}
