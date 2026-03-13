import type { IWebhookStore, WebhookConfig } from 'awesome-node-auth';

export class InMemoryWebhookStore implements IWebhookStore {
    private webhooks = new Map<string, WebhookConfig>();

    async findByEvent(event: string, tenantId?: string): Promise<WebhookConfig[]> {
        return [...this.webhooks.values()].filter((w) => {
            if (!w.isActive) return false;
            if (tenantId && w.tenantId && w.tenantId !== tenantId) return false;
            return w.events.includes('*') || w.events.includes(event);
        });
    }

    async listAll(limit: number, offset: number): Promise<WebhookConfig[]> {
        return [...this.webhooks.values()].slice(offset, offset + limit);
    }

    async add(config: Omit<WebhookConfig, 'id'>): Promise<WebhookConfig> {
        const id = crypto.randomUUID();
        const webhook: WebhookConfig = { id, ...config };
        this.webhooks.set(id, webhook);
        return webhook;
    }

    async remove(id: string): Promise<void> {
        this.webhooks.delete(id);
    }

    async update(id: string, changes: Partial<Omit<WebhookConfig, 'id'>>): Promise<void> {
        const existing = this.webhooks.get(id);
        if (existing) {
            Object.assign(existing, changes);
        }
    }

    async findByProvider(provider: string): Promise<WebhookConfig | null> {
        for (const w of this.webhooks.values()) {
            if (w.provider === provider) return w;
        }
        return null;
    }
}
