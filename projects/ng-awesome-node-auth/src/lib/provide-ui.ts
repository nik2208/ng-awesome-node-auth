import {
    EnvironmentProviders,
    makeEnvironmentProviders,
    provideAppInitializer,
    provideEnvironmentInitializer,
    inject
} from '@angular/core';
import { UiConfigService } from './ui-config.service';
import { ThemeService } from './theme.service';

/**
 * Configures the optional UI Integration for ng-awesome-node-auth.
 * 
 * Provides:
 * - `UiConfigService` which fetches settings from `/api/auth/ui/config` on startup.
 * - `ThemeService` which automatically applies CSS variables and listens for Admin Live Previews.
 * 
 * By placing this in a separate function, we guarantee 100% tree-shakability. 
 * If you do not call this function, exactly 0 bytes of UI theming logic will 
 * be included in your final Angular bundle.
 * 
 * @example
 * ```ts
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideAuth({ apiPrefix: '/api/auth' }),
 *     provideAuthUi() // <-- Opt-in UI features
 *   ]
 * };
 * ```
 */
export function provideAuthUi(): EnvironmentProviders {
    return makeEnvironmentProviders([
        provideAppInitializer(() => {
            const configService = inject(UiConfigService);
            return configService.loadConfig();
        }),
        provideEnvironmentInitializer(() => {
            inject(ThemeService);
        })
    ]);
}
