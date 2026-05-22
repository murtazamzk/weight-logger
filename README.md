# Weight Logger

A lightweight weight tracking app built with React, TypeScript, and Vite.

## Stack

- **React** for UI rendering
- **TypeScript** for type safety
- **Vite** for fast development and build
- **Tailwind CSS** for utility-based styling
- **Recharts** for chart visualization
- **Dexie** for IndexedDB local storage
- **Zod** for form validation
- **Mock Supabase adapter** for online sync behavior

## Offline / Online sync

This project is designed to work offline first and sync to a mock remote backend when connectivity returns.

- Entries are written to **IndexedDB** immediately.
- Offline entries remain visible and are stored locally.
- When the app goes back online, pending local entries are synced.
- The mock Supabase adapter persists data to **localStorage**, so refreshes do not lose synced data.
- The UI displays connection status and sync state, including `Syncing…` and `Last sync`.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Notes

- The remote backend is currently mocked in `src/service/adapters/supabase.adapter.ts`.
- Mock remote data is kept in localStorage for persistence during development and refreshes.
- This setup is usseful for testing offline-first sync behavior without a real Supabase project.
