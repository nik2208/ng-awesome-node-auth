import { Component, inject, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from 'ng-awesome-node-auth';
import { Subscription } from 'rxjs';

const NG_LIB_VERSION = '1.8.4';
const NODE_LIB_VERSION = '1.8.4';

/**
 * Root wrapper page for the ng-awesome-node-auth demo.
 * Shows version badges, wiki/GitHub links, user profile and an embedded admin panel.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- ═══════════ TOP HEADER ═══════════ -->
    <header class="site-header">
      <div class="header-brand">
        <span class="brand-icon">🔐</span>
        <span class="brand-name">awesome-node-auth</span>
      </div>

      <div class="header-badges">
        <a href="https://www.npmjs.com/package/ng-awesome-node-auth"
           target="_blank" rel="noopener" class="badge badge-angular">
          ng-awesome-node-auth&nbsp;<strong>v{{ ngVersion }}</strong>
        </a>
        <a href="https://www.npmjs.com/package/awesome-node-auth"
           target="_blank" rel="noopener" class="badge badge-node">
          awesome-node-auth&nbsp;<strong>v{{ nodeVersion }}</strong>
        </a>
      </div>

      <nav class="header-links">
        <a href="https://awesomenodeauth.com" target="_blank" rel="noopener" class="nav-link">
          📖 Wiki
        </a>
        <a href="https://github.com/nik2208/awesome-node-auth" target="_blank" rel="noopener" class="nav-link">
          ⭐ Node Library
        </a>
        <a href="https://github.com/nik2208/ng-awesome-node-auth" target="_blank" rel="noopener" class="nav-link">
          ⭐ Angular Library
        </a>
      </nav>
    </header>

    <!-- ═══════════ MAIN CONTENT ═══════════ -->
    <main class="page-main">

      <!-- ── Toast notifications (SSE) ── -->
      <div class="toast-container">
        @for (t of toasts; track t.id) {
          <div class="toast" [class.toast-exit]="t.exiting">{{ t.message }}</div>
        }
      </div>

      @if (authService.isAuthenticated()) {

        <!-- ── Authenticated: profile card + admin iframe ── -->
        <section class="profile-section">
          <div class="card profile-card">
            <div class="card-header">
              <span class="card-icon">👤</span>
              <h2>Your Profile</h2>
            </div>

            @if (user(); as u) {
              <ul class="profile-list">
                <li><span class="label">ID</span><span class="value">{{ u.sub }}</span></li>
                <li><span class="label">Email</span><span class="value">{{ u.email }}</span></li>
                <li><span class="label">Name</span><span class="value">{{ u.firstName || '—' }} {{ u.lastName || '' }}</span></li>
                <li><span class="label">Provider</span><span class="value">{{ u.loginProvider || 'local' }}</span></li>
                @if (u.isEmailVerified) {
                  <li class="status-ok"><span class="label">Email</span><span class="value">✓ Verified</span></li>
                }
                @if (u.isTotpEnabled) {
                  <li class="status-info"><span class="label">2FA</span><span class="value">🔒 TOTP Enabled</span></li>
                }
                @if (u.roles && u.roles.length > 0) {
                  <li><span class="label">Roles</span><span class="value">{{ u.roles.join(', ') }}</span></li>
                }
                @if (u.permissions && u.permissions.length > 0) {
                  <li><span class="label">Permissions</span><span class="value">{{ u.permissions.length }} active</span></li>
                }
                @if (u.metadata && hasKeys(u.metadata)) {
                  <li><span class="label">Metadata</span><span class="value meta">{{ u.metadata | json }}</span></li>
                }
              </ul>
            }

            <div class="card-actions">
              <button (click)="onLogout()" class="btn btn-danger">Logout</button>
              @if (user()?.isTotpEnabled) {
                <button (click)="onDisable2fa()" class="btn btn-warning">Disable 2FA</button>
              }
            </div>

            @if (statusMsg) {
              <p class="status-msg" [class.error]="isError">{{ statusMsg }}</p>
            }
          </div>
        </section>

        <!-- ── Account Linking ── -->
        <section class="linking-section">
          <div class="card">
            <div class="card-header">
              <span class="card-icon">🔗</span>
              <h2>Linked Accounts</h2>
            </div>

            @if (linkedAccounts.length) {
              <ul class="profile-list">
                @for (acc of linkedAccounts; track acc.providerAccountId) {
                  <li>
                    <span class="label">{{ acc.provider }}</span>
                    <span class="value">{{ acc.email || acc.name || acc.providerAccountId }}</span>
                    <button (click)="onUnlink(acc.provider, acc.providerAccountId)" class="btn btn-danger btn-sm">Unlink</button>
                  </li>
                }
              </ul>
            } @else {
              <p class="linking-empty">No linked accounts yet.</p>
            }

            <div class="card-actions">
              <button (click)="onLinkGoogle()" class="btn btn-outline btn-sm">Link Google Account</button>
            </div>
          </div>
        </section>

        <!-- ── Embedded Admin Panel ── -->
        <section class="iframe-section">
          <div class="iframe-header">
            <span class="card-icon">🛡️</span>
            <h2>Admin Panel</h2>
            <span class="admin-note">Session-based access · no password required for first user</span>
            <a href="/admin/auth" target="_blank" rel="noopener" class="btn btn-outline btn-sm">
              Open in new tab ↗
            </a>
          </div>
          <div class="iframe-wrapper">
            <iframe
              src="/admin/auth"
              title="awesome-node-auth Admin Panel"
              class="admin-iframe"
              loading="lazy"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups">
            </iframe>
          </div>
        </section>

      } @else {

        <!-- ── Not authenticated: login iframe ── -->
        <section class="login-section">
          <div class="login-intro">
            <h2>Demo Dashboard</h2>
            <p>Sign in to explore the full ng-awesome-node-auth experience — profile management, TOTP 2FA, sessions and more.</p>
          </div>
          <div class="iframe-wrapper login-frame-wrapper">
            <iframe
              src="/api/auth/ui/login"
              title="awesome-node-auth Login"
              class="login-iframe"
              loading="lazy"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups">
            </iframe>
          </div>
        </section>

      }
    </main>

    <!-- ═══════════ FOOTER ═══════════ -->
    <footer class="site-footer">
      <span>MIT License · © 2024 nik2208 ·</span>
      <a href="https://awesomenodeauth.com" target="_blank" rel="noopener">awesomenodeauth.com</a>
      <span>·</span>
      <a href="https://github.com/nik2208/awesome-node-auth" target="_blank" rel="noopener">GitHub</a>
    </footer>
  `,
  styles: [`
    /* ── Reset / Base ───────────────────────────────────────── */
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f0f4f8;
      color: #1a202c;
    }

    * { box-sizing: border-box; }

    /* ── Header ─────────────────────────────────────────────── */
    .site-header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      color: #fff;
      padding: 16px 32px;
      display: flex;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
      box-shadow: 0 2px 8px rgba(0,0,0,.4);
    }

    .header-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 0 0 auto;
    }

    .brand-icon { font-size: 1.6rem; }

    .brand-name {
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: .5px;
      background: linear-gradient(90deg, #e2e8f0, #a78bfa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .header-badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      flex: 1 1 auto;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.75rem;
      text-decoration: none;
      transition: opacity .2s;
    }

    .badge:hover { opacity: .85; }

    .badge-angular {
      background: rgba(196, 59, 60, .85);
      color: #fff;
      border: 1px solid rgba(255,255,255,.2);
    }

    .badge-node {
      background: rgba(51, 153, 51, .85);
      color: #fff;
      border: 1px solid rgba(255,255,255,.2);
    }

    .header-links {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      flex: 0 0 auto;
    }

    .nav-link {
      color: #cbd5e0;
      text-decoration: none;
      font-size: 0.85rem;
      padding: 5px 12px;
      border-radius: 6px;
      border: 1px solid rgba(255,255,255,.18);
      transition: background .2s, color .2s;
    }

    .nav-link:hover {
      background: rgba(255,255,255,.12);
      color: #fff;
    }

    /* ── Main ───────────────────────────────────────────────── */
    .page-main {
      flex: 1;
      padding: 32px;
      max-width: 1200px;
      width: 100%;
      margin: 0 auto;
    }

    /* ── Card ───────────────────────────────────────────────── */
    .card {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,.08);
      overflow: hidden;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 18px 24px 0;
    }

    .card-icon { font-size: 1.3rem; }

    .card-header h2 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: #2d3748;
    }

    /* ── Profile ────────────────────────────────────────────── */
    .profile-section { margin-bottom: 28px; }

    .profile-list {
      list-style: none;
      padding: 16px 24px;
      margin: 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 4px 16px;
    }

    .profile-list li {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 8px 0;
      border-bottom: 1px solid #edf2f7;
      font-size: 0.9rem;
    }

    .profile-list li:last-child { border-bottom: none; }

    .label {
      font-weight: 600;
      color: #718096;
      min-width: 90px;
    }

    .value { color: #2d3748; word-break: break-all; }

    .meta { font-size: 0.78rem; font-family: monospace; color: #553c9a; }

    .status-ok .value { color: #276749; font-weight: 600; }
    .status-info .value { color: #2b6cb0; font-weight: 600; }

    /* ── Card actions ───────────────────────────────────────── */
    .card-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      padding: 16px 24px;
      background: #f7fafc;
      border-top: 1px solid #edf2f7;
    }

    /* ── Buttons ────────────────────────────────────────────── */
    .btn {
      display: inline-flex;
      align-items: center;
      padding: 9px 20px;
      border: none;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: filter .2s, transform .1s;
    }

    .btn:hover { filter: brightness(1.1); }
    .btn:active { transform: scale(.97); }

    .btn-danger  { background: #e53e3e; color: #fff; }
    .btn-warning { background: #dd6b20; color: #fff; }
    .btn-outline {
      background: transparent;
      border: 1px solid #4a5568;
      color: #4a5568;
    }
    .btn-outline:hover { background: #edf2f7; filter: none; }
    .btn-sm { padding: 5px 12px; font-size: 0.78rem; }

    /* ── Status message ─────────────────────────────────────── */
    .status-msg {
      margin: 12px 24px 16px;
      padding: 10px 14px;
      border-radius: 8px;
      background: #c6f6d5;
      color: #276749;
      font-size: 0.875rem;
    }

    .status-msg.error { background: #fed7d7; color: #9b2c2c; }

    /* ── Iframe sections ────────────────────────────────────── */
    .iframe-section,
    .login-section { margin-bottom: 28px; }

    .iframe-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    }

    .iframe-header h2 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: #2d3748;
      flex: 1;
    }

    .iframe-wrapper {
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0,0,0,.1);
      border: 1px solid #e2e8f0;
      background: #fff;
    }

    .admin-iframe {
      width: 100%;
      height: 700px;
      border: none;
      display: block;
    }

    .login-intro {
      margin-bottom: 20px;
    }

    .login-intro h2 {
      font-size: 1.4rem;
      font-weight: 700;
      color: #2d3748;
      margin: 0 0 8px;
    }

    .login-intro p {
      color: #718096;
      font-size: 0.95rem;
      margin: 0;
    }

    .login-frame-wrapper { max-width: 480px; }

    .login-iframe {
      width: 100%;
      height: 520px;
      border: none;
      display: block;
    }

    /* ── Footer ─────────────────────────────────────────────── */
    .site-footer {
      background: #1a1a2e;
      color: #a0aec0;
      text-align: center;
      padding: 14px 24px;
      font-size: 0.8rem;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .site-footer a {
      color: #90cdf4;
      text-decoration: none;
    }

    .site-footer a:hover { text-decoration: underline; }

    /* ── Toast notifications ────────────────────────────────── */
    .toast-container {
      position: fixed;
      top: 80px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: none;
    }

    .toast {
      background: #2d3748;
      color: #fff;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 0.85rem;
      box-shadow: 0 4px 12px rgba(0,0,0,.2);
      animation: toast-in .3s ease;
      pointer-events: auto;
    }

    .toast-exit { opacity: 0; transition: opacity .3s ease; }

    @keyframes toast-in {
      from { opacity: 0; transform: translateX(40px); }
      to   { opacity: 1; transform: translateX(0); }
    }

    /* ── Linked Accounts ────────────────────────────────────── */
    .linking-section { margin-bottom: 28px; }

    .linking-empty {
      padding: 16px 24px;
      margin: 0;
      color: #718096;
      font-size: 0.9rem;
    }

    .linking-section .profile-list li {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .linking-section .profile-list li .value { flex: 1; }

    /* ── Admin note ─────────────────────────────────────────── */
    .admin-note {
      font-size: 0.75rem;
      color: #718096;
      flex: 1;
      text-align: right;
    }

    /* ── Responsive ─────────────────────────────────────────── */
    @media (max-width: 640px) {
      .site-header { padding: 12px 16px; }
      .page-main { padding: 16px; }
      .admin-iframe { height: 500px; }
    }
  `]
})
export class HomeComponent implements OnInit, OnDestroy {
  readonly ngVersion = NG_LIB_VERSION;
  readonly nodeVersion = NODE_LIB_VERSION;

  authService = inject(AuthService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  // Signal-based user getter (read-only signal from AuthService)
  user = this.authService.user;

  statusMsg = '';
  isError = false;

  // ── Toast state ──
  toasts: { id: number; message: string; exiting: boolean }[] = [];
  private toastId = 0;
  private sseSub?: Subscription;

  // ── Linked accounts ──
  linkedAccounts: { provider: string; providerAccountId: string; email?: string; name?: string; linkedAt?: Date }[] = [];

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.sseSub = this.authService.getToolsStream().subscribe({
        next: (event) => {
          try {
            const data = JSON.parse(event.data);
            this.addToast(data.message || data.type || 'New event');
          } catch {
            this.addToast(event.data || 'New event');
          }
        },
        error: () => { /* SSE reconnection is handled by the browser */ },
      });
      this.loadLinkedAccounts();
    }
  }

  ngOnDestroy(): void {
    this.sseSub?.unsubscribe();
  }

  hasKeys(obj: any): boolean {
    return obj && Object.keys(obj).length > 0;
  }

  onDisable2fa() {
    if (!confirm('Are you sure you want to disable 2FA?')) return;

    this.authService.disable2fa().subscribe({
      next: (res) => {
        if (res.success) {
          this.statusMsg = '2FA has been disabled successfully.';
          this.isError = false;
        } else {
          this.statusMsg = res.error || 'Failed to disable 2FA.';
          this.isError = true;
        }
      },
      error: () => {
        this.statusMsg = 'An unexpected error occurred.';
        this.isError = true;
      }
    });
  }

  onLogout() {
    this.authService.logout();
    // Redirect to login page after logout
    setTimeout(() => {
      window.location.href = '/api/auth/ui/login';
    }, 100);
  }

  // ── Toast helpers ──

  private addToast(message: string): void {
    const id = ++this.toastId;
    this.toasts.push({ id, message, exiting: false });
    setTimeout(() => {
      const t = this.toasts.find(x => x.id === id);
      if (t) t.exiting = true;
      setTimeout(() => { this.toasts = this.toasts.filter(x => x.id !== id); }, 300);
    }, 5000);
  }

  // ── Account linking ──

  loadLinkedAccounts(): void {
    this.authService.getLinkedAccounts().subscribe(accounts => {
      this.linkedAccounts = accounts;
    });
  }

  onLinkGoogle(): void {
    const email = this.user()?.email;
    if (!email) return;
    this.authService.requestLinkingEmail(email, 'google').subscribe(res => {
      if (res.success) {
        this.statusMsg = 'A linking confirmation email has been sent.';
        this.isError = false;
      } else {
        this.statusMsg = res.error || 'Failed to request account linking.';
        this.isError = true;
      }
    });
  }

  onUnlink(provider: string, providerAccountId: string): void {
    if (!confirm(`Unlink ${provider} account?`)) return;
    this.authService.unlinkAccount(provider, providerAccountId).subscribe(res => {
      if (res.success) {
        this.loadLinkedAccounts();
        this.statusMsg = `${provider} account unlinked.`;
        this.isError = false;
      } else {
        this.statusMsg = res.error || 'Failed to unlink account.';
        this.isError = true;
      }
    });
  }
}

