# Twake Drive Mobile v1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a read-only React Native mobile app (iOS + Android) for Twake Drive, with email-based auto-discovery auth (calque cozy-flagship-app), tabbed navigation across Mes fichiers / Partagés / Récents / Corbeille, file metadata bottom sheet, mobile breadcrumb, swipe-back, and dark mode auto.

**Architecture:** Expo (managed + prebuild) + Expo Router (file-based) + React Native Paper (Material 3) + cozy-client (data layer, no Redux) + expo-secure-store (tokens) + react-i18next (FR/EN). Auth utilities are pure TS modules, fully unit-tested. UI uses functional components, no inline styles, no Material UI / cozy-ui (web-only).

**Tech Stack:** Expo SDK 53, React Native 0.79, TypeScript strict, React Native Paper 5, @gorhom/bottom-sheet 5, cozy-client ^58, expo-router 4, expo-secure-store, expo-web-browser, expo-localization, react-i18next, date-fns 2.29, Jest + @testing-library/react-native + nock.

**Reference spec:** `docs/superpowers/specs/2026-05-01-twake-drive-mobile-design.md`

**Working directory:** `/Users/quentinvalmori/Sites/Linagora/twake-drive-mobile/`

---

## File structure (target)

```
twake-drive-mobile/
├── app.json
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
├── jest.config.js
├── jest.setup.ts
├── .gitignore
├── .eslintrc.js
├── .prettierrc
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── welcome.tsx
│   │   └── login.tsx
│   └── (drive)/
│       ├── _layout.tsx
│       ├── files/
│       │   ├── _layout.tsx
│       │   └── [...path].tsx
│       ├── shared/
│       │   ├── _layout.tsx
│       │   └── [...path].tsx
│       ├── recent.tsx
│       └── trash.tsx
├── src/
│   ├── auth/
│   │   ├── autodiscovery.ts
│   │   ├── autodiscovery.test.ts
│   │   ├── oidcFlow.ts
│   │   ├── oidcFlow.test.ts
│   │   ├── tokenStorage.ts
│   │   ├── tokenStorage.test.ts
│   │   ├── useAuth.ts
│   │   ├── useAuth.test.tsx
│   │   ├── revocationListener.ts
│   │   └── types.ts
│   ├── client/
│   │   ├── createClient.ts
│   │   └── queries.ts
│   ├── ui/
│   │   ├── theme.ts
│   │   ├── AppBar.tsx
│   │   ├── FileRow.tsx
│   │   ├── FileRow.test.tsx
│   │   ├── FolderRow.tsx
│   │   ├── FolderRow.test.tsx
│   │   ├── FileMetadataSheet.tsx
│   │   ├── Breadcrumb.tsx
│   │   ├── Breadcrumb.test.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ErrorState.tsx
│   │   └── LoadingState.tsx
│   ├── i18n/
│   │   ├── index.ts
│   │   └── locales/
│   │       ├── fr.json
│   │       └── en.json
│   └── utils/
│       ├── fileIcons.ts
│       ├── fileIcons.test.ts
│       ├── formatters.ts
│       ├── formatters.test.ts
│       └── errorMessages.ts
└── assets/
    ├── icon.png
    ├── splash.png
    └── adaptive-icon.png
```

---

## Phase 0 — Project bootstrap

### Task 0.1: Initialize Expo project

**Files:**
- Create: full project skeleton via `create-expo-app`

- [ ] **Step 1: Init project (from parent dir)**

```bash
cd /Users/quentinvalmori/Sites/Linagora
# Remove the empty placeholder dir so create-expo-app can create it
rmdir twake-drive-mobile
npx create-expo-app@latest twake-drive-mobile --template blank-typescript
cd twake-drive-mobile
```

Expected: project bootstrapped, `package.json`, `App.tsx`, `tsconfig.json` present.

- [ ] **Step 2: Init git**

```bash
cd /Users/quentinvalmori/Sites/Linagora/twake-drive-mobile
git init
git add .
git commit -m "chore: bootstrap expo project"
```

- [ ] **Step 3: Install Expo Router and required deps**

```bash
npx expo install expo-router react-native-screens react-native-safe-area-context react-native-gesture-handler react-native-reanimated
```

- [ ] **Step 4: Install UI deps**

```bash
npx expo install react-native-paper react-native-vector-icons @gorhom/bottom-sheet
```

- [ ] **Step 5: Install i18n / locale / dates / browser / secure-store**

```bash
npx expo install expo-localization expo-secure-store expo-web-browser
yarn add react-i18next i18next date-fns@^2.29.3
```

- [ ] **Step 6: Install cozy-client**

```bash
yarn add cozy-client@^58 cozy-stack-client@^58 cozy-minilog
```

- [ ] **Step 7: Install dev deps**

```bash
yarn add --dev @testing-library/react-native@^12 nock@^13 jest-expo @types/react-native-vector-icons eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-prettier eslint-config-prettier prettier
```

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "chore: add core dependencies"
```

### Task 0.2: Configure Expo Router & custom scheme

**Files:**
- Modify: `app.json`
- Modify: `package.json` (entry point)
- Create: `babel.config.js` (overwrite default)
- Delete: `App.tsx` (Expo Router uses `app/` instead)

- [ ] **Step 1: Update `app.json`**

```json
{
  "expo": {
    "name": "Twake Drive",
    "slug": "twake-drive-mobile",
    "version": "0.1.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "twakedrive",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.linagora.twakedrive"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.linagora.twakedrive"
    },
    "plugins": ["expo-router", "expo-secure-store", "expo-web-browser", "expo-localization"],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

- [ ] **Step 2: Update `package.json` main entry**

In `package.json`, replace `"main"` value with:
```json
"main": "expo-router/entry"
```

- [ ] **Step 3: Overwrite `babel.config.js`**

```js
module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src'
          }
        }
      ]
    ]
  }
}
```

- [ ] **Step 4: Install babel-plugin-module-resolver**

```bash
yarn add --dev babel-plugin-module-resolver
```

- [ ] **Step 5: Update `tsconfig.json` paths**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

- [ ] **Step 6: Delete `App.tsx`**

```bash
rm App.tsx
```

- [ ] **Step 7: Create empty `app/` placeholder (will be filled later)**

```bash
mkdir -p app assets src/auth src/client src/ui src/i18n/locales src/utils
```

- [ ] **Step 8: Verify dev server boots**

```bash
yarn start
```

Expected: Metro boots, message about missing routes (since `app/` is empty). Press `Ctrl+C` to stop.

- [ ] **Step 9: Commit**

```bash
git add .
git commit -m "chore: configure expo-router, custom scheme twakedrive, path aliases"
```

### Task 0.3: Setup Jest + ESLint + Prettier

**Files:**
- Create: `jest.config.js`
- Create: `jest.setup.ts`
- Create: `.eslintrc.js`
- Create: `.prettierrc`
- Modify: `package.json` scripts

- [ ] **Step 1: Create `jest.config.js`**

```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEach: ['./jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@gorhom/bottom-sheet|react-native-paper))'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testPathIgnorePatterns: ['/node_modules/', '/.expo/']
}
```

- [ ] **Step 2: Create `jest.setup.ts`**

```ts
import '@testing-library/react-native/extend-expect'

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn()
}))

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
  WebBrowserResultType: {
    SUCCESS: 'success',
    CANCEL: 'cancel',
    DISMISS: 'dismiss'
  }
}))

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'fr', languageTag: 'fr-FR' }]
}))
```

- [ ] **Step 3: Create `.eslintrc.js`**

```js
module.exports = {
  root: true,
  extends: ['expo', 'prettier'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
  }
}
```

- [ ] **Step 4: Create `.prettierrc`**

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "none",
  "printWidth": 100,
  "arrowParens": "avoid"
}
```

- [ ] **Step 5: Add scripts to `package.json`**

In `package.json`, add to `"scripts"`:
```json
"test": "jest",
"test:watch": "jest --watch",
"lint": "eslint . --ext .ts,.tsx",
"typecheck": "tsc --noEmit"
```

- [ ] **Step 6: Add eslint-config-expo**

```bash
yarn add --dev eslint-config-expo
```

- [ ] **Step 7: Run setup verification**

```bash
yarn typecheck && yarn lint
```

Expected: typecheck passes, lint passes (or zero errors — there may be warnings, accept those for now).

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "chore: setup jest, eslint, prettier"
```

---

## Phase 1 — Theming & i18n

### Task 1.1: Create theme

**Files:**
- Create: `src/ui/theme.ts`

- [ ] **Step 1: Write `src/ui/theme.ts`**

```ts
import { MD3LightTheme, MD3DarkTheme, MD3Theme } from 'react-native-paper'

const twakeColors = {
  primary: '#0072B2',
  primaryContainer: '#CCE6F4',
  secondary: '#5B7180',
  surface: '#FFFFFF',
  background: '#F5F7FA',
  error: '#D32F2F'
}

const twakeColorsDark = {
  primary: '#5BB6E6',
  primaryContainer: '#003D5C',
  secondary: '#9AAFBC',
  surface: '#1E2126',
  background: '#15171A',
  error: '#EF5350'
}

export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...twakeColors
  }
}

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...twakeColorsDark
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/theme.ts
git commit -m "feat(theme): add light/dark MD3 themes with Twake colors"
```

### Task 1.2: Setup i18n

**Files:**
- Create: `src/i18n/index.ts`
- Create: `src/i18n/locales/fr.json`
- Create: `src/i18n/locales/en.json`

- [ ] **Step 1: Create `src/i18n/locales/fr.json`**

```json
{
  "common": {
    "close": "Fermer",
    "retry": "Réessayer",
    "loading": "Chargement…",
    "logout": "Se déconnecter"
  },
  "auth": {
    "welcomeTitle": "Bienvenue sur Twake Drive",
    "welcomeSubtitle": "Vos fichiers, partout, en sécurité.",
    "loginCta": "Se connecter",
    "emailLabel": "Adresse email",
    "emailPlaceholder": "vous@exemple.com",
    "continue": "Continuer",
    "errorDomainUnsupported": "Ce domaine ne supporte pas Twake Drive.",
    "errorNetwork": "Pas de connexion. Vérifiez votre réseau.",
    "errorGeneric": "Impossible de se connecter. Réessayez."
  },
  "drive": {
    "myFiles": "Mes fichiers",
    "shared": "Partagés avec moi",
    "recent": "Récents",
    "trash": "Corbeille",
    "emptyFolder": "Aucun fichier dans ce dossier",
    "emptyShared": "Aucun fichier partagé avec vous",
    "emptyRecent": "Aucun fichier récent",
    "emptyTrash": "Corbeille vide",
    "fileMeta": {
      "type": "Type",
      "size": "Taille",
      "modified": "Modifié",
      "path": "Chemin",
      "owner": "Propriétaire"
    }
  },
  "errors": {
    "noNetwork": "Pas de connexion",
    "forbidden": "Accès refusé",
    "notFound": "Ce dossier n'existe plus",
    "server": "Erreur serveur, réessayez plus tard",
    "generic": "Quelque chose s'est mal passé"
  }
}
```

- [ ] **Step 2: Create `src/i18n/locales/en.json`**

```json
{
  "common": {
    "close": "Close",
    "retry": "Retry",
    "loading": "Loading…",
    "logout": "Log out"
  },
  "auth": {
    "welcomeTitle": "Welcome to Twake Drive",
    "welcomeSubtitle": "Your files, everywhere, safely.",
    "loginCta": "Log in",
    "emailLabel": "Email address",
    "emailPlaceholder": "you@example.com",
    "continue": "Continue",
    "errorDomainUnsupported": "This domain does not support Twake Drive.",
    "errorNetwork": "No connection. Check your network.",
    "errorGeneric": "Could not log in. Try again."
  },
  "drive": {
    "myFiles": "My files",
    "shared": "Shared with me",
    "recent": "Recent",
    "trash": "Trash",
    "emptyFolder": "No files in this folder",
    "emptyShared": "No files shared with you",
    "emptyRecent": "No recent files",
    "emptyTrash": "Trash is empty",
    "fileMeta": {
      "type": "Type",
      "size": "Size",
      "modified": "Modified",
      "path": "Path",
      "owner": "Owner"
    }
  },
  "errors": {
    "noNetwork": "No connection",
    "forbidden": "Access denied",
    "notFound": "This folder no longer exists",
    "server": "Server error, try again later",
    "generic": "Something went wrong"
  }
}
```

- [ ] **Step 3: Create `src/i18n/index.ts`**

```ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { getLocales } from 'expo-localization'

import en from './locales/en.json'
import fr from './locales/fr.json'

const resources = {
  en: { translation: en },
  fr: { translation: fr }
}

const deviceLocale = getLocales()[0]?.languageCode ?? 'en'
const lng = deviceLocale === 'fr' ? 'fr' : 'en'

i18n.use(initReactI18next).init({
  resources,
  lng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
})

export default i18n
```

- [ ] **Step 4: Verify typecheck**

```bash
yarn typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/i18n
git commit -m "feat(i18n): add fr/en locales and react-i18next setup"
```

---

## Phase 2 — Auth utilities (TDD)

### Task 2.1: Auth types

**Files:**
- Create: `src/auth/types.ts`

- [ ] **Step 1: Write `src/auth/types.ts`**

```ts
export interface TwakeConfiguration {
  'twake-pass-login-uri'?: string
  'twake-flagship-login-uri'?: string
}

export interface OidcCallback {
  fqdn: string
  registerToken: string
  code?: string | null
}

export interface Session {
  uri: string
  accessToken: string
  refreshToken: string
}

export class UserCancelledError extends Error {
  constructor() {
    super('User cancelled OIDC flow')
    this.name = 'UserCancelledError'
  }
}

export class DiscoveryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DiscoveryError'
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/auth/types.ts
git commit -m "feat(auth): add auth domain types"
```

### Task 2.2: `extractDomain` (TDD)

**Files:**
- Create: `src/auth/autodiscovery.test.ts`
- Create: `src/auth/autodiscovery.ts`

- [ ] **Step 1: Write failing test**

`src/auth/autodiscovery.test.ts`:
```ts
import { extractDomain } from './autodiscovery'

describe('extractDomain', () => {
  it('returns the domain part of a valid email', () => {
    expect(extractDomain('user@example.com')).toBe('example.com')
  })

  it('handles emails with subdomains', () => {
    expect(extractDomain('user@mail.example.com')).toBe('mail.example.com')
  })

  it('returns null for an empty string', () => {
    expect(extractDomain('')).toBeNull()
  })

  it('returns null for a string without @', () => {
    expect(extractDomain('not-an-email')).toBeNull()
  })

  it('trims whitespace', () => {
    expect(extractDomain('  user@example.com  ')).toBe('example.com')
  })

  it('uses the last @ if multiple are present', () => {
    expect(extractDomain('weird@@example.com')).toBe('example.com')
  })
})
```

- [ ] **Step 2: Run failing test**

```bash
yarn test src/auth/autodiscovery.test.ts
```

Expected: FAIL — `extractDomain` not exported.

- [ ] **Step 3: Implement `extractDomain`**

`src/auth/autodiscovery.ts`:
```ts
export const extractDomain = (email: string): string | null => {
  if (!email) return null
  const trimmed = email.trim()
  const atIndex = trimmed.lastIndexOf('@')
  if (atIndex === -1) return null
  const domain = trimmed.substring(atIndex + 1)
  return domain.length > 0 ? domain : null
}
```

- [ ] **Step 4: Run test → PASS**

```bash
yarn test src/auth/autodiscovery.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/auth/autodiscovery.ts src/auth/autodiscovery.test.ts
git commit -m "feat(auth): extractDomain utility (TDD)"
```

### Task 2.3: `fetchTwakeConfiguration` (TDD with nock)

**Files:**
- Modify: `src/auth/autodiscovery.test.ts`
- Modify: `src/auth/autodiscovery.ts`

- [ ] **Step 1: Add failing test**

Append to `src/auth/autodiscovery.test.ts`:
```ts
import nock from 'nock'
import { fetchTwakeConfiguration } from './autodiscovery'

describe('fetchTwakeConfiguration', () => {
  afterEach(() => nock.cleanAll())

  it('returns the parsed configuration on 200', async () => {
    nock('https://example.com')
      .get('/.well-known/twake-configuration')
      .reply(200, { 'twake-flagship-login-uri': 'https://login.example.com/oauth' })

    const result = await fetchTwakeConfiguration('example.com')
    expect(result).toEqual({ 'twake-flagship-login-uri': 'https://login.example.com/oauth' })
  })

  it('returns null on non-200 response', async () => {
    nock('https://example.com').get('/.well-known/twake-configuration').reply(404)
    const result = await fetchTwakeConfiguration('example.com')
    expect(result).toBeNull()
  })

  it('returns null on network error', async () => {
    nock('https://example.com')
      .get('/.well-known/twake-configuration')
      .replyWithError('boom')
    const result = await fetchTwakeConfiguration('example.com')
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run → FAIL**

```bash
yarn test src/auth/autodiscovery.test.ts
```

Expected: FAIL — `fetchTwakeConfiguration` not exported.

- [ ] **Step 3: Implement**

Append to `src/auth/autodiscovery.ts`:
```ts
import { TwakeConfiguration } from './types'

export const fetchTwakeConfiguration = async (
  domain: string
): Promise<TwakeConfiguration | null> => {
  const url = `https://${domain}/.well-known/twake-configuration`
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' }
    })
    if (!response.ok) return null
    return (await response.json()) as TwakeConfiguration
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run → PASS**

```bash
yarn test src/auth/autodiscovery.test.ts
```

Expected: PASS, 9 tests total.

- [ ] **Step 5: Commit**

```bash
git add src/auth/autodiscovery.test.ts src/auth/autodiscovery.ts
git commit -m "feat(auth): fetchTwakeConfiguration (TDD)"
```

### Task 2.4: `getLoginUri` (TDD)

**Files:**
- Modify: `src/auth/autodiscovery.test.ts`
- Modify: `src/auth/autodiscovery.ts`

- [ ] **Step 1: Add failing test**

Append to `src/auth/autodiscovery.test.ts`:
```ts
import { getLoginUri } from './autodiscovery'

describe('getLoginUri', () => {
  afterEach(() => nock.cleanAll())

  it('returns the login URI with redirect_after_oidc appended', async () => {
    nock('https://example.com')
      .get('/.well-known/twake-configuration')
      .reply(200, { 'twake-flagship-login-uri': 'https://login.example.com/oauth' })

    const result = await getLoginUri('user@example.com')
    expect(result).not.toBeNull()
    expect(result?.origin).toBe('https://login.example.com')
    expect(result?.searchParams.get('redirect_after_oidc')).toBe('twakedrive://')
  })

  it('returns null for an invalid email', async () => {
    expect(await getLoginUri('not-an-email')).toBeNull()
  })

  it('returns null when twake-configuration has no flagship-login-uri', async () => {
    nock('https://example.com')
      .get('/.well-known/twake-configuration')
      .reply(200, { 'twake-pass-login-uri': 'https://pass.example.com' })
    expect(await getLoginUri('user@example.com')).toBeNull()
  })

  it('preserves existing query params on the login URI', async () => {
    nock('https://example.com')
      .get('/.well-known/twake-configuration')
      .reply(200, {
        'twake-flagship-login-uri': 'https://login.example.com/oauth?client_id=foo'
      })
    const result = await getLoginUri('user@example.com')
    expect(result?.searchParams.get('client_id')).toBe('foo')
    expect(result?.searchParams.get('redirect_after_oidc')).toBe('twakedrive://')
  })
})
```

- [ ] **Step 2: Run → FAIL**

```bash
yarn test src/auth/autodiscovery.test.ts
```

- [ ] **Step 3: Implement**

Append to `src/auth/autodiscovery.ts`:
```ts
const REDIRECT_SCHEME = 'twakedrive://'

export const getLoginUri = async (email: string): Promise<URL | null> => {
  const domain = extractDomain(email)
  if (!domain) return null

  const config = await fetchTwakeConfiguration(domain)
  const flagshipUri = config?.['twake-flagship-login-uri']
  if (!flagshipUri) return null

  try {
    const uri = new URL(flagshipUri)
    uri.searchParams.append('redirect_after_oidc', REDIRECT_SCHEME)
    return uri
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run → PASS**

```bash
yarn test src/auth/autodiscovery.test.ts
```

Expected: 13 tests pass total.

- [ ] **Step 5: Commit**

```bash
git add src/auth/autodiscovery.test.ts src/auth/autodiscovery.ts
git commit -m "feat(auth): getLoginUri composing discovery + redirect (TDD)"
```

### Task 2.5: `tokenStorage` (TDD)

**Files:**
- Create: `src/auth/tokenStorage.test.ts`
- Create: `src/auth/tokenStorage.ts`

- [ ] **Step 1: Write tests**

`src/auth/tokenStorage.test.ts`:
```ts
import * as SecureStore from 'expo-secure-store'

import { saveSession, getSession, clearSession, SESSION_KEY } from './tokenStorage'

const session = {
  uri: 'https://example.com',
  accessToken: 'access-1',
  refreshToken: 'refresh-1'
}

describe('tokenStorage', () => {
  beforeEach(() => jest.clearAllMocks())

  it('saveSession serializes the session under SESSION_KEY', async () => {
    await saveSession(session)
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(SESSION_KEY, JSON.stringify(session))
  })

  it('getSession returns parsed session when present', async () => {
    ;(SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(JSON.stringify(session))
    expect(await getSession()).toEqual(session)
  })

  it('getSession returns null when nothing stored', async () => {
    ;(SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null)
    expect(await getSession()).toBeNull()
  })

  it('getSession returns null on malformed JSON and clears storage', async () => {
    ;(SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('not-json')
    expect(await getSession()).toBeNull()
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(SESSION_KEY)
  })

  it('clearSession deletes the stored item', async () => {
    await clearSession()
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(SESSION_KEY)
  })
})
```

- [ ] **Step 2: Run → FAIL**

```bash
yarn test src/auth/tokenStorage.test.ts
```

- [ ] **Step 3: Implement `src/auth/tokenStorage.ts`**

```ts
import * as SecureStore from 'expo-secure-store'

import { Session } from './types'

export const SESSION_KEY = 'twake-drive-session'

export const saveSession = async (session: Session): Promise<void> => {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session))
}

export const getSession = async (): Promise<Session | null> => {
  const raw = await SecureStore.getItemAsync(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Session
  } catch {
    await SecureStore.deleteItemAsync(SESSION_KEY)
    return null
  }
}

export const clearSession = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(SESSION_KEY)
}
```

- [ ] **Step 4: Run → PASS**

```bash
yarn test src/auth/tokenStorage.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/auth/tokenStorage.ts src/auth/tokenStorage.test.ts
git commit -m "feat(auth): tokenStorage backed by expo-secure-store (TDD)"
```

### Task 2.6: `parseCallbackUrl` (TDD)

**Files:**
- Create: `src/auth/oidcFlow.test.ts`
- Create: `src/auth/oidcFlow.ts`

- [ ] **Step 1: Write test**

`src/auth/oidcFlow.test.ts`:
```ts
import { parseCallbackUrl } from './oidcFlow'

describe('parseCallbackUrl', () => {
  it('extracts fqdn and registerToken from a callback URL', () => {
    const url = 'twakedrive://?fqdn=alice.example.com&registerToken=abc123'
    expect(parseCallbackUrl(url)).toEqual({
      fqdn: 'alice.example.com',
      registerToken: 'abc123',
      code: null
    })
  })

  it('extracts code when present', () => {
    const url = 'twakedrive://?fqdn=alice.example.com&registerToken=abc&code=xyz'
    expect(parseCallbackUrl(url)).toEqual({
      fqdn: 'alice.example.com',
      registerToken: 'abc',
      code: 'xyz'
    })
  })

  it('throws when fqdn is missing', () => {
    expect(() => parseCallbackUrl('twakedrive://?registerToken=abc')).toThrow(/fqdn/)
  })

  it('throws when registerToken is missing', () => {
    expect(() => parseCallbackUrl('twakedrive://?fqdn=alice.example.com')).toThrow(/registerToken/)
  })

  it('throws on a malformed URL', () => {
    expect(() => parseCallbackUrl('not a url')).toThrow()
  })
})
```

- [ ] **Step 2: Run → FAIL**

```bash
yarn test src/auth/oidcFlow.test.ts
```

- [ ] **Step 3: Implement**

`src/auth/oidcFlow.ts`:
```ts
import * as WebBrowser from 'expo-web-browser'

import { OidcCallback, UserCancelledError } from './types'

export const parseCallbackUrl = (callbackUrl: string): OidcCallback => {
  const url = new URL(callbackUrl)
  const fqdn = url.searchParams.get('fqdn')
  const registerToken = url.searchParams.get('registerToken')
  const code = url.searchParams.get('code')

  if (!fqdn) throw new Error('Callback URL missing fqdn')
  if (!registerToken) throw new Error('Callback URL missing registerToken')

  return { fqdn, registerToken, code }
}

export const startOidcFlow = async (loginUri: URL): Promise<OidcCallback> => {
  const result = await WebBrowser.openAuthSessionAsync(loginUri.toString(), 'twakedrive://')
  if (result.type !== 'success') throw new UserCancelledError()
  return parseCallbackUrl(result.url)
}
```

- [ ] **Step 4: Run → PASS**

```bash
yarn test src/auth/oidcFlow.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Add tests for `startOidcFlow`**

Append to `src/auth/oidcFlow.test.ts`:
```ts
import * as WebBrowser from 'expo-web-browser'

import { startOidcFlow } from './oidcFlow'
import { UserCancelledError } from './types'

describe('startOidcFlow', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns parsed callback on success', async () => {
    ;(WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce({
      type: 'success',
      url: 'twakedrive://?fqdn=alice.example.com&registerToken=abc'
    })
    const result = await startOidcFlow(new URL('https://login.example.com/oauth'))
    expect(result).toEqual({ fqdn: 'alice.example.com', registerToken: 'abc', code: null })
  })

  it('throws UserCancelledError when result type is cancel', async () => {
    ;(WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce({ type: 'cancel' })
    await expect(startOidcFlow(new URL('https://login.example.com/oauth'))).rejects.toBeInstanceOf(
      UserCancelledError
    )
  })

  it('throws UserCancelledError when result type is dismiss', async () => {
    ;(WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce({ type: 'dismiss' })
    await expect(startOidcFlow(new URL('https://login.example.com/oauth'))).rejects.toBeInstanceOf(
      UserCancelledError
    )
  })
})
```

- [ ] **Step 6: Run → PASS**

```bash
yarn test src/auth/oidcFlow.test.ts
```

Expected: 8 tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/auth/oidcFlow.ts src/auth/oidcFlow.test.ts
git commit -m "feat(auth): parseCallbackUrl + startOidcFlow with WebBrowser (TDD)"
```

---

## Phase 3 — cozy-client setup & auth hook

### Task 3.1: `createClient`

**Files:**
- Create: `src/client/createClient.ts`

- [ ] **Step 1: Write `src/client/createClient.ts`**

```ts
import CozyClient from 'cozy-client'

import { Session } from '@/auth/types'

export const createClient = (session: Session): CozyClient =>
  new CozyClient({
    uri: session.uri,
    token: session.accessToken,
    appMetadata: {
      slug: 'twake-drive-mobile',
      version: '0.1.0'
    }
  })
```

- [ ] **Step 2: Verify typecheck**

```bash
yarn typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/client/createClient.ts
git commit -m "feat(client): createClient factory from session"
```

### Task 3.2: `registerSession` flow

**Files:**
- Create: `src/auth/registerSession.ts`

> Note: cozy-client OAuth registration goes through `client.startOAuthFlow` for the full flow, but here we already have the registerToken (post-OIDC). The exact API surface depends on cozy-client version. The implementation below uses `cozy-stack-client` to perform the token exchange directly. If the cozy-client version exposes a higher-level helper, the implementer should prefer that. The test at the boundary (HTTP-level) covers the contract.

- [ ] **Step 1: Write `src/auth/registerSession.ts`**

```ts
import CozyClient from 'cozy-client'

import { Session } from './types'

interface RegisterParams {
  fqdn: string
  registerToken: string
}

export const registerSession = async ({ fqdn, registerToken }: RegisterParams): Promise<Session> => {
  const uri = `https://${fqdn}`
  const client = new CozyClient({ uri })

  const stackClient = client.getStackClient()
  const oauthOptions = {
    clientName: 'Twake Drive Mobile',
    softwareID: 'twake-drive-mobile',
    redirectURI: 'twakedrive://',
    clientKind: 'mobile',
    clientURI: 'https://twake.app',
    scopes: ['io.cozy.files', 'io.cozy.files.shared-with-me']
  }

  await stackClient.register(oauthOptions)
  const token = await stackClient.fetchAccessToken(registerToken)

  return {
    uri,
    accessToken: token.accessToken,
    refreshToken: token.refreshToken
  }
}
```

- [ ] **Step 2: Verify typecheck**

```bash
yarn typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/auth/registerSession.ts
git commit -m "feat(auth): registerSession exchanges registerToken for access/refresh"
```

### Task 3.3: `useAuth` hook

**Files:**
- Create: `src/auth/useAuth.ts`

- [ ] **Step 1: Write `src/auth/useAuth.ts`**

```ts
import { useCallback, useEffect, useState } from 'react'
import CozyClient from 'cozy-client'

import { createClient } from '@/client/createClient'
import { clearSession, getSession, saveSession } from './tokenStorage'
import { startOidcFlow } from './oidcFlow'
import { registerSession } from './registerSession'
import { getLoginUri } from './autodiscovery'
import { Session } from './types'

interface UseAuthState {
  status: 'loading' | 'authenticated' | 'unauthenticated'
  client: CozyClient | null
}

export const useAuth = () => {
  const [state, setState] = useState<UseAuthState>({ status: 'loading', client: null })

  useEffect(() => {
    const bootstrap = async () => {
      const session = await getSession()
      if (!session) {
        setState({ status: 'unauthenticated', client: null })
        return
      }
      setState({ status: 'authenticated', client: createClient(session) })
    }
    void bootstrap()
  }, [])

  const login = useCallback(async (email: string): Promise<void> => {
    const loginUri = await getLoginUri(email)
    if (!loginUri) throw new Error('DOMAIN_UNSUPPORTED')

    const callback = await startOidcFlow(loginUri)
    const session = await registerSession(callback)
    await saveSession(session)

    setState({ status: 'authenticated', client: createClient(session) })
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    if (state.client) {
      try {
        await state.client.logout()
      } catch {
        // ignore — server may be unreachable
      }
    }
    await clearSession()
    setState({ status: 'unauthenticated', client: null })
  }, [state.client])

  return { ...state, login, logout }
}
```

- [ ] **Step 2: Verify typecheck**

```bash
yarn typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/auth/useAuth.ts
git commit -m "feat(auth): useAuth hook orchestrating session lifecycle"
```

### Task 3.4: Tests for `useAuth`

**Files:**
- Create: `src/auth/useAuth.test.tsx`

- [ ] **Step 1: Write test**

```tsx
import React from 'react'
import { Text, Pressable } from 'react-native'
import { render, screen, waitFor, act } from '@testing-library/react-native'

import * as tokenStorage from './tokenStorage'
import * as oidcFlow from './oidcFlow'
import * as autodiscovery from './autodiscovery'
import * as registerSessionMod from './registerSession'
import { useAuth } from './useAuth'

const mockSession = { uri: 'https://alice.example.com', accessToken: 'a', refreshToken: 'r' }

const Probe = () => {
  const { status, login, logout } = useAuth()
  return (
    <>
      <Text testID="status">{status}</Text>
      <Pressable testID="login" onPress={() => login('user@example.com').catch(() => {})} />
      <Pressable testID="logout" onPress={() => logout()} />
    </>
  )
}

describe('useAuth', () => {
  beforeEach(() => jest.restoreAllMocks())

  it('starts loading then transitions to unauthenticated when no session', async () => {
    jest.spyOn(tokenStorage, 'getSession').mockResolvedValue(null)
    render(<Probe />)
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'))
  })

  it('transitions to authenticated when a session exists', async () => {
    jest.spyOn(tokenStorage, 'getSession').mockResolvedValue(mockSession)
    render(<Probe />)
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'))
  })

  it('login flow fetches loginUri, runs OIDC, registers, saves, transitions to authenticated', async () => {
    jest.spyOn(tokenStorage, 'getSession').mockResolvedValue(null)
    jest.spyOn(autodiscovery, 'getLoginUri').mockResolvedValue(new URL('https://login.example.com'))
    jest
      .spyOn(oidcFlow, 'startOidcFlow')
      .mockResolvedValue({ fqdn: 'alice.example.com', registerToken: 'tok', code: null })
    jest.spyOn(registerSessionMod, 'registerSession').mockResolvedValue(mockSession)
    const saveSpy = jest.spyOn(tokenStorage, 'saveSession').mockResolvedValue()

    render(<Probe />)
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'))

    await act(async () => {
      screen.getByTestId('login').props.onPress()
    })

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'))
    expect(saveSpy).toHaveBeenCalledWith(mockSession)
  })

  it('logout clears session and transitions to unauthenticated', async () => {
    jest.spyOn(tokenStorage, 'getSession').mockResolvedValue(mockSession)
    const clearSpy = jest.spyOn(tokenStorage, 'clearSession').mockResolvedValue()

    render(<Probe />)
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'))

    await act(async () => {
      screen.getByTestId('logout').props.onPress()
    })

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'))
    expect(clearSpy).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run → expect to PASS**

```bash
yarn test src/auth/useAuth.test.tsx
```

Expected: 4 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/auth/useAuth.test.tsx
git commit -m "test(auth): cover useAuth lifecycle and login/logout flows"
```

### Task 3.5: Revocation listener

**Files:**
- Create: `src/auth/revocationListener.ts`

- [ ] **Step 1: Write `src/auth/revocationListener.ts`**

```ts
import CozyClient from 'cozy-client'

export const attachRevocationListener = (client: CozyClient, onRevoke: () => void): (() => void) => {
  const handler = () => onRevoke()
  client.on('revoked', handler)
  return () => client.removeListener('revoked', handler)
}
```

- [ ] **Step 2: Verify typecheck**

```bash
yarn typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/auth/revocationListener.ts
git commit -m "feat(auth): revocation listener wraps cozy-client revoked event"
```

---

## Phase 4 — UI primitives (light TDD where it adds value)

### Task 4.1: `LoadingState`, `EmptyState`, `ErrorState`

**Files:**
- Create: `src/ui/LoadingState.tsx`
- Create: `src/ui/EmptyState.tsx`
- Create: `src/ui/ErrorState.tsx`

- [ ] **Step 1: Write `LoadingState.tsx`**

```tsx
import React from 'react'
import { StyleSheet, View } from 'react-native'
import { ActivityIndicator } from 'react-native-paper'

export const LoadingState = () => (
  <View style={styles.container}>
    <ActivityIndicator animating size="large" />
  </View>
)

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' }
})
```

- [ ] **Step 2: Write `EmptyState.tsx`**

```tsx
import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Text, useTheme } from 'react-native-paper'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

interface Props {
  icon?: string
  message: string
}

export const EmptyState = ({ icon = 'folder-open-outline', message }: Props) => {
  const theme = useTheme()
  return (
    <View style={styles.container}>
      <Icon name={icon} size={64} color={theme.colors.onSurfaceVariant} />
      <Text variant="bodyLarge" style={styles.message}>
        {message}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  message: { marginTop: 16, textAlign: 'center' }
})
```

- [ ] **Step 3: Write `ErrorState.tsx`**

```tsx
import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Button, Text, useTheme } from 'react-native-paper'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTranslation } from 'react-i18next'

interface Props {
  message: string
  onRetry?: () => void
  icon?: string
}

export const ErrorState = ({ message, onRetry, icon = 'alert-circle-outline' }: Props) => {
  const theme = useTheme()
  const { t } = useTranslation()
  return (
    <View style={styles.container}>
      <Icon name={icon} size={64} color={theme.colors.error} />
      <Text variant="bodyLarge" style={styles.message}>
        {message}
      </Text>
      {onRetry ? (
        <Button mode="contained" onPress={onRetry} style={styles.button}>
          {t('common.retry')}
        </Button>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  message: { marginTop: 16, textAlign: 'center' },
  button: { marginTop: 16 }
})
```

- [ ] **Step 4: Verify typecheck**

```bash
yarn typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/ui/LoadingState.tsx src/ui/EmptyState.tsx src/ui/ErrorState.tsx
git commit -m "feat(ui): LoadingState, EmptyState, ErrorState primitives"
```

### Task 4.2: `fileIcons` utility (TDD)

**Files:**
- Create: `src/utils/fileIcons.ts`
- Create: `src/utils/fileIcons.test.ts`

- [ ] **Step 1: Write tests**

`src/utils/fileIcons.test.ts`:
```ts
import { getFileIcon } from './fileIcons'

describe('getFileIcon', () => {
  it('returns folder for type=directory', () => {
    expect(getFileIcon('directory')).toBe('folder')
  })

  it('returns file-pdf-box for application/pdf', () => {
    expect(getFileIcon('file', 'application/pdf')).toBe('file-pdf-box')
  })

  it('returns file-image for image/* mimes', () => {
    expect(getFileIcon('file', 'image/png')).toBe('file-image')
    expect(getFileIcon('file', 'image/jpeg')).toBe('file-image')
  })

  it('returns file-video for video/* mimes', () => {
    expect(getFileIcon('file', 'video/mp4')).toBe('file-video')
  })

  it('returns file-music for audio/* mimes', () => {
    expect(getFileIcon('file', 'audio/mpeg')).toBe('file-music')
  })

  it('returns file-excel for spreadsheet mimes', () => {
    expect(getFileIcon('file', 'application/vnd.ms-excel')).toBe('file-excel')
    expect(
      getFileIcon('file', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    ).toBe('file-excel')
  })

  it('returns file-word for document mimes', () => {
    expect(getFileIcon('file', 'application/msword')).toBe('file-word')
  })

  it('returns file-document for text/* mimes', () => {
    expect(getFileIcon('file', 'text/plain')).toBe('file-document')
  })

  it('returns folder-zip for archive mimes', () => {
    expect(getFileIcon('file', 'application/zip')).toBe('folder-zip')
  })

  it('returns generic file for unknown mime', () => {
    expect(getFileIcon('file', 'application/octet-stream')).toBe('file')
    expect(getFileIcon('file')).toBe('file')
  })
})
```

- [ ] **Step 2: Run → FAIL**

```bash
yarn test src/utils/fileIcons.test.ts
```

- [ ] **Step 3: Implement**

`src/utils/fileIcons.ts`:
```ts
export const getFileIcon = (type: string, mime?: string): string => {
  if (type === 'directory') return 'folder'
  if (!mime) return 'file'

  if (mime === 'application/pdf') return 'file-pdf-box'
  if (mime.startsWith('image/')) return 'file-image'
  if (mime.startsWith('video/')) return 'file-video'
  if (mime.startsWith('audio/')) return 'file-music'

  if (
    mime === 'application/vnd.ms-excel' ||
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    return 'file-excel'
  }

  if (
    mime === 'application/msword' ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'file-word'
  }

  if (mime.startsWith('text/')) return 'file-document'

  if (mime === 'application/zip' || mime === 'application/x-tar' || mime === 'application/x-gzip') {
    return 'folder-zip'
  }

  return 'file'
}
```

- [ ] **Step 4: Run → PASS**

```bash
yarn test src/utils/fileIcons.test.ts
```

Expected: 10 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/fileIcons.ts src/utils/fileIcons.test.ts
git commit -m "feat(utils): getFileIcon mapping mime to MCI icon (TDD)"
```

### Task 4.3: `formatters` utility (TDD)

**Files:**
- Create: `src/utils/formatters.ts`
- Create: `src/utils/formatters.test.ts`

- [ ] **Step 1: Write tests**

`src/utils/formatters.test.ts`:
```ts
import { formatFileSize } from './formatters'

describe('formatFileSize', () => {
  it('returns "—" for null/undefined', () => {
    expect(formatFileSize(null)).toBe('—')
    expect(formatFileSize(undefined)).toBe('—')
  })

  it('formats bytes', () => {
    expect(formatFileSize(0)).toBe('0 o')
    expect(formatFileSize(512)).toBe('512 o')
  })

  it('formats kibibytes', () => {
    expect(formatFileSize(1024)).toBe('1.0 Ko')
    expect(formatFileSize(2560)).toBe('2.5 Ko')
  })

  it('formats mebibytes', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 Mo')
    expect(formatFileSize(1024 * 1024 * 3.7)).toBe('3.7 Mo')
  })

  it('formats gibibytes', () => {
    expect(formatFileSize(1024 ** 3)).toBe('1.0 Go')
  })
})
```

- [ ] **Step 2: Run → FAIL**

```bash
yarn test src/utils/formatters.test.ts
```

- [ ] **Step 3: Implement**

`src/utils/formatters.ts`:
```ts
export const formatFileSize = (bytes: number | null | undefined): string => {
  if (bytes === null || bytes === undefined) return '—'
  if (bytes < 1024) return `${bytes} o`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} Ko`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(1)} Mo`
  const gb = mb / 1024
  return `${gb.toFixed(1)} Go`
}
```

- [ ] **Step 4: Run → PASS**

```bash
yarn test src/utils/formatters.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/formatters.ts src/utils/formatters.test.ts
git commit -m "feat(utils): formatFileSize helper (TDD)"
```

### Task 4.4: `errorMessages` utility

**Files:**
- Create: `src/utils/errorMessages.ts`

- [ ] **Step 1: Write `src/utils/errorMessages.ts`**

```ts
interface AppError {
  status?: number
  message?: string
}

export const getErrorMessageKey = (error: AppError | Error | unknown): string => {
  if (!error) return 'errors.generic'

  const status = (error as AppError).status

  if (status === 403) return 'errors.forbidden'
  if (status === 404) return 'errors.notFound'
  if (status && status >= 500) return 'errors.server'

  const message = (error as Error).message ?? ''
  if (message.includes('Network') || message.toLowerCase().includes('network')) {
    return 'errors.noNetwork'
  }

  return 'errors.generic'
}
```

- [ ] **Step 2: Verify typecheck**

```bash
yarn typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/errorMessages.ts
git commit -m "feat(utils): getErrorMessageKey maps errors to i18n keys"
```

### Task 4.5: `FileRow` component + test

**Files:**
- Create: `src/ui/FileRow.tsx`
- Create: `src/ui/FileRow.test.tsx`

- [ ] **Step 1: Write `src/ui/FileRow.tsx`**

```tsx
import React from 'react'
import { StyleSheet } from 'react-native'
import { List, useTheme } from 'react-native-paper'
import { formatDistanceToNow } from 'date-fns'

import { formatFileSize } from '@/utils/formatters'
import { getFileIcon } from '@/utils/fileIcons'

export interface FileItem {
  _id: string
  name: string
  size: number | null
  mime?: string
  updated_at?: string
}

interface Props {
  file: FileItem
  onPress: (file: FileItem) => void
}

export const FileRow = ({ file, onPress }: Props) => {
  const theme = useTheme()
  const icon = getFileIcon('file', file.mime)
  const size = formatFileSize(file.size)
  const date = file.updated_at ? formatDistanceToNow(new Date(file.updated_at), { addSuffix: true }) : ''
  const description = date ? `${size} · ${date}` : size

  return (
    <List.Item
      title={file.name}
      description={description}
      left={props => <List.Icon {...props} icon={icon} color={theme.colors.onSurfaceVariant} />}
      onPress={() => onPress(file)}
      style={styles.row}
    />
  )
}

const styles = StyleSheet.create({
  row: { paddingVertical: 4 }
})
```

- [ ] **Step 2: Write test `src/ui/FileRow.test.tsx`**

```tsx
import React from 'react'
import { Provider as PaperProvider } from 'react-native-paper'
import { fireEvent, render, screen } from '@testing-library/react-native'

import { FileRow, FileItem } from './FileRow'

const file: FileItem = {
  _id: 'f1',
  name: 'rapport.pdf',
  size: 2_400_000,
  mime: 'application/pdf',
  updated_at: '2026-04-29T10:00:00.000Z'
}

const wrap = (ui: React.ReactElement) => <PaperProvider>{ui}</PaperProvider>

describe('FileRow', () => {
  it('renders the file name', () => {
    render(wrap(<FileRow file={file} onPress={() => {}} />))
    expect(screen.getByText('rapport.pdf')).toBeOnTheScreen()
  })

  it('calls onPress with the file when tapped', () => {
    const onPress = jest.fn()
    render(wrap(<FileRow file={file} onPress={onPress} />))
    fireEvent.press(screen.getByText('rapport.pdf'))
    expect(onPress).toHaveBeenCalledWith(file)
  })
})
```

- [ ] **Step 3: Run test → PASS**

```bash
yarn test src/ui/FileRow.test.tsx
```

Expected: 2 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/ui/FileRow.tsx src/ui/FileRow.test.tsx
git commit -m "feat(ui): FileRow component with size + relative date"
```

### Task 4.6: `FolderRow` component + test

**Files:**
- Create: `src/ui/FolderRow.tsx`
- Create: `src/ui/FolderRow.test.tsx`

- [ ] **Step 1: Write `src/ui/FolderRow.tsx`**

```tsx
import React from 'react'
import { StyleSheet } from 'react-native'
import { List, useTheme } from 'react-native-paper'

export interface FolderItem {
  _id: string
  name: string
}

interface Props {
  folder: FolderItem
  onPress: (folder: FolderItem) => void
}

export const FolderRow = ({ folder, onPress }: Props) => {
  const theme = useTheme()
  return (
    <List.Item
      title={folder.name}
      left={props => <List.Icon {...props} icon="folder" color={theme.colors.primary} />}
      right={props => <List.Icon {...props} icon="chevron-right" />}
      onPress={() => onPress(folder)}
      style={styles.row}
    />
  )
}

const styles = StyleSheet.create({
  row: { paddingVertical: 4 }
})
```

- [ ] **Step 2: Write test `src/ui/FolderRow.test.tsx`**

```tsx
import React from 'react'
import { Provider as PaperProvider } from 'react-native-paper'
import { fireEvent, render, screen } from '@testing-library/react-native'

import { FolderRow, FolderItem } from './FolderRow'

const folder: FolderItem = { _id: 'd1', name: 'Documents' }

const wrap = (ui: React.ReactElement) => <PaperProvider>{ui}</PaperProvider>

describe('FolderRow', () => {
  it('renders the folder name', () => {
    render(wrap(<FolderRow folder={folder} onPress={() => {}} />))
    expect(screen.getByText('Documents')).toBeOnTheScreen()
  })

  it('calls onPress with the folder', () => {
    const onPress = jest.fn()
    render(wrap(<FolderRow folder={folder} onPress={onPress} />))
    fireEvent.press(screen.getByText('Documents'))
    expect(onPress).toHaveBeenCalledWith(folder)
  })
})
```

- [ ] **Step 3: Run test → PASS**

```bash
yarn test src/ui/FolderRow.test.tsx
```

Expected: 2 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/ui/FolderRow.tsx src/ui/FolderRow.test.tsx
git commit -m "feat(ui): FolderRow component with chevron"
```

### Task 4.7: `Breadcrumb` component + test

**Files:**
- Create: `src/ui/Breadcrumb.tsx`
- Create: `src/ui/Breadcrumb.test.tsx`

- [ ] **Step 1: Write `src/ui/Breadcrumb.tsx`**

```tsx
import React, { useEffect, useRef } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Text, useTheme } from 'react-native-paper'

export interface BreadcrumbSegment {
  id: string
  name: string
}

interface Props {
  segments: BreadcrumbSegment[]
  onSegmentPress: (index: number) => void
}

export const Breadcrumb = ({ segments, onSegmentPress }: Props) => {
  const theme = useTheme()
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 0)
    return () => clearTimeout(id)
  }, [segments])

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false}>
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1
          return (
            <View key={segment.id} style={styles.segmentWrapper}>
              <Pressable
                disabled={isLast}
                onPress={() => onSegmentPress(index)}
                accessibilityRole="button"
              >
                <Text
                  variant="bodyMedium"
                  style={[
                    styles.segment,
                    isLast ? styles.current : null,
                    { color: isLast ? theme.colors.onSurface : theme.colors.primary }
                  ]}
                >
                  {segment.name}
                </Text>
              </Pressable>
              {!isLast ? (
                <Text style={[styles.separator, { color: theme.colors.onSurfaceVariant }]}>
                  /
                </Text>
              ) : null}
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { paddingVertical: 8, paddingHorizontal: 16 },
  segmentWrapper: { flexDirection: 'row', alignItems: 'center' },
  segment: { paddingHorizontal: 4 },
  current: { fontWeight: '700' },
  separator: { paddingHorizontal: 4 }
})
```

- [ ] **Step 2: Write test `src/ui/Breadcrumb.test.tsx`**

```tsx
import React from 'react'
import { Provider as PaperProvider } from 'react-native-paper'
import { fireEvent, render, screen } from '@testing-library/react-native'

import { Breadcrumb } from './Breadcrumb'

const wrap = (ui: React.ReactElement) => <PaperProvider>{ui}</PaperProvider>

describe('Breadcrumb', () => {
  const segments = [
    { id: 'root', name: 'Mes fichiers' },
    { id: 'docs', name: 'Documents' },
    { id: 'work', name: 'Travail' }
  ]

  it('renders all segment names', () => {
    render(wrap(<Breadcrumb segments={segments} onSegmentPress={() => {}} />))
    expect(screen.getByText('Mes fichiers')).toBeOnTheScreen()
    expect(screen.getByText('Documents')).toBeOnTheScreen()
    expect(screen.getByText('Travail')).toBeOnTheScreen()
  })

  it('calls onSegmentPress with the index when a non-last segment is tapped', () => {
    const handler = jest.fn()
    render(wrap(<Breadcrumb segments={segments} onSegmentPress={handler} />))
    fireEvent.press(screen.getByText('Mes fichiers'))
    expect(handler).toHaveBeenCalledWith(0)
  })

  it('does not fire onSegmentPress when the last segment is tapped', () => {
    const handler = jest.fn()
    render(wrap(<Breadcrumb segments={segments} onSegmentPress={handler} />))
    fireEvent.press(screen.getByText('Travail'))
    expect(handler).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run → PASS**

```bash
yarn test src/ui/Breadcrumb.test.tsx
```

Expected: 3 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/ui/Breadcrumb.tsx src/ui/Breadcrumb.test.tsx
git commit -m "feat(ui): Breadcrumb component (scroll-to-end, current bold)"
```

### Task 4.8: `FileMetadataSheet`

**Files:**
- Create: `src/ui/FileMetadataSheet.tsx`

- [ ] **Step 1: Write `src/ui/FileMetadataSheet.tsx`**

```tsx
import React, { forwardRef, useImperativeHandle, useRef } from 'react'
import { StyleSheet, View } from 'react-native'
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet'
import { Button, Divider, Text, useTheme } from 'react-native-paper'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'

import { formatFileSize } from '@/utils/formatters'
import { getFileIcon } from '@/utils/fileIcons'

export interface FileMetadata {
  _id: string
  name: string
  size: number | null
  mime?: string
  updated_at?: string
  path?: string
  cozyMetadata?: {
    createdBy?: { account?: string }
  }
}

export interface FileMetadataSheetHandle {
  present: (file: FileMetadata) => void
  dismiss: () => void
}

export const FileMetadataSheet = forwardRef<FileMetadataSheetHandle>((_, ref) => {
  const theme = useTheme()
  const { t } = useTranslation()
  const bottomSheetRef = useRef<BottomSheet>(null)
  const [file, setFile] = React.useState<FileMetadata | null>(null)

  useImperativeHandle(ref, () => ({
    present: (f: FileMetadata) => {
      setFile(f)
      bottomSheetRef.current?.expand()
    },
    dismiss: () => bottomSheetRef.current?.close()
  }))

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={['40%', '90%']}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: theme.colors.surface }}
    >
      <BottomSheetView style={styles.container}>
        {file ? (
          <>
            <View style={styles.header}>
              <Icon
                name={getFileIcon('file', file.mime)}
                size={56}
                color={theme.colors.primary}
              />
              <Text variant="titleMedium" style={styles.name}>
                {file.name}
              </Text>
            </View>
            <Divider />
            <Row label={t('drive.fileMeta.type')} value={file.mime ?? '—'} />
            <Row label={t('drive.fileMeta.size')} value={formatFileSize(file.size)} />
            <Row
              label={t('drive.fileMeta.modified')}
              value={file.updated_at ? format(new Date(file.updated_at), 'PPp') : '—'}
            />
            <Row label={t('drive.fileMeta.path')} value={file.path ?? '—'} />
            <Row
              label={t('drive.fileMeta.owner')}
              value={file.cozyMetadata?.createdBy?.account ?? '—'}
            />
            <View style={styles.footer}>
              <Button mode="contained" onPress={() => bottomSheetRef.current?.close()}>
                {t('common.close')}
              </Button>
            </View>
          </>
        ) : null}
      </BottomSheetView>
    </BottomSheet>
  )
})

const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text variant="labelMedium" style={styles.label}>
      {label}
    </Text>
    <Text variant="bodyMedium" style={styles.value}>
      {value}
    </Text>
  </View>
)

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingBottom: 32 },
  header: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  name: { textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  label: { flex: 1 },
  value: { flex: 2, textAlign: 'right' },
  footer: { marginTop: 24 }
})

FileMetadataSheet.displayName = 'FileMetadataSheet'
```

- [ ] **Step 2: Verify typecheck**

```bash
yarn typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/ui/FileMetadataSheet.tsx
git commit -m "feat(ui): FileMetadataSheet bottom sheet with file metadata"
```

### Task 4.9: `ErrorBoundary`

**Files:**
- Create: `src/ui/ErrorBoundary.tsx`

- [ ] **Step 1: Write `src/ui/ErrorBoundary.tsx`**

```tsx
import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { withTranslation, WithTranslation } from 'react-i18next'

interface State {
  hasError: boolean
}

class ErrorBoundaryClass extends React.Component<
  WithTranslation & { children: React.ReactNode },
  State
> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error)
  }

  reset = () => this.setState({ hasError: false })

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <View style={styles.container}>
        <Text variant="headlineSmall" style={styles.title}>
          {this.props.t('errors.generic')}
        </Text>
        <Button mode="contained" onPress={this.reset} style={styles.button}>
          {this.props.t('common.retry')}
        </Button>
      </View>
    )
  }
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryClass)

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { textAlign: 'center', marginBottom: 16 },
  button: { marginTop: 8 }
})
```

- [ ] **Step 2: Verify typecheck**

```bash
yarn typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/ui/ErrorBoundary.tsx
git commit -m "feat(ui): ErrorBoundary catches uncaught render errors"
```

### Task 4.10: `AppBar`

**Files:**
- Create: `src/ui/AppBar.tsx`

- [ ] **Step 1: Write `src/ui/AppBar.tsx`**

```tsx
import React, { useState } from 'react'
import { Appbar, Menu } from 'react-native-paper'
import { useTranslation } from 'react-i18next'

interface Props {
  title: string
  onBack?: () => void
  onLogout?: () => void
}

export const AppBar = ({ title, onBack, onLogout }: Props) => {
  const { t } = useTranslation()
  const [menuVisible, setMenuVisible] = useState(false)

  return (
    <Appbar.Header>
      {onBack ? <Appbar.BackAction onPress={onBack} /> : null}
      <Appbar.Content title={title} />
      {onLogout ? (
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={<Appbar.Action icon="dots-vertical" onPress={() => setMenuVisible(true)} />}
        >
          <Menu.Item
            onPress={() => {
              setMenuVisible(false)
              onLogout()
            }}
            title={t('common.logout')}
          />
        </Menu>
      ) : null}
    </Appbar.Header>
  )
}
```

- [ ] **Step 2: Verify typecheck**

```bash
yarn typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/ui/AppBar.tsx
git commit -m "feat(ui): AppBar with optional back + logout menu"
```

---

## Phase 5 — Routing & root layout

### Task 5.1: Root `app/_layout.tsx`

**Files:**
- Create: `app/_layout.tsx`

- [ ] **Step 1: Write `app/_layout.tsx`**

```tsx
import React from 'react'
import { useColorScheme } from 'react-native'
import { Provider as PaperProvider } from 'react-native-paper'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import { Slot } from 'expo-router'
import { CozyProvider } from 'cozy-client'
import { I18nextProvider } from 'react-i18next'

import i18n from '@/i18n'
import { useAuth } from '@/auth/useAuth'
import { darkTheme, lightTheme } from '@/ui/theme'

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme
  const { client } = useAuth()

  const content = (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PaperProvider theme={theme}>
          <I18nextProvider i18n={i18n}>
            <BottomSheetModalProvider>
              <Slot />
            </BottomSheetModalProvider>
          </I18nextProvider>
        </PaperProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  )

  return client ? <CozyProvider client={client}>{content}</CozyProvider> : content
}
```

> Note: the inline style `{ flex: 1 }` on `GestureHandlerRootView` is the only inline style allowed in the project — it is required by the library's API and there is no alternative. All app code follows the no-inline-styles rule.

- [ ] **Step 2: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat(app): root layout with all providers + auth-driven CozyProvider"
```

### Task 5.2: Splash redirect `app/index.tsx`

**Files:**
- Create: `app/index.tsx`

- [ ] **Step 1: Write `app/index.tsx`**

```tsx
import React from 'react'
import { Redirect } from 'expo-router'

import { LoadingState } from '@/ui/LoadingState'
import { useAuth } from '@/auth/useAuth'

export default function Index() {
  const { status } = useAuth()
  if (status === 'loading') return <LoadingState />
  if (status === 'authenticated') return <Redirect href="/(drive)/files" />
  return <Redirect href="/(auth)/welcome" />
}
```

- [ ] **Step 2: Commit**

```bash
git add app/index.tsx
git commit -m "feat(app): splash screen redirects based on auth status"
```

### Task 5.3: `(auth)` group layout + welcome screen

**Files:**
- Create: `app/(auth)/_layout.tsx`
- Create: `app/(auth)/welcome.tsx`

- [ ] **Step 1: Write `app/(auth)/_layout.tsx`**

```tsx
import React from 'react'
import { Stack } from 'expo-router'

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        fullScreenGestureEnabled: true
      }}
    />
  )
}
```

- [ ] **Step 2: Write `app/(auth)/welcome.tsx`**

```tsx
import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function WelcomeScreen() {
  const { t } = useTranslation()
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Text variant="headlineLarge" style={styles.title}>
            {t('auth.welcomeTitle')}
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            {t('auth.welcomeSubtitle')}
          </Text>
        </View>
        <Button mode="contained" onPress={() => router.push('/(auth)/login')}>
          {t('auth.loginCta')}
        </Button>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 24, justifyContent: 'space-between' },
  content: { flex: 1, justifyContent: 'center', gap: 16 },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center' }
})
```

- [ ] **Step 3: Commit**

```bash
git add app/\(auth\)/_layout.tsx app/\(auth\)/welcome.tsx
git commit -m "feat(auth): welcome screen + auth group layout"
```

### Task 5.4: Login screen

**Files:**
- Create: `app/(auth)/login.tsx`

- [ ] **Step 1: Write `app/(auth)/login.tsx`**

```tsx
import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Button, HelperText, TextInput } from 'react-native-paper'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useAuth } from '@/auth/useAuth'
import { UserCancelledError } from '@/auth/types'

const isValidEmail = (s: string): boolean => /\S+@\S+\.\S+/.test(s)

export default function LoginScreen() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async () => {
    setError(null)
    setLoading(true)
    try {
      await login(email)
      router.replace('/(drive)/files')
    } catch (err) {
      if (err instanceof UserCancelledError) {
        // silent — user closed the browser
      } else if ((err as Error).message === 'DOMAIN_UNSUPPORTED') {
        setError(t('auth.errorDomainUnsupported'))
      } else if ((err as Error).message?.toLowerCase().includes('network')) {
        setError(t('auth.errorNetwork'))
      } else {
        setError(t('auth.errorGeneric'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <TextInput
          label={t('auth.emailLabel')}
          placeholder={t('auth.emailPlaceholder')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          mode="outlined"
        />
        <HelperText type="error" visible={!!error}>
          {error ?? ''}
        </HelperText>
        <Button
          mode="contained"
          onPress={onSubmit}
          disabled={!isValidEmail(email) || loading}
          loading={loading}
        >
          {t('auth.continue')}
        </Button>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 8 }
})
```

- [ ] **Step 2: Commit**

```bash
git add app/\(auth\)/login.tsx
git commit -m "feat(auth): login screen — email entry → discovery → OIDC"
```

### Task 5.5: `(drive)` group with bottom tabs

**Files:**
- Create: `app/(drive)/_layout.tsx`

- [ ] **Step 1: Write `app/(drive)/_layout.tsx`**

```tsx
import React from 'react'
import { Tabs } from 'expo-router'
import { useTheme } from 'react-native-paper'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTranslation } from 'react-i18next'

export default function DriveLayout() {
  const theme = useTheme()
  const { t } = useTranslation()
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary
      }}
    >
      <Tabs.Screen
        name="files"
        options={{
          title: t('drive.myFiles'),
          tabBarIcon: ({ color, size }) => <Icon name="folder" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="shared"
        options={{
          title: t('drive.shared'),
          tabBarIcon: ({ color, size }) => (
            <Icon name="account-multiple" color={color} size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="recent"
        options={{
          title: t('drive.recent'),
          tabBarIcon: ({ color, size }) => (
            <Icon name="clock-outline" color={color} size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="trash"
        options={{
          title: t('drive.trash'),
          tabBarIcon: ({ color, size }) => (
            <Icon name="trash-can-outline" color={color} size={size} />
          )
        }}
      />
    </Tabs>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(drive\)/_layout.tsx
git commit -m "feat(drive): bottom tabs layout (files/shared/recent/trash)"
```

---

## Phase 6 — cozy-client queries

### Task 6.1: Query definitions

**Files:**
- Create: `src/client/queries.ts`

- [ ] **Step 1: Write `src/client/queries.ts`**

```ts
import { Q, QueryDefinition } from 'cozy-client'

export const ROOT_DIR_ID = 'io.cozy.files.root-dir'
export const TRASH_DIR_ID = 'io.cozy.files.trash-dir'

export interface FileQueryResult {
  _id: string
  _type: string
  name: string
  type: 'file' | 'directory'
  dir_id?: string
  size?: number | null
  mime?: string
  updated_at?: string
  path?: string
  cozyMetadata?: {
    createdBy?: { account?: string }
  }
}

export const folderContentsQuery = (dirId: string): QueryDefinition =>
  Q('io.cozy.files')
    .where({ dir_id: dirId })
    .sortBy([{ type: 'asc' }, { name: 'asc' }])

export const folderContentsQueryAs = (dirId: string): string => `io.cozy.files/dir/${dirId}`

export const sharedWithMeQuery = (): QueryDefinition => Q('io.cozy.files.shared-with-me')
export const sharedWithMeQueryAs = 'io.cozy.files.shared-with-me'

export const recentQuery = (): QueryDefinition =>
  Q('io.cozy.files')
    .where({ type: 'file', trashed: false })
    .sortBy([{ updated_at: 'desc' }])
    .limitBy(50)
export const recentQueryAs = 'io.cozy.files/recent'

export const trashQuery = (): QueryDefinition =>
  Q('io.cozy.files').where({ dir_id: TRASH_DIR_ID })
export const trashQueryAs = 'io.cozy.files/trash'

export const fileByIdQuery = (id: string): QueryDefinition =>
  Q('io.cozy.files').getById(id)
export const fileByIdQueryAs = (id: string): string => `io.cozy.files/${id}`
```

- [ ] **Step 2: Verify typecheck**

```bash
yarn typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/client/queries.ts
git commit -m "feat(client): query builders for folder/shared/recent/trash/by-id"
```

---

## Phase 7 — Drive screens

### Task 7.1: `files/_layout.tsx` (stack inside Mes fichiers tab)

**Files:**
- Create: `app/(drive)/files/_layout.tsx`

- [ ] **Step 1: Write `app/(drive)/files/_layout.tsx`**

```tsx
import React from 'react'
import { Stack } from 'expo-router'

export default function FilesStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        fullScreenGestureEnabled: true
      }}
    />
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(drive\)/files/_layout.tsx
git commit -m "feat(drive): files stack layout with swipe-back enabled"
```

### Task 7.2: `files/[...path].tsx` — listing & navigation

**Files:**
- Create: `app/(drive)/files/[...path].tsx`

- [ ] **Step 1: Write `app/(drive)/files/[...path].tsx`**

```tsx
import React, { useMemo, useRef } from 'react'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from 'cozy-client'
import { useTranslation } from 'react-i18next'

import { AppBar } from '@/ui/AppBar'
import { Breadcrumb, BreadcrumbSegment } from '@/ui/Breadcrumb'
import { EmptyState } from '@/ui/EmptyState'
import { ErrorState } from '@/ui/ErrorState'
import { LoadingState } from '@/ui/LoadingState'
import { FileRow } from '@/ui/FileRow'
import { FolderRow } from '@/ui/FolderRow'
import { FileMetadataSheet, FileMetadataSheetHandle } from '@/ui/FileMetadataSheet'
import { useAuth } from '@/auth/useAuth'
import { getErrorMessageKey } from '@/utils/errorMessages'
import {
  folderContentsQuery,
  folderContentsQueryAs,
  ROOT_DIR_ID,
  FileQueryResult
} from '@/client/queries'

export default function FilesScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const { logout } = useAuth()
  const { path } = useLocalSearchParams<{ path?: string[] }>()
  const sheetRef = useRef<FileMetadataSheetHandle>(null)

  const segments = useMemo<BreadcrumbSegment[]>(() => {
    const list: BreadcrumbSegment[] = [{ id: ROOT_DIR_ID, name: t('drive.myFiles') }]
    if (path) {
      for (const id of path) list.push({ id, name: id })
    }
    return list
  }, [path, t])

  const currentDirId = path?.[path.length - 1] ?? ROOT_DIR_ID
  const isRoot = !path || path.length === 0

  const query = useQuery(folderContentsQuery(currentDirId), {
    as: folderContentsQueryAs(currentDirId)
  })

  const onSegmentPress = (index: number) => {
    if (index === 0) router.dismissAll()
    else router.dismissTo(`/(drive)/files/${path?.slice(0, index).join('/')}`)
  }

  const renderItem = ({ item }: { item: FileQueryResult }) => {
    if (item.type === 'directory') {
      return (
        <FolderRow
          folder={item}
          onPress={folder =>
            router.push(`/(drive)/files/${[...(path ?? []), folder._id].join('/')}`)
          }
        />
      )
    }
    return (
      <FileRow
        file={item}
        onPress={file =>
          sheetRef.current?.present({
            ...file,
            cozyMetadata: item.cozyMetadata,
            path: item.path
          })
        }
      />
    )
  }

  return (
    <View style={styles.container}>
      <AppBar
        title={isRoot ? t('drive.myFiles') : segments[segments.length - 1].name}
        onBack={isRoot ? undefined : () => router.back()}
        onLogout={isRoot ? logout : undefined}
      />
      {!isRoot ? <Breadcrumb segments={segments} onSegmentPress={onSegmentPress} /> : null}
      {query.fetchStatus === 'loading' && !query.data ? (
        <LoadingState />
      ) : query.fetchStatus === 'failed' ? (
        <ErrorState message={t(getErrorMessageKey(query.lastError))} onRetry={() => query.fetch()} />
      ) : !query.data || query.data.length === 0 ? (
        <EmptyState message={t('drive.emptyFolder')} />
      ) : (
        <FlatList
          data={query.data as FileQueryResult[]}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={query.fetchStatus === 'loading'}
              onRefresh={() => query.fetch()}
            />
          }
          onEndReachedThreshold={0.5}
          onEndReached={() => query.fetchMore?.()}
        />
      )}
      <FileMetadataSheet ref={sheetRef} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 }
})
```

- [ ] **Step 2: Verify typecheck**

```bash
yarn typecheck
```

- [ ] **Step 3: Commit**

```bash
git add app/\(drive\)/files/\[...path\].tsx
git commit -m "feat(drive): files listing screen with navigation, breadcrumb, sheet"
```

### Task 7.3: `shared/_layout.tsx` and `shared/[...path].tsx`

**Files:**
- Create: `app/(drive)/shared/_layout.tsx`
- Create: `app/(drive)/shared/[...path].tsx`

- [ ] **Step 1: Write `app/(drive)/shared/_layout.tsx`**

```tsx
import React from 'react'
import { Stack } from 'expo-router'

export default function SharedStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        fullScreenGestureEnabled: true
      }}
    />
  )
}
```

- [ ] **Step 2: Write `app/(drive)/shared/[...path].tsx`**

```tsx
import React, { useMemo, useRef } from 'react'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from 'cozy-client'
import { useTranslation } from 'react-i18next'

import { AppBar } from '@/ui/AppBar'
import { Breadcrumb, BreadcrumbSegment } from '@/ui/Breadcrumb'
import { EmptyState } from '@/ui/EmptyState'
import { ErrorState } from '@/ui/ErrorState'
import { LoadingState } from '@/ui/LoadingState'
import { FileRow } from '@/ui/FileRow'
import { FolderRow } from '@/ui/FolderRow'
import { FileMetadataSheet, FileMetadataSheetHandle } from '@/ui/FileMetadataSheet'
import { useAuth } from '@/auth/useAuth'
import { getErrorMessageKey } from '@/utils/errorMessages'
import {
  folderContentsQuery,
  folderContentsQueryAs,
  sharedWithMeQuery,
  sharedWithMeQueryAs,
  FileQueryResult
} from '@/client/queries'

export default function SharedScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const { logout } = useAuth()
  const { path } = useLocalSearchParams<{ path?: string[] }>()
  const sheetRef = useRef<FileMetadataSheetHandle>(null)

  const isRoot = !path || path.length === 0

  const segments = useMemo<BreadcrumbSegment[]>(() => {
    const list: BreadcrumbSegment[] = [{ id: 'root', name: t('drive.shared') }]
    if (path) for (const id of path) list.push({ id, name: id })
    return list
  }, [path, t])

  const query = useQuery(
    isRoot
      ? sharedWithMeQuery()
      : folderContentsQuery(path[path.length - 1]),
    { as: isRoot ? sharedWithMeQueryAs : folderContentsQueryAs(path[path.length - 1]) }
  )

  const onSegmentPress = (index: number) => {
    if (index === 0) router.dismissAll()
    else router.dismissTo(`/(drive)/shared/${path?.slice(0, index).join('/')}`)
  }

  const renderItem = ({ item }: { item: FileQueryResult }) => {
    if (item.type === 'directory') {
      return (
        <FolderRow
          folder={item}
          onPress={folder =>
            router.push(`/(drive)/shared/${[...(path ?? []), folder._id].join('/')}`)
          }
        />
      )
    }
    return (
      <FileRow
        file={item}
        onPress={file =>
          sheetRef.current?.present({
            ...file,
            cozyMetadata: item.cozyMetadata,
            path: item.path
          })
        }
      />
    )
  }

  return (
    <View style={styles.container}>
      <AppBar
        title={isRoot ? t('drive.shared') : segments[segments.length - 1].name}
        onBack={isRoot ? undefined : () => router.back()}
        onLogout={isRoot ? logout : undefined}
      />
      {!isRoot ? <Breadcrumb segments={segments} onSegmentPress={onSegmentPress} /> : null}
      {query.fetchStatus === 'loading' && !query.data ? (
        <LoadingState />
      ) : query.fetchStatus === 'failed' ? (
        <ErrorState message={t(getErrorMessageKey(query.lastError))} onRetry={() => query.fetch()} />
      ) : !query.data || query.data.length === 0 ? (
        <EmptyState message={t('drive.emptyShared')} />
      ) : (
        <FlatList
          data={query.data as FileQueryResult[]}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={query.fetchStatus === 'loading'}
              onRefresh={() => query.fetch()}
            />
          }
          onEndReachedThreshold={0.5}
          onEndReached={() => query.fetchMore?.()}
        />
      )}
      <FileMetadataSheet ref={sheetRef} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 }
})
```

- [ ] **Step 3: Commit**

```bash
git add app/\(drive\)/shared
git commit -m "feat(drive): shared-with-me screen with folder navigation"
```

### Task 7.4: `recent.tsx`

**Files:**
- Create: `app/(drive)/recent.tsx`

- [ ] **Step 1: Write `app/(drive)/recent.tsx`**

```tsx
import React, { useRef } from 'react'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { useQuery } from 'cozy-client'
import { useTranslation } from 'react-i18next'

import { AppBar } from '@/ui/AppBar'
import { EmptyState } from '@/ui/EmptyState'
import { ErrorState } from '@/ui/ErrorState'
import { LoadingState } from '@/ui/LoadingState'
import { FileRow } from '@/ui/FileRow'
import { FileMetadataSheet, FileMetadataSheetHandle } from '@/ui/FileMetadataSheet'
import { useAuth } from '@/auth/useAuth'
import { getErrorMessageKey } from '@/utils/errorMessages'
import { recentQuery, recentQueryAs, FileQueryResult } from '@/client/queries'

export default function RecentScreen() {
  const { t } = useTranslation()
  const { logout } = useAuth()
  const sheetRef = useRef<FileMetadataSheetHandle>(null)
  const query = useQuery(recentQuery(), { as: recentQueryAs })

  const renderItem = ({ item }: { item: FileQueryResult }) => (
    <FileRow
      file={item}
      onPress={file =>
        sheetRef.current?.present({ ...file, cozyMetadata: item.cozyMetadata, path: item.path })
      }
    />
  )

  return (
    <View style={styles.container}>
      <AppBar title={t('drive.recent')} onLogout={logout} />
      {query.fetchStatus === 'loading' && !query.data ? (
        <LoadingState />
      ) : query.fetchStatus === 'failed' ? (
        <ErrorState message={t(getErrorMessageKey(query.lastError))} onRetry={() => query.fetch()} />
      ) : !query.data || query.data.length === 0 ? (
        <EmptyState message={t('drive.emptyRecent')} />
      ) : (
        <FlatList
          data={query.data as FileQueryResult[]}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={query.fetchStatus === 'loading'}
              onRefresh={() => query.fetch()}
            />
          }
        />
      )}
      <FileMetadataSheet ref={sheetRef} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 }
})
```

- [ ] **Step 2: Commit**

```bash
git add app/\(drive\)/recent.tsx
git commit -m "feat(drive): recent screen — flat list of recently modified files"
```

### Task 7.5: `trash.tsx`

**Files:**
- Create: `app/(drive)/trash.tsx`

- [ ] **Step 1: Write `app/(drive)/trash.tsx`**

```tsx
import React, { useRef } from 'react'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { useQuery } from 'cozy-client'
import { useTranslation } from 'react-i18next'

import { AppBar } from '@/ui/AppBar'
import { EmptyState } from '@/ui/EmptyState'
import { ErrorState } from '@/ui/ErrorState'
import { LoadingState } from '@/ui/LoadingState'
import { FileRow } from '@/ui/FileRow'
import { FileMetadataSheet, FileMetadataSheetHandle } from '@/ui/FileMetadataSheet'
import { useAuth } from '@/auth/useAuth'
import { getErrorMessageKey } from '@/utils/errorMessages'
import { trashQuery, trashQueryAs, FileQueryResult } from '@/client/queries'

export default function TrashScreen() {
  const { t } = useTranslation()
  const { logout } = useAuth()
  const sheetRef = useRef<FileMetadataSheetHandle>(null)
  const query = useQuery(trashQuery(), { as: trashQueryAs })

  const renderItem = ({ item }: { item: FileQueryResult }) => (
    <FileRow
      file={item}
      onPress={file =>
        sheetRef.current?.present({ ...file, cozyMetadata: item.cozyMetadata, path: item.path })
      }
    />
  )

  return (
    <View style={styles.container}>
      <AppBar title={t('drive.trash')} onLogout={logout} />
      {query.fetchStatus === 'loading' && !query.data ? (
        <LoadingState />
      ) : query.fetchStatus === 'failed' ? (
        <ErrorState message={t(getErrorMessageKey(query.lastError))} onRetry={() => query.fetch()} />
      ) : !query.data || query.data.length === 0 ? (
        <EmptyState message={t('drive.emptyTrash')} />
      ) : (
        <FlatList
          data={query.data as FileQueryResult[]}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={query.fetchStatus === 'loading'}
              onRefresh={() => query.fetch()}
            />
          }
        />
      )}
      <FileMetadataSheet ref={sheetRef} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 }
})
```

- [ ] **Step 2: Commit**

```bash
git add app/\(drive\)/trash.tsx
git commit -m "feat(drive): trash screen — flat list of trashed files"
```

---

## Phase 8 — Polish & verification

### Task 8.1: Wire revocation listener + ErrorBoundary at root

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Update `app/_layout.tsx`**

Replace the file with:
```tsx
import React, { useEffect } from 'react'
import { useColorScheme } from 'react-native'
import { Provider as PaperProvider } from 'react-native-paper'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import { Slot } from 'expo-router'
import { CozyProvider } from 'cozy-client'
import { I18nextProvider } from 'react-i18next'

import i18n from '@/i18n'
import { useAuth } from '@/auth/useAuth'
import { darkTheme, lightTheme } from '@/ui/theme'
import { attachRevocationListener } from '@/auth/revocationListener'
import { ErrorBoundary } from '@/ui/ErrorBoundary'

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme
  const { client, logout } = useAuth()

  useEffect(() => {
    if (!client) return
    return attachRevocationListener(client, () => {
      void logout()
    })
  }, [client, logout])

  const content = (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PaperProvider theme={theme}>
          <I18nextProvider i18n={i18n}>
            <BottomSheetModalProvider>
              <ErrorBoundary>
                <Slot />
              </ErrorBoundary>
            </BottomSheetModalProvider>
          </I18nextProvider>
        </PaperProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  )

  return client ? <CozyProvider client={client}>{content}</CozyProvider> : content
}
```

- [ ] **Step 2: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat(app): wire revocation listener + ErrorBoundary at root"
```

### Task 8.2: Verify all tests + typecheck + lint

- [ ] **Step 1: Run full test suite**

```bash
yarn test
```

Expected: all tests pass.

- [ ] **Step 2: Typecheck**

```bash
yarn typecheck
```

Expected: PASS.

- [ ] **Step 3: Lint**

```bash
yarn lint
```

Expected: PASS (zero errors).

- [ ] **Step 4: Commit any lint fixes if needed**

```bash
git add -A
git diff --cached --quiet || git commit -m "chore: lint fixes"
```

### Task 8.3: Prebuild iOS + Android

- [ ] **Step 1: Run prebuild**

```bash
npx expo prebuild --clean
```

Expected: `ios/` and `android/` folders created.

- [ ] **Step 2: Update `.gitignore`**

Append:
```
/ios/Pods
/ios/build
/android/build
/android/.gradle
/android/app/build
/android/local.properties
```

- [ ] **Step 3: Commit native folders**

```bash
git add ios android .gitignore
git commit -m "chore: expo prebuild — generate ios/android projects"
```

### Task 8.4: iOS build smoke test (manual on a Mac with Xcode)

- [ ] **Step 1: Install pods**

```bash
cd ios && pod install && cd ..
```

- [ ] **Step 2: Run on iOS simulator**

```bash
yarn ios
```

Expected: app boots, welcome screen appears.

- [ ] **Step 3: Manual smoke test**

Manually verify:
- Welcome → Login screen.
- Email validation: button stays disabled for invalid emails.
- Submit valid email with `.well-known/twake-configuration` reachable on test domain → InAppBrowser opens.
- (Skip actual OIDC if no test instance available — visually confirm flow up to InAppBrowser.)
- Force-quit and relaunch: still on welcome (no session).

Document any deviations as follow-up tasks.

### Task 8.5: Android build smoke test

- [ ] **Step 1: Run on Android emulator**

```bash
yarn android
```

Expected: app builds, boots, welcome screen appears.

- [ ] **Step 2: Same manual smoke test as iOS.**

### Task 8.6: Final commit + readme

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write a minimal `README.md`**

```markdown
# Twake Drive Mobile

React Native (Expo) mobile app for Twake Drive — read-only v1.

## Getting started

```bash
yarn install
yarn ios     # iOS simulator (requires Xcode)
yarn android # Android emulator
```

## Tests

```bash
yarn test
yarn typecheck
yarn lint
```

## Spec & plan

- Spec: `docs/superpowers/specs/2026-05-01-twake-drive-mobile-design.md`
- Plan: `docs/superpowers/plans/2026-05-01-twake-drive-mobile.md`
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add minimal README"
```

---

## Done criteria (recap from spec)

- [ ] User enters email → InAppBrowser opens → returns with session.
- [ ] Session persists across app restarts.
- [ ] Mes fichiers tab lists root files; navigation into subfolders works.
- [ ] Partagés / Récents / Corbeille tabs each load and display content.
- [ ] Tap on file → metadata bottom sheet.
- [ ] Tap on folder → navigation in.
- [ ] Swipe-back works on iOS and Android.
- [ ] Breadcrumb visible below AppBar (except at root).
- [ ] Pull-to-refresh works on all lists.
- [ ] Dark mode follows OS.
- [ ] FR + EN switchable via OS language.
- [ ] Logout clears session and returns to welcome.
- [ ] All Jest tests green.
- [ ] iOS + Android prebuild + boot OK.
