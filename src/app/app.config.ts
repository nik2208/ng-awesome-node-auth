import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideAuth } from 'ng-awesome-node-auth';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideAuth({
      apiPrefix: '/api/auth',
      headless: false // default: false (auto-redirects to login). Set to true for manual control.
    }),
  ]
};
