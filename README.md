# TrackLink Web

## Overview

TrackLink is an application for sharing real-time location through public tracking links.

This repository contains the Angular frontend for TrackLink. It integrates with the TrackLink ASP.NET Core API for authentication, tracking creation and management, location history, and real-time updates through SignalR.

## Current Features

- User registration and login.
- Authentication with a JWT access token.
- Refresh token managed by the backend in an `HttpOnly` cookie.
- Session restoration after reload through the refresh endpoint.
- Protected dashboard with the authenticated user's tracking list.
- Creation of new location shares.
- Browser Geolocation API usage.
- Position updates during an active share.
- Tracking termination by the owner.
- Public `/tracking/:token` page for unauthenticated tracking.
- Map powered by Leaflet and OpenStreetMap.
- Display of the available history as a route.
- Real-time updates through SignalR.
- Handling for missing, closed/inactive, and expired tracking sessions.

## Stack

Versions declared in `package.json`:

- Angular: `^22.1.0`
- Angular CLI: `^22.1.6`
- TypeScript: `~6.0.2`
- RxJS: `~7.8.0`
- Leaflet: `^1.9.4`
- `@types/leaflet`: `^1.9.22`
- `@microsoft/signalr`: `^10.0.11`
- OpenStreetMap: used as the map tile provider

## Architecture

Main structure:

```text
src/app/
├── core/
│   ├── api/
│   ├── auth/
│   ├── geolocation/
│   ├── map/
│   └── tracking/
└── features/
    ├── auth/
    ├── dashboard/
    ├── location-sharing/
    └── public-tracking/
```

Responsibility summary:

- `core/auth/`: authentication state, guards, JWT interceptor, session restoration, and logout.
- `core/geolocation/`: Geolocation API wrapper and distance calculation.
- `core/map/`: public map integration with Leaflet.
- `core/tracking/`: contracts, tracking REST calls, and SignalR integration.
- `features/auth/`: login and registration screens.
- `features/dashboard/`: protected area with the user's tracking sessions.
- `features/location-sharing/`: local creation and update flow for location sharing.
- `features/public-tracking/`: public tracking page by token.

## Main Routes

Routes defined in `src/app/app.routes.ts`:

| Route | Access | Description |
| --- | --- | --- |
| `/login` | Public for anonymous users | Login |
| `/register` | Public for anonymous users | Registration |
| `/dashboard` | Protected | List and management of the user's tracking sessions |
| `/tracking/new` | Protected | Start and maintain a local location share |
| `/tracking/:token` | Public | Public view of a tracking session |

The `/tracking/new` route must remain before `/tracking/:token` so `new` is not interpreted as a public token.

## Authentication

The frontend keeps the access token only in memory while the application is running. The token is attached to protected requests by the HTTP interceptor as `Authorization: Bearer <access-token>`.

The refresh token is not read or stored by Angular. It is controlled by the backend in an `HttpOnly` cookie. After a reload, the frontend attempts to restore the session through `POST /api/auth/refresh`; when successful, the new access token is kept in memory again.

Tokens are not persisted in `localStorage`, `sessionStorage`, or any other storage accessible from JavaScript.

Public tracking endpoints explicitly opt out of authentication in the interceptor, so they do not depend on an authenticated session, Bearer token, refresh, or login redirect.

## Tracking

General flow:

```text
Geolocation API
-> REST API
-> TrackLink backend
-> SignalR
-> public page
-> Leaflet
```

In local sharing, the frontend gets an initial position with `getCurrentPosition()`, creates the tracking session through REST, and then watches new positions with `watchPosition()`.

Updates sent to the API do not mirror every browser callback. A new position is sent when there is a movement of at least 10 meters from the last position confirmed by the API, or when at least 10 seconds have passed since the last confirmed update.

The public page loads the current state through REST, loads the active tracking history, draws the route in Leaflet, and listens for new positions through SignalR. When it receives a real-time termination event, it keeps the last location and route visible.

## Running Locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm start
```

The Angular application runs locally on the Angular CLI server, usually at `http://localhost:4200/`.

The TrackLink ASP.NET Core backend must be available at the address configured in `src/app/core/api/api.config.ts`. The frontend currently uses:

```text
http://localhost:5258
```

## Tests

Run the unit tests with the project's actual script:

```bash
npm test
```

## Build

Generate the production build with:

```bash
npm run build
```

Artifacts are generated in `dist/`.

## Backend

This frontend depends on the TrackLink ASP.NET Core API for:

- registration, login, refresh, logout, and authenticated user data;
- tracking creation, update, listing, and termination;
- public tracking lookup by token;
- public location history;
- SignalR hub `/hubs/tracking` for real-time updates.

## Specs

Feature behavior requirements live in `specs/`.

The project is being developed with a Spec-Driven Development approach:

```text
spec -> plan -> implementation -> tests -> validation against the spec
```

The current specs cover authentication, dashboard, location sharing, and public tracking view.
