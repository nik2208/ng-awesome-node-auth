import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from 'ng-awesome-node-auth';

/**
 * Home component displayed after user login.
 * Uses modern Angular with signals (@if, @for) and no RxJS observables.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="home-container">
      <h1>Welcome to ng-awesome-node-auth!</h1>
      
      @if (authService.isAuthenticated()) {
        <div class="user-info">
          <h2>Your Profile</h2>
          @if (user(); as u) {
            <ul>
              <li><strong>ID:</strong> {{ u.sub }}</li>
              <li><strong>Email:</strong> {{ u.email }}</li>
              <li><strong>First Name:</strong> {{ u.firstName || '—' }}</li>
              <li><strong>Last Name:</strong> {{ u.lastName || '—' }}</li>
              <li><strong>Login Provider:</strong> {{ u.loginProvider || 'local' }}</li>
              @if (u.isEmailVerified) {
                <li><strong style="color: green;">Email Verified: ✓</strong></li>
              }
              @if (u.isTotpEnabled) {
                <li><strong style="color: blue;">2FA: Enabled (TOTP)</strong></li>
              }
              @if (u.roles && u.roles.length > 0) {
                <li><strong>Roles:</strong> {{ u.roles.join(', ') }}</li>
              }
              @if (u.permissions && u.permissions.length > 0) {
                <li><strong>Permissions:</strong> {{ u.permissions.length }} active</li>
              }
              @if (u.metadata && hasKeys(u.metadata)) {
                <li><strong>Metadata:</strong> {{ u.metadata | json }}</li>
              }
            </ul>
          }
        </div>

        <div class="actions">
          <button (click)="onLogout()" class="logout-btn">Logout</button>
          
          @if (user()?.isTotpEnabled) {
            <button (click)="onDisable2fa()" class="disable-2fa-btn">Disable 2FA</button>
          }

          <a href="/admin/auth" target="_blank" class="admin-link">Open Admin Panel</a>
        </div>

        @if (statusMsg) {
          <p class="status-msg" [class.error]="isError">{{ statusMsg }}</p>
        }
      } @else {
        <p>You are not logged in. Please <a href="/api/auth/login.html">login first</a>.</p>
      }
    </div>
  `,
  styles: [`
    .home-container {
      max-width: 600px;
      margin: 40px auto;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    h1 {
      color: #333;
      margin-bottom: 20px;
    }

    h2 {
      color: #666;
      font-size: 1.2rem;
      margin-bottom: 15px;
    }

    .user-info {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
      border-left: 4px solid #4CAF50;
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    li {
      padding: 8px 0;
      color: #555;
      border-bottom: 1px solid #eee;
    }

    li:last-child {
      border-bottom: none;
    }

    .actions {
      margin-top: 20px;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .logout-btn {
      background: #d32f2f;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.3s;
    }

    .logout-btn:hover {
      background: #b71c1c;
    }

    .admin-link {
      background: #1976d2;
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      text-decoration: none;
      font-size: 14px;
      display: inline-block;
      transition: background 0.3s;
    }

    .admin-link:hover {
      background: #1565c0;
    }

    .status-msg {
      margin-top: 15px;
      padding: 10px;
      border-radius: 4px;
      background: #e8f5e9;
      color: #2e7d32;
      font-size: 14px;
    }

    .status-msg.error {
      background: #ffebee;
      color: #c62828;
    }

    .disable-2fa-btn {
      background: #ff9800;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.3s;
    }

    .disable-2fa-btn:hover {
      background: #f57c00;
    }

    a {
      color: #1976d2;
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }
  `]
})
export class HomeComponent {
  authService = inject(AuthService);
  private router = inject(Router);

  // Signal-based user getter (read-only signal from AuthService)
  user = this.authService.user;

  statusMsg = '';
  isError = false;

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
      error: (err) => {
        this.statusMsg = 'An unexpected error occurred.';
        this.isError = true;
      }
    });
  }

  onLogout() {
    this.authService.logout();
    // Redirect to login page after logout
    setTimeout(() => {
      window.location.href = '/api/auth/login.html';
    }, 100);
  }
}
