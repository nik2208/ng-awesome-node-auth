import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Server routes for SSR rendering.
 * 
 * For a minimal MVP with SSR but without static pre-rendering:
 * - Empty array = Angular uses default dynamic SSR (no prerender timeout)
 * - RenderMode.Prerender = static pre-render (causes timeout on dynamic sites)
 * - RenderMode.AppShell = app shell cached, rest dynamic
 * 
 * For an auth-protected dynamic app, empty array is safest.
 */
export const serverRoutes: ServerRoute[] = [
    {
        path: '**',
        renderMode: RenderMode.Server
    }
];
