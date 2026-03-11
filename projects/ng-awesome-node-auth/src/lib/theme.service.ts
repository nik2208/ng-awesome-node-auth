import { Injectable, inject, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { UiConfigService } from './ui-config.service';

@Injectable({ providedIn: 'root' })
export class ThemeService {
    private config = inject(UiConfigService);
    private platformId = inject(PLATFORM_ID);

    constructor() {
        if (isPlatformBrowser(this.platformId)) {
            // Listen for preview updates from parent window (admin panel iframe)
            window.addEventListener('message', (event) => {
                if (event.data?.type === 'UI_PREVIEW_UPDATE') {
                    this.applyTheme(event.data.settings);
                }
            });

            // Initial apply from config
            effect(() => {
                const configState = this.config.config();
                if (configState?.ui?.theme) {
                    this.applyTheme(configState.ui.theme);
                } else if (configState?.ui) {
                    this.applyTheme(configState.ui);
                }
            });
        }
    }

    private applyTheme(theme: any) {
        if (!theme || !isPlatformBrowser(this.platformId)) return;

        const root = document.documentElement;
        if (theme.primaryColor) {
            root.style.setProperty('--primary-color', theme.primaryColor);
        }
        if (theme.secondaryColor) {
            root.style.setProperty('--secondary-color', theme.secondaryColor);
        }
        // Logo and site name are handled in components via UiConfigService
    }
}
