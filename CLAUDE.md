# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

React Native app (Expo SDK 56) for managing an ESP32-based irrigation controller. Communication between the app and the ESP32 hardware happens exclusively through Firebase Firestore — neither side talks to the other directly.

Always read the exact versioned Expo docs at **https://docs.expo.dev/versions/v56.0.0/** before writing code that touches Expo or Expo Router APIs.

## Commands

```bash
npm start              # start dev server (scan QR with Expo Go)
npm run android        # open on Android
npm run ios            # open on iOS
npx tsc --noEmit       # type check (no test suite exists)
npm run lint           # expo lint
```

There is no build step for Expo Go. Type checking (`npx tsc --noEmit`) is the primary correctness tool.

## Architecture

### Navigation
Navigation is **not** the standard Expo Router tab layout. It uses `NativeTabs` from `expo-router/unstable-native-tabs`, manually configured in `src/components/app-tabs.tsx`. The three tabs map to routes by `name` prop: `index`, `pinos`, `logs`.

`src/app/explore.tsx` exists but is **not** referenced in any tab trigger — it is an unreachable leftover from the project template. Do not use it.

### Route vs non-route directories
Only files inside `src/app/` become Expo Router routes. `src/screens/` is a plain component folder (not routes). `SetupScreen.tsx` lives there precisely to avoid being auto-registered as a route.

### Boot flow
`_layout.tsx` renders `AppProvider` → `Root`. `Root` reads `mac` and `macLoading` from context:
- While loading SecureStore → blank screen
- `mac === null` → renders `SetupScreen` (full-screen, no tabs)
- `mac` set → renders `AppTabs`

### AppContext (`src/contexts/AppContext.tsx`)
Single source of truth for:
- `mac` — the ESP32 MAC address (persisted via `expo-secure-store`, key `controladora_mac`)
- `status` — live Firestore data, updated via `onSnapshot` (not polling)
- `online` — derived from `status.ultimaVez < 45s`

When `mac` changes, the previous `onSnapshot` listener is cancelled and a new one is opened. There is no manual refresh — status is always pushed by Firestore.

### Firebase (`src/services/firebase.ts` + `src/lib/firebaseConfig.ts`)
Uses the Firebase **JS SDK v12** (not `@react-native-firebase`). This works in Expo Go without a native build.

**Credentials** must be filled in `src/lib/firebaseConfig.ts` — it ships with placeholder strings.

All Firestore paths are prefixed with the MAC: `controllers/{mac}/...`

| Path | Writer | Reader |
|---|---|---|
| `config/main` | App | ESP32 |
| `pinos/main` | App | ESP32 |
| `status/main` | ESP32 | App (via `onSnapshot`) |
| `comandos/{id}` | App | ESP32 |
| `logs/{id}` | ESP32 | App |

Commands (iniciar/parar) are written as documents with `processado: false`. The ESP32 executes them and sets `processado: true`. The app does not wait for confirmation — it fires and relies on the `status` listener to reflect the result.

### Constants
`src/constants/irrigation.ts` holds the design system colors (`C.*`), `DIAS` array, `NUM_SETORES = 12`, and `NUM_PINOS = 4`. These are the fixed hardware constraints and should not be made configurable in the UI.
