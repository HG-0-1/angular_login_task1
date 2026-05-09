import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError, timeout } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { TokenResponse } from '../modules/auth.module';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly apiUrl = 'https://test-acculab.azurewebsites.net/oauth/token';
  private readonly clientId = 'ACCULAB';
  private readonly clientSecret = 'acculab-secret';

  private readonly accessTokenCookieName = 'access_token';
  private readonly refreshTokenCookieName = 'refresh_token';
  private readonly tokenExpiryName = 'token_expiry';
  private readonly sessionIdName = 'session_id';

  // Performance: Cache cookies to avoid parsing on every call
  private cookieCache = new Map<string, string>();
  private lastValidityCheck = 0;
  private lastValidityResult = false;
  private readonly VALIDITY_CHECK_CACHE_MS = 1000; // Cache for 1 second

  private accessTokenSubject = new BehaviorSubject<string | null>(
    this.getCookie(this.accessTokenCookieName)
  );
  public accessToken$ = this.accessTokenSubject.asObservable();

  private saveSession(response: TokenResponse, username: string, loginTimestamp: number = Date.now()): void {
    // Generate unique session ID for extra validation
    const sessionId = this.generateSessionId();

    this.setCookie(this.accessTokenCookieName, response.access_token, response.expires_in);

    if (response.refresh_token) {
      this.setCookie(this.refreshTokenCookieName, response.refresh_token, response.expires_in);
    }

    // Store token expiry time for validation
    const expiryTime = Date.now() + (response.expires_in * 1000);
    this.setCookie(this.tokenExpiryName, expiryTime.toString(), response.expires_in);

    // Store session metadata
    this.setCookie('username', username, response.expires_in);
    this.setCookie('login_timestamp', loginTimestamp.toString(), response.expires_in);
    this.setCookie(this.sessionIdName, sessionId, response.expires_in);

    this.accessTokenSubject.next(response.access_token);
    this.invalidateCache(); // Clear cache after setting cookies
  }

  private setCookie(name: string, value: string, expiresInSeconds?: number): void {
    // Only set cookies over HTTPS in production for security
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    const expires = expiresInSeconds
      ? `; expires=${new Date(Date.now() + expiresInSeconds * 1000).toUTCString()}`
      : '';

    document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=Strict${secure}`;
    this.cookieCache.set(name, value); // Update cache
  }

  private getCookie(name: string): string | null {
    // Return from cache if available
    if (this.cookieCache.has(name)) {
      return this.cookieCache.get(name) || null;
    }

    // Use regex for faster cookie parsing
    const match = document.cookie.match(`(^|;)\\s*${name}=([^;]+)`);
    const value = match ? decodeURIComponent(match[2]) : null;

    if (value) {
      this.cookieCache.set(name, value);
    }

    return value;
  }

  private deleteCookie(name: string): void {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Strict${secure}`;
    this.cookieCache.delete(name); // Remove from cache
  }

  login(username: string, password: string): Observable<TokenResponse> {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    formData.append('grant_type', 'password');
    formData.append('client_id', this.clientId);
    formData.append('client_secret', this.clientSecret);

    return this.http.post<TokenResponse>(this.apiUrl, formData).pipe(
      // timeout(10000),
      tap((response) => {
        this.saveSession(response, username, Date.now());
      }),
      catchError((error) => {
        const errorMessage = this.getErrorMessage(error);
        return throwError(() => ({
          message: errorMessage,
          error,
        }));
      })
    );
  }

  private getErrorMessage(error: any): string {
    // Handle timeout errors
    if (error.name === 'TimeoutError') {
      return 'Login request timed out. Please check your connection and try again.';
    }

    // Handle HTTP errors
    if (error.status) {
      switch (error.status) {
        case 400:
          return 'Invalid username or password.';
        case 401:
          return 'Authentication failed. Please check your credentials.';
        case 403:
          return 'Access denied. Please contact support.';
        case 500:
          return 'Server error. Please try again later.';
        case 503:
          return 'Service temporarily unavailable. Please try again later.';
        default:
          return 'Login failed. Please try again.';
      }
    }

    // Handle network errors
    if (!error.status && error.message) {
      return 'Network error. Please check your connection and try again.';
    }

    return 'An unexpected error occurred. Please try again.';
  }

  logout(): void {
    this.deleteCookie(this.accessTokenCookieName);
    this.deleteCookie(this.refreshTokenCookieName);
    this.deleteCookie(this.tokenExpiryName);
    this.deleteCookie(this.sessionIdName);
    this.deleteCookie('username');
    this.deleteCookie('login_timestamp');
    this.invalidateCache();
    this.accessTokenSubject.next(null);
  }

  /**
   * Clear the cache when cookies are changed externally
   */
  private invalidateCache(): void {
    this.cookieCache.clear();
    this.lastValidityCheck = 0;
  }

  isLoggedIn(): boolean {
    return !!this.getCookie(this.accessTokenCookieName);
  }

  getToken(): string | null {
    return this.getCookie(this.accessTokenCookieName);
  }

  getRefreshToken(): string | null {
    return this.getCookie(this.refreshTokenCookieName);
  }

  getUsername(): string | null {
    return this.getCookie('username');
  }

  getLoginTimestamp(): number | null {
    const timestamp = this.getCookie('login_timestamp');
    if (!timestamp) return null;

    const parsed = parseInt(timestamp, 10);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Check if access token exists and is not expired
   * Uses cache to avoid repeated checks within 1 second
   */
  isTokenValid(): boolean {
    const now = Date.now();

    // Return cached result if within cache window
    if (now - this.lastValidityCheck < this.VALIDITY_CHECK_CACHE_MS) {
      return this.lastValidityResult;
    }

    const token = this.getCookie(this.accessTokenCookieName);
    const expiry = this.getCookie(this.tokenExpiryName);

    if (!token || !expiry) {
      this.lastValidityResult = false;
      this.lastValidityCheck = now;
      return false;
    }

    const expiryTime = parseInt(expiry, 10);

    // Token is valid if expiry is at least 30 seconds in the future
    const isValid = expiryTime > now + 30000;
    this.lastValidityResult = isValid;
    this.lastValidityCheck = now;

    return isValid;
  }

  /**
   * Refresh access token using refresh token
   */
  refreshAccessToken(): Observable<TokenResponse> {
    const refreshToken = this.getCookie(this.refreshTokenCookieName);

    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    const formData = new FormData();
    formData.append('grant_type', 'password');
    formData.append('refresh_token', refreshToken);
    formData.append('client_id', this.clientId);
    formData.append('client_secret', this.clientSecret);

    return this.http.post<TokenResponse>(this.apiUrl, formData).pipe(
      // timeout(10000),
      tap((response) => {
        const username = this.getUsername() || 'unknown';
        this.saveSession(response, username);
      }),
      catchError((error) => {
        // If refresh fails, logout user
        this.logout();
        return throwError(() => error);
      })
    );
  }

  /**
   * Generate unique session ID for additional security validation
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get stored session ID
   */
  getSessionId(): string | null {
    return this.getCookie(this.sessionIdName);
  }
}