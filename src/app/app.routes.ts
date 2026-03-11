import { Routes } from '@angular/router';
import { authGuard } from 'ng-awesome-node-auth';
import { HomeComponent } from './home.component';

export const routes: Routes = [
  { 
    path: 'home', 
    component: HomeComponent, 
    canActivate: [authGuard],
    data: { title: 'Home' }
  },
  { 
    path: '', 
    redirectTo: '/home', 
    pathMatch: 'full' 
  },
  { 
    path: '**', 
    redirectTo: '/home' 
  },
];
