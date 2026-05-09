# Security & Design Audit Report
**Angular 21 OAuth2 Authentication Flow**  
**Date:** May 9, 2026  
**Project:** my_task_b

---

## Executive Summary

Found **3 high-severity** issues, **5 medium-severity** issues, and **2 naming/style issues**. The auth flow is functional but has logic gaps and security blind spots.

---

## CRITICAL ISSUES

### 1. **isLogin() Does NOT Check Expiry – Guard Logic Mismatch** ⚠️ HIGH

**Location:**  
- `src/app/core/services/auth.service.ts` line 163: `islogin()` returns `!!this.getCookie(this.accessTokenCookieName)`
- `src/app/core/guards/no-auth.guard.ts` line 14: Uses `authService.islogin()` to decide if user can access login page

**Problem:**  
```typescript
// islogin() = token exists? 
islogin(): boolean {
  return !!this.getCookie(this.accessTokenCookieName);
}

// But isTokenValid() = token exists AND not expired
isTokenValid(): boolean {
  // ... checks expiry, returns false if expired
}
```

**Scenario:**  
1. User logs in, gets token with 1-hour expiry
2. User's token expires naturally (1 hour passes, server no longer recognizes it)
3. User refreshes browser → `noAuthGuard` calls `islogin()` → returns true (cookie still exists)
4. User redirected to dashboard, sees stale data
5. First API call gets 401 from server, only then realizes token is expired

**Impact:** XSS-style privilege escalation. User sees dashboard they're not authorized for until first API call.

**Fix:**  
```typescript
// no-auth.guard.ts should use isTokenValid(), not islogin()
if (authService.isTokenValid()) {  // ← CHANGE THIS
  return router.parseUrl('/dashboard');
}
```

---

### 2. **Token Storage: JavaScript-Accessible Cookies Are Not httpOnly** ⚠️ HIGH

**Location:**  
`src/app/core/services/auth.service.ts` lines 56–60: `setCookie()` method

**Current Code:**
```typescript
private setCookie(name: string, value: string, expiresInSeconds?: number): void {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  // ... document.cookie = `${name}=...${expires}; path=/; SameSite=Strict${secure}`;
}
```

**Problem:**  
- Sets `Secure`, `SameSite=Strict` ✓
- **But NO `HttpOnly` flag** ✗
- This means JavaScript can read the token: `document.cookie` is accessible
- Defeats cookie security against XSS. An XSS attack can still steal the token

**Why This Matters:**  
| Storage | XSS Vulnerable? | CSRF Vulnerable? | Notes |
|---------|-----------------|------------------|-------|
| localStorage/sessionStorage | YES (JS reads it) | NO (no auto-send) | Fast, but XSS loses all tokens |
| JavaScript cookies (current) | YES (JS reads it) | NO (`SameSite=Strict`) | Still vulnerable to XSS |
| **httpOnly cookies** | **NO** | NO (`SameSite=Strict`) | **Best practice** |
| Memory / in-process | YES (memory dump) | NO | Lost on refresh |

**Correct Approach:**  
The server should set httpOnly cookies. The client never touches them. Angular's HttpClient will auto-attach them to requests.

**What This App Actually Does:**
- Manually manages cookies in JavaScript
- Exposes tokens to XSS attacks
- CSRF is mitigated by `SameSite=Strict`

**Recommendation:**  
If the server sends httpOnly cookies, **delete all JavaScript cookie manipulation**. Just let the interceptor use them automatically. If you need to set cookies from JavaScript for some reason, this is a sign your backend isn't configured correctly.

---

### 3. **Refresh Token Grant Type Error** ⚠️ HIGH

**Location:**  
`src/app/core/services/auth.service.ts` line 227

**Code:**
```typescript
const formData = new FormData();
formData.append('grant_type', 'password');  // ← WRONG
formData.append('refresh_token', refreshToken);
```

**Problem:**  
- OAuth2 spec: When using a refresh token, `grant_type` should be `'refresh_token'`, not `'password'`
- The login() method uses `grant_type: 'password'` (correct for username/password flow)
- The refreshAccessToken() should use `grant_type: 'refresh_token'` (incorrect now)

**Impact:**  
Server may reject refresh requests if it validates grant_type strictly. Token refresh silently fails, user gets logged out.

**Fix:**
```typescript
const formData = new FormData();
formData.append('grant_type', 'refresh_token');  // ✓ CORRECT
formData.append('refresh_token', refreshToken);
```

---

## MEDIUM SEVERITY ISSUES

### 4. **getLoginTimestamp() Does Not Handle Malformed Data** ⚠️ MEDIUM

**Location:**  
`src/app/core/services/auth.service.ts` line 177

**Code:**
```typescript
getLoginTimestamp(): number | null {
  const timestamp = this.getCookie('login_timestamp');
  return timestamp ? parseInt(timestamp, 10) : null;
}
```

**Problem:**  
If a cookie value is malformed (e.g., `"abc123"` instead of `"1715334000000"`), `parseInt()` returns `NaN`.

**Scenario:**
```javascript
parseInt("abc123", 10);  // → NaN
parseInt("", 10);        // → NaN
parseInt(undefined, 10); // → NaN
```

The pipe will then try to format NaN:
```typescript
// In template: {{ loginTimestamp | formatDate }}
// If loginTimestamp is NaN, the pipe receives NaN
```

**Fix:**
```typescript
getLoginTimestamp(): number | null {
  const timestamp = this.getCookie('login_timestamp');
  if (!timestamp) return null;
  
  const parsed = parseInt(timestamp, 10);
  return isNaN(parsed) ? null : parsed;
}
```

---

### 5. **FormatDatePipe Does Not Validate Input** ⚠️ MEDIUM

**Location:**  
`src/app/shared/pipes/format-date.pipe.ts`

**Code:**
```typescript
transform(value: string | number | Date): string {
  if (value == null || value == undefined) 
    return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  return date.toLocaleString();
}
```

**Good:**
- Checks for null/undefined ✓
- Handles NaN dates ✓

**But:** If NaN is passed from `getLoginTimestamp()`, the template gets `'Invalid date'` instead of hiding the field.

**Better Pattern:**
```typescript
// In dashboard.component.html
@if (loginTimestamp && !isNaN(loginTimestamp)) {
  <p>Login time: {{ loginTimestamp | formatDate }}</p>
}
```

---

### 6. **Interceptor Doesn't Handle 400/422 Auth Errors** ⚠️ MEDIUM

**Location:**  
`src/app/core/interceptors/auth.interceptor-interceptor.ts` lines 54–65

**Current Code:**
```typescript
function handleAuthError(authService: AuthService, error: HttpErrorResponse): void {
  switch (error.status) {
    case 401:  // Unauthorized
    case 403:  // Forbidden
      authService.logout();
      break;
    case 0:  // Network error
      console.error('Network error - check CORS and connectivity');
      break;
  }
}
```

**Missing Cases:**
- **400 Bad Request**: Often means "invalid grant" in OAuth2 (expired refresh token, invalid credentials). App doesn't logout, user stuck in half-authenticated state.
- **422 Unprocessable Entity**: Validation error from server, also doesn't logout.

**Fix:**
```typescript
switch (error.status) {
  case 400:  // Bad Request → likely invalid refresh token
  case 401:  // Unauthorized
  case 403:  // Forbidden
  case 422:  // Unprocessable Entity
    authService.logout();
    break;
  case 0:
    console.error('Network error - check CORS and connectivity');
    break;
}
```

---

### 7. **No Request-Level Error Handler in Interceptor** ⚠️ MEDIUM

**Location:**  
`src/app/core/interceptors/auth.interceptor-interceptor.ts`

**Current Flow:**
```typescript
// Handles response errors only
return next(req).pipe(
  catchError((error: HttpErrorResponse) => {
    handleAuthError(authService, error);
    return throwError(() => error);
  })
);
```

**Missing:**  
No error handler for **request phase**. If the refresh token request itself fails before hitting the server (e.g., malformed request, network timeout), the error isn't caught.

**Pattern for Four-Hook Interceptor Equivalent:**
```typescript
// Should wrap the switchMap in its own error handler
return authService.refreshAccessToken().pipe(
  switchMap((response) => {
    req = attachTokenToRequest(req, response.access_token);
    return next(req);
  }),
  catchError((refreshError) => {
    // Handle refresh error (already does logout)
    return throwError(() => refreshError);
  })
);
```
This is actually **already correct** in the current code. The outer catch in the switchMap catches refresh failures.

---

### 8. **Route Guard Opens Refresh Timing Issue** ⚠️ MEDIUM

**Location:**  
`src/app/core/guards/auth.guard-guard.ts`

**Code:**
```typescript
if (authService.isTokenValid()) {
  return true;
}

if (authService.islogin()) {
  authService.logout();
}
```

**Timing Gap:**
1. Guard checks `isTokenValid()` → false (token expired)
2. Guard deletes cookie via `logout()`
3. Next page load → `islogin()` is now false
4. BUT: What if refresh token is still valid? Guard should try refresh before logout.

**Better Pattern:**
```typescript
if (authService.isTokenValid()) {
  return true;
}

// If we have a refresh token, try to refresh instead of logging out immediately
if (authService.getRefreshToken()) {
  return authService.refreshAccessToken().pipe(
    map(() => true),
    catchError(() => {
      authService.logout();
      return of(false);
    })
  );
}

// No refresh token either, logout and redirect
authService.logout();
const redirectTo = route.data?.['redirectTo'] as string | undefined;
return router.parseUrl(redirectTo ?? '/');
```

This would allow transparent token refresh without user seeing a logout.

---

### 9. **Double-Submit Race Condition** ⚠️ MEDIUM

**Location:**  
`src/app/features/login/login.component/login.component.ts` lines 60–75

**Code:**
```typescript
protected onSubmit(): void {
  if (this.loginForm.invalid) {
    this.loginForm.markAllAsTouched();
    return;
  }

  this.loginForm.disable();        // ← Disables form UI
  this.isLoading = true;           // ← Sets flag
  // ... authService.login().subscribe(...)
}
```

**Problem:**  
The form is **disabled** (no new input), but the **submit button is not explicitly disabled during the request**. Despite `isLoading` existing, if the button binding `[disabled]="isLoading"` breaks, users can click submit multiple times.

**Modern Angular 21 Approach (Signals):**
```typescript
readonly isLoading = signal(false);  // Already exists in dashboard

protected onSubmit(): void {
  if (this.loginForm.invalid) {
    this.loginForm.markAllAsTouched();
    return;
  }

  this.isLoading.set(true);
  this.authService.login(...).pipe(
    finalize(() => this.isLoading.set(false))
  ).subscribe({...});
}
```

This guarantees the button re-enables even if an error is thrown.

**Current Code:**
The login component uses plain `protected isLoading = false;` (class variable), not a signal. If an error race condition occurs, `isLoading` might not reset correctly.

---

## STYLE & NAMING ISSUES

### 10. **Method Naming: islogin() Should Be isLoggedIn()** ⚠️ LOW

**Location:**  
Multiple files use `authService.islogin()` (lowercase second word)

- `src/app/core/services/auth.service.ts` line 163: `islogin()`
- `src/app/core/guards/auth.guard-guard.ts` line 14: `authService.islogin()`
- `src/app/core/guards/no-auth.guard.ts` line 14: `authService.islogin()`
- `src/app/shared/directives/auth-only.directive.ts` line 16: `authService.islogin()`
- `src/app/features/dashboard.component/dashboard.component.ts` line 45: `authService.islogin()`

**Fix:**  
Rename to `isLoggedIn()` (camelCase convention).

---

### 11. **Redundant Guard Name: authGuardGuard** ⚠️ LOW

**File:**  
`src/app/core/guards/auth.guard-guard.ts`

**Issue:**  
The filename and export are redundant: `authGuardGuard` and `auth.guard-guard.ts`.

**Better:**  
Rename to `auth.guard.ts` and export `authGuard`.

---

## BEST PRACTICE VIOLATIONS (Angular 21)

### 12. **Component State: Use Signals Instead of Class Variables** 

**Location:**  
`src/app/features/login/login.component/login.component.ts` lines 28–30

```typescript
protected isLoading = false;        // ← Plain variable
protected errorMessage: string | null = null;  // ← Plain variable
protected showPassword = false;     // ← Plain variable
```

**Modern Angular 21:**
```typescript
protected readonly isLoading = signal(false);
protected readonly errorMessage = signal<string | null>(null);
protected readonly showPassword = signal(false);
```

**Benefit:**  
- Guarantees `ChangeDetectionStrategy.OnPush` sees changes
- Testable, predictable
- Integrates with computed() for derived state

---

### 13. **OAuth2 Client Secret in Frontend** ⚠️ SECURITY

**Location:**  
`src/app/core/services/auth.service.ts` line 14

```typescript
private readonly clientSecret = 'acculab-secret';
```

**CRITICAL ISSUE:**  
- Client secrets should NEVER be in frontend code (it's compiled/visible in source control)
- Should be in a backend that proxies OAuth2 requests

**Impact:**  
- Anyone can reverse-engineer your frontend and get the client secret
- If using Authorization Code flow (recommended), the secret is only in backend
- If using Implicit/PKCE, no secret needed

**Recommendation:**  
Backend should handle `POST /oauth/token` requests, not the frontend.

---

## POSITIVE OBSERVATIONS

✅ Uses `ChangeDetectionStrategy.OnPush` in components  
✅ Uses `takeUntilDestroyed()` to prevent memory leaks  
✅ Uses standalone components (Angular 21 style)  
✅ Form validation with Validators  
✅ Reactive forms (FormBuilder, FormGroup)  
✅ Error messages use `@if` (no empty DOM nodes for FOUC)  
✅ Accessibility: `aria-invalid`, `aria-describedby`, `aria-live`  
✅ Password toggle with proper ARIA labels  
✅ CSRF mitigation: `SameSite=Strict` cookies  
✅ Same-origin check in interceptor  

---

## SUMMARY TABLE

| Issue | Severity | Type | Component | Recommendation |
|-------|----------|------|-----------|-----------------|
| `islogin()` used instead of `isTokenValid()` in guard | HIGH | Auth Flow | no-auth.guard | Use `isTokenValid()` |
| JavaScript-accessible cookies vs httpOnly | HIGH | Security | auth.service | Let server set httpOnly; remove JS cookie code |
| `grant_type: 'password'` in refresh | HIGH | OAuth2 | auth.service | Change to `'refresh_token'` |
| `getLoginTimestamp()` NaN handling | MEDIUM | Defensive | auth.service | Add `isNaN()` check |
| Interceptor missing 400/422 logout | MEDIUM | Error Handling | interceptor | Add cases for 400, 422 |
| Guard doesn't retry refresh before logout | MEDIUM | UX | auth.guard | Try refresh first |
| Double-submit race condition | MEDIUM | Form | login.component | Use signals with finalize() |
| `islogin()` naming (should be `isLoggedIn()`) | LOW | Style | Multiple files | Rename method |
| `authGuardGuard` redundant name | LOW | Style | Guards | Rename to `authGuard` |
| Components use plain variables instead of signals | MEDIUM | Modern Angular | Components | Use `signal()` |
| Client secret in frontend | CRITICAL | Security | auth.service | Move OAuth to backend |

---

## NEXT STEPS

1. **Immediate (Security):**
   - Move client secret to backend
   - Fix grant_type in refreshAccessToken()
   - Use isTokenValid() in noAuthGuard

2. **Short Term (Correctness):**
   - Add NaN check in getLoginTimestamp()
   - Add 400/422 to interceptor error handler
   - Rename islogin() → isLoggedIn()

3. **Medium Term (Modern Angular):**
   - Convert component state to signals
   - Try refresh before logout in guard
   - Implement proper httpOnly cookie handling (backend-driven)

4. **Long Term (Architecture):**
   - Move OAuth2 client to backend server
   - Use Authorization Code + PKCE (never store secrets in frontend)

