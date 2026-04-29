# AngularJS Login App

A simple AngularJS 1.8 authentication project using routing, login, dashboard, OAuth2 token authentication, route protection, HTTP interceptor, custom directive, custom filter, and LocalStorage session handling.

---

## Features

* Login with username/password
* OAuth2 token authentication
* Dashboard after login
* Protected routes (route guard)
* Auto redirect if not logged in
* HTTP Interceptor (adds token automatically)
* Custom directive (authOnly)
* Custom filter (formatDate)
* Session stored in LocalStorage
* Logout functionality

---

## Project Structure

project-folder/
├── index.html
├── ang.css
│
├── js_file/
│   ├── ang.js
│   ├── authService.js
│   ├── controllers.js
│
├── html_file/
│   ├── login.html
│   ├── dashboard.html

---

##  Authentication Flow

1. User enters username & password
2. Angular sends POST request to OAuth server:

POST https://test-acculab.azurewebsites.net/oauth/token

3. Server returns:

* access_token
* user object

4. App stores in LocalStorage:

token
user
loginTimestamp

5. User is redirected to `/dashboard`

---

## Auth Service (authservice)

### login(user)

Sends credentials using `x-www-form-urlencoded`

Includes:

* username
* password
* grant_type=password
* client_id
* client_secret

---

### savesession(data)

Stores session data:

* token
* user info
* login timestamp

---

### logout()

Clears LocalStorage and session

---

### islogin()

Checks if token exists

---

### gettoken()

Returns stored token

---

##  Routing (ang.js)

Routes:

| Route      | Page       |
| ---------- | ---------- |
| /login     | Login Page |
| /dashboard | Dashboard  |

### Route Protection

If user is NOT logged in:

* Redirect to `/login`

##  HTTP Interceptor

Automatically attaches token to every request:


Authorization: bearer <token>


##  Directive: authOnly

Used to hide/show elements based on login state:

<div authOnly>


* Logged in → show content
* Not logged in → hide content


##  Filter: formatDate

Converts timestamp to readable date:

Input:

1745900000000

Output:

4/29/2026, 2:00 PM


##  Controllers

### logincontroller

* Handles login request
* Shows error message if login fails
* Redirects to dashboard on success

### dashboardcontroller

* Loads user from LocalStorage
* Displays username
* Displays login time
* Handles logout

---

##  UI Pages

### Login Page

* Username input
* Password input
* Submit button

### Dashboard Page

* Welcome message
* Login timestamp
* Logout button

---

##  Security Notes

* Token stored in LocalStorage (not secure for production)
* Should use HTTPS only
* Should implement token expiration handling
* Client_secret should NOT be exposed in real apps

---

##  Run Project

### Option 1: Live Server

VS Code → "Go Live"

### Option 2: Python Server

python -m http.server

Open:

http://localhost:8000

---

##  Possible Improvements

* Add Register page
* Add Forgot Password
* Improve UI/UX
* Add loading spinner during login
* Handle token expiration
* Add refresh token support