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
            </ul>
          }
        </div>

        <div class="actions">
          <button (click)="onLogout()" class="logout-btn">Logout</button>
          <a href="/admin/auth" target="_blank" class="admin-link">Open Admin Panel</a>
        </div>
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

    p {
      color: #666;
      font-size: 1rem;
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

  onLogout() {
    this.authService.logout();
    // Redirect to login page after logout
    setTimeout(() => {
      window.location.href = '/api/auth/login.html';
    }, 100);
  }
}
