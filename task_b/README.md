# MyTaskB

An Angular-based authentication system with token-based security, session management, and protected routes.

## Features

- **Authentication System**
  - Login with username/password
  - JWT token-based authentication
  - Automatic token refresh
  - Secure cookie storage
  - Session management

- **Route Protection**
  - `authGuard` - Protects authenticated routes
  - `noAuthGuard` - Prevents logged-in users from accessing login page
  - Automatic redirects based on authentication status

- **HTTP Interceptor**
  - Automatically attaches Bearer tokens to requests
  - Handles 401/403 errors by logging out user
  - Token refresh on expired tokens
  - CORS-safe (same-origin only)

- **UI Components**
  - Modern, responsive login form
  - Dashboard with user info and login timestamp
  - Password visibility toggle
  - Loading states and error handling
  - Material-inspired design

- **Directives & Pipes**
  - `authOnly` - Conditionally hide elements for unauthenticated users
  - `formatDate` - Date formatting pipe for consistent display

## Prerequisites

- Node.js (v18 or later)
- npm or yarn package manager
- Angular CLI (v17+)

## Installation

1. **Clone the repository**
git clone <repository-url>
cd my-task-b

2. **Install dependencies**
npm install

3. **Configure API endpoint**
   
   Update the API URL in `src/app/core/services/auth.service.ts`:

private readonly apiUrl = 'https://your-api-endpoint/oauth/token';


4. **Start development server**

ng serve


5. **Navigate to** `http://localhost:4200`

## Project Structure


src/
├── app/
│   ├── core/
│   │   ├── guards/
│   │   │   ├── auth.guard-guard.ts      # Route guard for authenticated routes
│   │   │   └── no-auth.guard.ts         # Route guard for public routes
│   │   ├── interceptors/
│   │   │   └── auth.interceptor-interceptor.ts  # HTTP auth interceptor
│   │   └── services/
│   │       └── auth.service.ts          # Authentication service
│   ├── features/
│   │   ├── dashboard.component/
│   │   │   ├── dashboard.component.ts
│   │   │   ├── dashboard.component.html
│   │   │   └── dashboard.component.scss
│   │   └── login/
│   │       └── login.component/
│   │           ├── login.component.ts
│   │           ├── login.component.html
│   │           └── login.component.scss
│   ├── shared/
│   │   ├── directives/
│   │   │   └── auth-only.directive.ts   # Conditional visibility directive
│   │   └── pipes/
│   │       └── format-date.pipe.ts      # Date formatting pipe
│   ├── app.ts
│   ├── app.config.ts
│   ├── app.routes.ts
│   └── app.scss
├── assets/
├── index.html
├── main.ts
└── styles.scss


## Configuration

### Environment Variables

Create `src/environments/environment.ts`:


export const environment = {
  production: false,
  apiUrl: 'https://your-api-endpoint',
  clientId: 'ACCULAB',
  clientSecret: 'acculab-secret',
  tokenExpiryBuffer: 30000, // 30 seconds buffer for token validation
};


### Cookie Security

The application uses secure cookies with:
- `SameSite=Strict` protection
- Secure flag in production (HTTPS only)
- Path restriction (`/` only)

##  Usage Guide
You Tube
Chat gpt
The AngularJS code that we had before
and Google

### Login Flow

1. User navigates to `/login` (redirected automatically)
2. Enter credentials (username: min 2 chars, password: min 6 chars)
3. Form validation occurs client-side
4. On success:
   - Tokens stored in cookies
   - Session ID generated
   - User redirected to `/dashboard`
5. On failure:
   - Error message displayed
   - Form re-enabled for retry

### Dashboard Features

- Displays welcome message with username
- Shows login timestamp (formatted with pipe)
- Logout button with loading state
- Error handling for logout failures
- Protected by `authOnly` directive

### Route Protection

| Route | Guard | Behavior |
|-------|-------|----------|
| `/login` | `noAuthGuard` | Redirects to dashboard if already logged in |
| `/dashboard` | `authGuard` | Redirects to login if not authenticated |
| `**` | - | Redirects to login |

##  Security Features

1. **Token Storage**
   - Tokens stored in HTTP-only cookies (simulated)
   - Secure and SameSite attributes enabled
   - Unique session IDs for validation

2. **Token Management**
   - Automatic validation with 30-second buffer
   - Refresh token mechanism
   - Automatic logout on invalid/expired tokens

3. **Request Security**
   - Tokens only attached to same-origin requests
   - Bearer authentication scheme
   - Automatic handling of 401/403 responses

4. **Session Validation**
   - Token expiry checking
   - Session ID verification
   - Cookie cache with TTL for performance


### Styling

The application uses SCSS with CSS custom properties:
- Modify colors in `app.scss` root variables
- Component-specific styles in respective `.scss` files
- Responsive design with flexbox and grid

### Adding New Protected Routes


{
  path: 'new-route',
  loadComponent: () => import('./path/to/component'),
  canActivate: [authGuardGuard],
  data: { redirectTo: '/login' }
}


### Using authOnly Directive

<div authOnly>
  <!-- Content only visible to authenticated users -->
</div>


## 🧪 Testing

Run unit tests:

ng test


##  Build

Production build:

ng build --configuration=production

Development build:

ng build



## API Integration

Expected API response format:


interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
}


##  State Management

The application uses:
- **Signals** for reactive state (Angular 17+)
- **BehaviorSubject** for token stream
- **OnPush** change detection strategy
- Manual change detection with `ChangeDetectorRef`

##  License

This project is licensed under the MIT License.

##  Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request



### Task distribution

### Noor (Core)
 `AuthService` implemented with login/logout/token methods
 `authInterceptor` configured
 `authGuard` and `noAuthGuard` working
 Interceptor registered in `app.config.ts`

### Sarah Hatim (Login)
 `LoginComponent` created (standalone)
 Reactive form with validation
 Error and loading states handled
 Redirect to dashboard after successful login

### Sarah (Dashboard)
 `DashboardComponent` created (standalone)
 Displays username and login timestamp
 Logout button working
 Uses pipe and directive correctly

### Hamdan (Shared + Routing + Structure)
 Routes configured with lazy loading
 `formatDatePipe` created and working
 `authOnlyDirective` created and working
 Proper folder structure established
 All components are standalone
 README completed