import type { ISessionStore, SessionInfo } from 'awesome-node-auth';

export class InMemorySessionStore implements ISessionStore {
    private sessions = new Map<string, SessionInfo>();

    async createSession(info: Omit<SessionInfo, 'sessionHandle'>): Promise<SessionInfo> {
        const sessionHandle = crypto.randomUUID();
        const session: SessionInfo = { sessionHandle, ...info };
        this.sessions.set(sessionHandle, session);
        return session;
    }
    async getSession(sessionHandle: string): Promise<SessionInfo | null> {
        const s = this.sessions.get(sessionHandle);
        if (!s || s.expiresAt < new Date()) {
            this.sessions.delete(sessionHandle);
            return null;
        }
        return s;
    }
    async getSessionsForUser(userId: string, tenantId?: string): Promise<SessionInfo[]> {
        return [...this.sessions.values()].filter(
            (s) => s.userId === userId && (!tenantId || s.tenantId === tenantId),
        );
    }
    async updateSessionLastActive(sessionHandle: string): Promise<void> {
        const s = this.sessions.get(sessionHandle);
        if (s) s.lastActiveAt = new Date();
    }
    async revokeSession(sessionHandle: string): Promise<void> {
        this.sessions.delete(sessionHandle);
    }
    async revokeAllSessionsForUser(userId: string, tenantId?: string): Promise<void> {
        for (const [h, s] of this.sessions.entries()) {
            if (s.userId === userId && (!tenantId || s.tenantId === tenantId)) this.sessions.delete(h);
        }
    }
    async getAllSessions(limit: number, offset: number): Promise<SessionInfo[]> {
        return [...this.sessions.values()].slice(offset, offset + limit);
    }
    async deleteExpiredSessions(): Promise<number> {
        const now = new Date();
        let count = 0;
        for (const [h, s] of this.sessions.entries()) {
            if (s.expiresAt < now) {
                this.sessions.delete(h);
                count++;
            }
        }
        return count;
    }
}
