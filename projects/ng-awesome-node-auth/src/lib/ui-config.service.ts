import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { NG_AUTH_OPTIONS } from './auth.config';

export interface UiConfig {
    apiPrefix: string;
    features: {
        register: boolean;
        magicLink: boolean;
        sms: boolean;
        google: boolean;
        github: boolean;
        forgotPassword: boolean;
        verifyEmail: boolean;
        twoFactor: boolean;
    };
    ui: {
        primaryColor: string;
        secondaryColor: string;
        logoUrl?: string;
        siteName: string;
        theme?: string;
    };
}

@Injectable({ providedIn: 'root' })
export class UiConfigService {
    private http = inject(HttpClient);
    private platformId = inject(PLATFORM_ID);
    private options = inject(NG_AUTH_OPTIONS, { optional: true });

    private readonly _config = signal<UiConfig | null>(null);
    readonly config = this._config.asReadonly();

    /**
     * Loads the configuration from the node-auth backend.
     * This is typically called during APP_INITIALIZER.
     */
    async loadConfig(): Promise<void> {
        if (!isPlatformBrowser(this.platformId)) {
            this.setDefaults();
            return;
        }

        try {
            const apiPrefix = this.options?.apiPrefix || '/api/auth';
            const configUrl = `${apiPrefix.replace(/\/$/, '')}/ui/config`;

            const config = await firstValueFrom(
                this.http.get<UiConfig>(configUrl)
            );
            this._config.set(config);
        } catch (error) {
            console.error('Failed to load UI configuration:', error);
            this.setDefaults();
        }
    }

    private setDefaults(): void {
        const apiPrefix = this.options?.apiPrefix || '/api/auth';
        this._config.set({
            apiPrefix,
            features: {
                register: true,
                magicLink: false,
                sms: false,
                google: false,
                github: false,
                forgotPassword: true,
                verifyEmail: false,
                twoFactor: false
            },
            ui: {
                primaryColor: '#1a1a2e',
                secondaryColor: '#ffffff',
                siteName: 'awesome-node-auth'
            }
        });
    }

    get apiPrefix(): string {
        return this.config()?.apiPrefix || this.options?.apiPrefix || '/api/auth';
    }

    hasFeature(feature: keyof UiConfig['features']): boolean {
        return !!this.config()?.features[feature];
    }
}
