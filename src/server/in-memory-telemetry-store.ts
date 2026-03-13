import type { ITelemetryStore, TelemetryEvent, TelemetryFilter } from 'awesome-node-auth';

export class InMemoryTelemetryStore implements ITelemetryStore {
    private events: TelemetryEvent[] = [];

    async save(event: TelemetryEvent): Promise<void> {
        this.events.push(event);
        // Keep only last 2000 events
        if (this.events.length > 2000) {
            this.events.shift();
        }
    }

    async query(filter: TelemetryFilter): Promise<TelemetryEvent[]> {
        let results = [...this.events];

        if (filter.event) results = results.filter((e) => e.event === filter.event);
        if (filter.userId) results = results.filter((e) => e.userId === filter.userId);
        if (filter.tenantId) results = results.filter((e) => e.tenantId === filter.tenantId);
        if (filter.sessionId) results = results.filter((e) => e.sessionId === filter.sessionId);

        if (filter.from) {
            const fromTime = filter.from.getTime();
            results = results.filter((e) => new Date(e.timestamp).getTime() >= fromTime);
        }
        if (filter.to) {
            const toTime = filter.to.getTime();
            results = results.filter((e) => new Date(e.timestamp).getTime() <= toTime);
        }

        results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const offset = filter.offset ?? 0;
        const limit = filter.limit ?? 100;

        return results.slice(offset, offset + limit);
    }
}
