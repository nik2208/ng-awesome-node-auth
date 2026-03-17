import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { NG_AUTH_OPTIONS } from './auth.config';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
    let http: HttpClient;
    let httpMock: HttpTestingController;

    const setup = (apiPrefix: string) => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withInterceptors([authInterceptor])),
                provideHttpClientTesting(),
                { provide: NG_AUTH_OPTIONS, useValue: { apiPrefix } },
                { provide: AuthService, useValue: { refreshToken: () => {} } }
            ]
        });

        http = TestBed.inject(HttpClient);
        httpMock = TestBed.inject(HttpTestingController);
    };

    afterEach(() => {
        httpMock.verify();
    });

    it('should add X-CSRF-Token header to requests directed to the auth backend origin', () => {
        setup('https://mcp.awesomenodeauth.com/auth');
        
        // Mock a CSRF cookie (this would normally be handled by a service or document.cookie)
        document.cookie = 'csrf-token=test-token; path=/';

        http.get('https://mcp.awesomenodeauth.com/auth/me').subscribe();

        const req = httpMock.expectOne('https://mcp.awesomenodeauth.com/auth/me');
        expect(req.request.headers.has('X-CSRF-Token')).toBe(true);
        expect(req.request.headers.get('X-CSRF-Token')).toBe('test-token');
    });

    it('should add X-CSRF-Token to requests to the same origin but different path', () => {
        setup('https://mcp.awesomenodeauth.com/auth');
        
        document.cookie = 'csrf-token=test-token; path=/';

        http.get('https://mcp.awesomenodeauth.com/mcp/tool').subscribe();

        const req = httpMock.expectOne('https://mcp.awesomenodeauth.com/mcp/tool');
        expect(req.request.headers.has('X-CSRF-Token')).toBe(true);
    });

    it('should NOT add X-CSRF-Token header to requests directed to a different origin', () => {
        setup('https://mcp.awesomenodeauth.com/auth');
        
        document.cookie = 'csrf-token=test-token; path=/';

        http.get('https://litellm.external.com/v1/chat').subscribe();

        const req = httpMock.expectOne('https://litellm.external.com/v1/chat');
        expect(req.request.headers.has('X-CSRF-Token')).toBe(false);
    });

    it('should handle relative URLs correctly (same origin)', () => {
        setup('/auth'); // relative prefix
        
        document.cookie = 'csrf-token=test-token; path=/';

        http.get('/auth/me').subscribe();

        const req = httpMock.expectOne('/auth/me');
        expect(req.request.headers.has('X-CSRF-Token')).toBe(true);
    });
});
