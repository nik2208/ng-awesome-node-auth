import { Injectable, inject, PLATFORM_ID, signal, computed, Signal, WritableSignal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of } from 'rxjs';
import { tap, map, catchError, switchMap } from 'rxjs/operators';
import { NG_AUTH_OPTIONS, resolveOptions, NgAuthOptions } from './auth.config';

export interface AuthUser {
    id?: string;
    sub: string;
    email: string;
    isEmailVerified: boolean;
    firstName?: string;
    lastName?: string;
    name?: string;
    phoneNumber?: string;
    role?: string;
    loginProvider?: string;
    isTotpEnabled?: boolean;
    hasPassword?: boolean;
    lastLogin?: Date;
}

/**
 * Full-featured session management service for awesome-node-auth backends.
 *
 * Registered explicitly by `provideAuth()` — use `providedIn` is intentionally
 * omitted so ng-packagr generates `ɵfac` without auto-registering at root.
 *
 * **Override:** pass `authService: MyAuthService` to `provideAuth()`.
 */
@Injectable()
export class AuthService {
    private readonly http: HttpClient;
    private readonly platformId: object;
    protected readonly opts: ReturnType<typeof resolveOptions>;

    private readonly _user: WritableSignal<AuthUser | null>;
    private _initialized = false;
    private _logoutInProgress = false;

    /** The currently authenticated user, or `null` when not authenticated. */
    readonly user: Signal<AuthUser | null>;

    /** `true` when a valid session exists. */
    readonly isAuthenticated: Signal<boolean>;

    constructor() {
        // All inject() calls must be in the constructor to be within DI context
        this.http = inject(HttpClient);
        this.platformId = inject(PLATFORM_ID);
        this.opts = resolveOptions(inject(NG_AUTH_OPTIONS, { optional: true }));

        this._user = signal<AuthUser | null>(null);
        this.user = this._user.asReadonly();
        this.isAuthenticated = computed(() => !!this._user());
    }

    /** `true` after the first `checkSession()` has completed. */
    isInitialized(): boolean { return this._initialized; }

    /** Returns the current user synchronously. */
    getUser(): AuthUser | null { return this._user(); }

    // ── Session ────────────────────────────────────────────────────────────

    checkSession(): Observable<AuthUser | null> {
        return this.http.get<AuthUser>(`${this.opts.apiPrefix}/me`, { withCredentials: true }).pipe(
            tap(user => { this._initialized = true; this._user.set(user); }),
            catchError(() => { this._initialized = true; this._user.set(null); return of(null); })
        );
    }

    refreshToken(): Observable<{ success: boolean; error?: string }> {
        return this.http.post<{ success: boolean }>(`${this.opts.apiPrefix}/refresh`, {}, { withCredentials: true }).pipe(
            map(() => ({ success: true })),
            catchError(err => { this._user.set(null); return of({ success: false, error: err.error?.error || 'Refresh failed' }); })
        );
    }

    logout(): void {
        if (this._logoutInProgress) return;
        this._logoutInProgress = true;
        this.http.post(`${this.opts.apiPrefix}/logout`, {}, { withCredentials: true }).subscribe({
            next: () => this._doLogout(),
            error: () => this._doLogout(),
        });
    }

    // ── Auth ────────────────────────────────────────────────────────────────

    login(email: string, password: string): Observable<{
        success: boolean; requires2fa?: boolean; requires2FASetup?: boolean;
        token?: string; availableMethods?: string[]; error?: string;
    }> {
        return this.http.post<any>(`${this.opts.apiPrefix}/login`, { email, password }, { withCredentials: true }).pipe(
            switchMap((res: any) => {
                const requires2fa = !!res.requiresTwoFactor;
                const requires2FASetup = !!res.requires2FASetup;
                const token = res.tempToken;
                const availableMethods = res.available2faMethods || [];
                const isSuccess = res.success || requires2fa;
                if (isSuccess && !requires2fa) {
                    return this.checkSession().pipe(map(() => ({ success: true, requires2fa, requires2FASetup, token, availableMethods })));
                }
                return of({ success: isSuccess, requires2fa, requires2FASetup, token, availableMethods });
            }),
            catchError(err => {
                if (err.status === 403 && err.error?.requires2FASetup) {
                    return of({ success: false, requires2FASetup: true, token: err.error.tempToken, error: err.error.error || '2FA Setup required' });
                }
                return of({ success: false, error: err.error?.error || 'Login failed' });
            })
        );
    }

    register(email: string, password: string, firstName: string, lastName: string): Observable<{ success: boolean; error?: string }> {
        return this.http.post<{ success: boolean; user: AuthUser }>(`${this.opts.apiPrefix}/register`, { email, password, firstName, lastName }, { withCredentials: true }).pipe(
            tap(res => { if (res.user) this._user.set(res.user); }),
            map(() => ({ success: true })),
            catchError(err => of({ success: false, error: err.error?.error || 'Registration failed' }))
        );
    }

    updateProfile(firstName: string, lastName: string): Observable<{ success: boolean; error?: string }> {
        return this.http.patch<{ success: boolean }>(`${this.opts.apiPrefix}/profile`, { firstName, lastName }, { withCredentials: true }).pipe(
            switchMap(res => res.success ? this.checkSession().pipe(map(() => ({ success: true }))) : of({ success: false })),
            catchError(err => of({ success: false, error: err.error?.error || 'Update failed' }))
        );
    }

    // ── Password ────────────────────────────────────────────────────────────

    forgotPassword(email: string): Observable<{ success: boolean; error?: string }> {
        return this.http.post(`${this.opts.apiPrefix}/forgot-password`, { email }, { withCredentials: true }).pipe(
            map(() => ({ success: true })),
            catchError(err => of({ success: false, error: err.error?.error || 'Failed to send recovery email' }))
        );
    }

    resetPassword(password: string, token: string): Observable<{ success: boolean; error?: string }> {
        return this.http.post(`${this.opts.apiPrefix}/reset-password`, { password, token }, { withCredentials: true }).pipe(
            map(() => ({ success: true })),
            catchError(err => of({ success: false, error: err.error?.error || 'Failed to reset password' }))
        );
    }

    changePassword(currentPassword: string, newPassword: string): Observable<{ success: boolean; error?: string }> {
        return this.http.post<{ success: boolean }>(`${this.opts.apiPrefix}/change-password`, { currentPassword, newPassword }, { withCredentials: true }).pipe(
            switchMap(res => res.success ? this.checkSession().pipe(map(() => ({ success: true }))) : of({ success: false })),
            catchError(err => of({ success: false, error: err.error?.error || 'Failed to change password' }))
        );
    }

    setPassword(password: string): Observable<{ success: boolean; error?: string }> {
        return this.changePassword('', password);
    }

    // ── Magic Link ──────────────────────────────────────────────────────────

    sendMagicLink(email: string): Observable<{ success: boolean; error?: string }> {
        return this.http.post(`${this.opts.apiPrefix}/magic-link/send`, { email, mode: 'login' }, { withCredentials: true }).pipe(
            map(() => ({ success: true })),
            catchError(err => of({ success: false, error: err.error?.error || 'Failed to send magic link' }))
        );
    }

    verifyMagicLink(token: string): Observable<{ success: boolean; error?: string }> {
        return this.http.post<{ success: boolean }>(`${this.opts.apiPrefix}/magic-link/verify`, { token, mode: 'login' }, { withCredentials: true }).pipe(
            switchMap(res => res.success ? this.checkSession().pipe(map(() => ({ success: true }))) : of({ success: false })),
            catchError(err => of({ success: false, error: err.error?.error || 'Verification failed' }))
        );
    }

    send2faMagicLink(tempToken: string): Observable<{ success: boolean; error?: string }> {
        return this.http.post(`${this.opts.apiPrefix}/magic-link/send`, { tempToken, mode: '2fa' }, { withCredentials: true }).pipe(
            map(() => ({ success: true })),
            catchError(err => of({ success: false, error: err.error?.error || 'Failed to send magic link' }))
        );
    }

    // ── SMS ─────────────────────────────────────────────────────────────────

    sendSmsLogin(email: string): Observable<{ success: boolean; error?: string }> {
        return this.http.post(`${this.opts.apiPrefix}/sms/send`, { email, mode: 'login' }, { withCredentials: true }).pipe(
            map(() => ({ success: true })),
            catchError(err => of({ success: false, error: err.error?.error || 'Failed to send SMS' }))
        );
    }

    verifySmsLogin(userId: string, code: string): Observable<{ success: boolean; error?: string }> {
        return this.http.post<{ success: boolean }>(`${this.opts.apiPrefix}/sms/verify`, { userId, code, mode: 'login' }, { withCredentials: true }).pipe(
            switchMap(res => res.success ? this.checkSession().pipe(map(() => ({ success: true }))) : of({ success: false })),
            catchError(err => of({ success: false, error: err.error?.error || 'Invalid SMS code' }))
        );
    }

    send2faSms(tempToken: string): Observable<{ success: boolean; error?: string }> {
        return this.http.post(`${this.opts.apiPrefix}/sms/send`, { tempToken, mode: '2fa' }, { withCredentials: true }).pipe(
            map(() => ({ success: true })),
            catchError(err => of({ success: false, error: err.error?.error || 'Failed to send SMS' }))
        );
    }

    validateSms(token: string, code: string): Observable<{ success: boolean; error?: string }> {
        return this.http.post<{ success: boolean }>(`${this.opts.apiPrefix}/sms/verify`, { tempToken: token, code, mode: '2fa' }, { withCredentials: true }).pipe(
            switchMap(res => res.success ? this.checkSession().pipe(map(() => ({ success: true }))) : of({ success: false })),
            catchError(err => of({ success: false, error: err.error?.error || 'Invalid SMS code' }))
        );
    }

    addPhone(phoneNumber: string): Observable<{ success: boolean; error?: string }> {
        return this.http.post(`${this.opts.apiPrefix}/add-phone`, { phoneNumber }, { withCredentials: true }).pipe(
            map(() => ({ success: true })),
            catchError(err => of({ success: false, error: err.error?.error || 'Failed to add phone number' }))
        );
    }

    // ── 2FA ─────────────────────────────────────────────────────────────────

    setup2fa(): Observable<{ success: boolean; secret?: string; qrCode?: string; error?: string }> {
        return this.http.post<{ secret: string; qrCode: string }>(`${this.opts.apiPrefix}/2fa/setup`, {}, { withCredentials: true }).pipe(
            map(res => ({ success: true, secret: res.secret, qrCode: res.qrCode })),
            catchError(err => of({ success: false, error: err.error?.error || 'Failed to initialize 2FA' }))
        );
    }

    verify2faSetup(code: string, secret: string): Observable<{ success: boolean; error?: string }> {
        return this.http.post<{ success: boolean }>(`${this.opts.apiPrefix}/2fa/verify-setup`, { token: code, secret }, { withCredentials: true }).pipe(
            switchMap(res => res.success ? this.checkSession().pipe(map(() => ({ success: true }))) : of({ success: false })),
            catchError(err => of({ success: false, error: err.error?.error || 'Failed to verify 2FA code' }))
        );
    }

    validate2fa(token: string, code: string): Observable<{ success: boolean; error?: string }> {
        return this.http.post<{ success: boolean }>(`${this.opts.apiPrefix}/2fa/verify`, { tempToken: token, totpCode: code }, { withCredentials: true }).pipe(
            switchMap(res => res.success ? this.checkSession().pipe(map(() => ({ success: true }))) : of({ success: false })),
            catchError(err => of({ success: false, error: err.error?.error || 'Invalid 2FA code' }))
        );
    }

    // ── Email Verification ─────────────────────────────────────────────────

    resendVerificationEmail(): Observable<{ success: boolean; error?: string }> {
        return this.http.post(`${this.opts.apiPrefix}/send-verification-email`, {}, { withCredentials: true }).pipe(
            map(() => ({ success: true })),
            catchError(err => of({ success: false, error: err.error?.error || 'Failed to resend verification email' }))
        );
    }

    verifyEmail(token: string): Observable<{ success: boolean; error?: string }> {
        return this.http.get<{ success: boolean }>(`${this.opts.apiPrefix}/verify-email?token=${token}`, { withCredentials: true }).pipe(
            switchMap(res => res.success ? this.checkSession().pipe(map(() => ({ success: true }))) : of({ success: false })),
            catchError(err => of({ success: false, error: err.error?.error || 'Verification failed' }))
        );
    }

    // ── Email Change ────────────────────────────────────────────────────────

    requestEmailChange(newEmail: string): Observable<{ success: boolean; error?: string }> {
        return this.http.post<{ success: boolean }>(`${this.opts.apiPrefix}/change-email/request`, { newEmail }, { withCredentials: true }).pipe(
            map(() => ({ success: true })),
            catchError(err => of({ success: false, error: err.error?.error || 'Failed to request email change' }))
        );
    }

    confirmEmailChange(token: string): Observable<{ success: boolean; error?: string }> {
        return this.http.post<{ success: boolean }>(`${this.opts.apiPrefix}/change-email/confirm`, { token }, { withCredentials: true }).pipe(
            switchMap(res => res.success ? this.checkSession().pipe(map(() => ({ success: true }))) : of({ success: false })),
            catchError(err => of({ success: false, error: err.error?.error || 'Failed to confirm email change' }))
        );
    }

    // ── Account Linking ─────────────────────────────────────────────────────

    requestLinkingEmail(email: string, provider: string): Observable<{ success: boolean; error?: string }> {
        return this.http.post<{ success: boolean }>(`${this.opts.apiPrefix}/link-request`, { email, provider }, { withCredentials: true }).pipe(
            map(() => ({ success: true })),
            catchError(err => of({ success: false, error: err.error?.error || 'Failed to send confirmation email' }))
        );
    }

    verifyLinkingToken(token: string, provider: string): Observable<{ success: boolean; error?: string }> {
        return this.http.post<{ success: boolean }>(`${this.opts.apiPrefix}/link-verify`, { token, provider }, { withCredentials: true }).pipe(
            switchMap(res => res.success ? this.checkSession().pipe(map(() => ({ success: true }))) : of({ success: false })),
            catchError(err => of({ success: false, error: err.error?.error || 'Failed to verify linking token' }))
        );
    }

    requestConflictLinkingEmail(email: string, provider: string): Observable<{ success: boolean; error?: string }> {
        return this.requestLinkingEmail(email, provider);
    }

    verifyConflictLinkingToken(token: string): Observable<{ success: boolean; error?: string }> {
        return this.http.post<{ success: boolean }>(`${this.opts.apiPrefix}/link-verify`, { token, loginAfterLinking: true }, { withCredentials: true }).pipe(
            switchMap(res => res.success ? this.checkSession().pipe(map(() => ({ success: true }))) : of({ success: false })),
            catchError(err => of({ success: false, error: err.error?.error || 'Failed to verify linking token' }))
        );
    }

    getLinkedAccounts(): Observable<any[]> {
        return this.http.get<{ linkedAccounts: any[] }>(`${this.opts.apiPrefix}/linked-accounts`, { withCredentials: true }).pipe(
            map(res => res.linkedAccounts || []),
            catchError(() => of([]))
        );
    }

    unlinkAccount(provider: string, providerAccountId: string): Observable<{ success: boolean; error?: string }> {
        return this.http.delete<{ success: boolean }>(`${this.opts.apiPrefix}/linked-accounts/${provider}/${providerAccountId}`, { withCredentials: true }).pipe(
            map(() => ({ success: true })),
            catchError(err => of({ success: false, error: err.error?.error || 'Failed to unlink account' }))
        );
    }

    // ── Account ─────────────────────────────────────────────────────────────

    deleteAccount(): Observable<{ success: boolean; error?: string }> {
        return this.http.delete<{ success: boolean }>(`${this.opts.apiPrefix}/account`, { withCredentials: true }).pipe(
            tap(() => { this._user.set(null); if (isPlatformBrowser(this.platformId)) window.location.href = this.opts.loginUrl; }),
            map(() => ({ success: true })),
            catchError(err => of({ success: false, error: err.error?.error || 'Failed to delete account' }))
        );
    }

    // ── Internal ─────────────────────────────────────────────────────────────

    /** @internal used by authInterceptor */
    _setUser(user: AuthUser | null): void { this._user.set(user); }

    private _doLogout(): void {
        this._logoutInProgress = false;
        this._user.set(null);
        if (isPlatformBrowser(this.platformId)) {
            window.location.href = this.opts.loginUrl;
        }
    }
}
