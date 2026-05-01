# Twake Drive Mobile — Design (v1)

**Date:** 2026-05-01
**Status:** Draft, en attente de revue utilisateur

## 1. Contexte & objectif

Construire une application mobile React Native (full-native) pour Twake Drive. La v1 est strictement read-only : l'utilisateur peut se connecter avec son adresse email (auto-discovery du domaine), parcourir ses fichiers, ses partages, ses récents et sa corbeille. Pas de download, pas de preview de contenu, pas de création de partage. Ces features arriveront dans des versions ultérieures.

Inspirations :
- Authentification : `linagora/cozy-flagship-app` (mécanisme `.well-known/twake-configuration`).
- UX listing : version mobile responsive de `twake-drive` web.
- Conventions de code : `cozy/cozy-guidelines` et `linagora/twake-guidelines`.

## 2. Périmètre v1

**Inclus :**
- Onboarding : welcome → saisie email → discovery → OIDC → session persistée.
- 4 sections via bottom tabs : Mes fichiers, Partagés avec moi, Récents, Corbeille.
- Navigation dans les dossiers de "Mes fichiers" et "Partagés".
- Tap sur fichier → bottom sheet métadonnées (read-only).
- Tap sur dossier → navigation dedans.
- Swipe-back (iOS et Android) sur la stack de navigation.
- Fil d'Ariane scrollable sous l'AppBar (style web mobile).
- Pull-to-refresh sur toutes les listes.
- Mode sombre auto (suit l'OS).
- i18n FR + EN.
- Logout.

**Exclus de la v1 :**
- Download de fichier.
- Preview natif (image, PDF, vidéo).
- Upload depuis l'appareil.
- Création/gestion de partage.
- Recherche.
- Offline (au-delà du cache mémoire de cozy-client).
- Notifications push.
- Realtime / sync continue.
- Biométrie (Face ID / Touch ID) à l'ouverture de l'app.
- Switch manuel light/dark.
- Sentry / crash reporting.

## 3. Stack technique

| Couche | Choix |
|---|---|
| Framework | React Native via Expo (managed) avec **Expo Prebuild** pour préserver la possibilité d'ajouter des modules natifs |
| Plateformes | iOS + Android |
| Routing | **Expo Router** (file-based) |
| UI lib | **React Native Paper** (Material Design 3) |
| Bottom sheet | **`@gorhom/bottom-sheet`** |
| Icônes | **`react-native-vector-icons`** (Material Community Icons, fourni par Paper) |
| API client | **`cozy-client`** (queries, hooks, cache, refresh token) |
| State global | cozy-client uniquement (pas de Redux ni Zustand au MVP) |
| i18n | **`react-i18next`** + **`expo-localization`** |
| Dates | **`date-fns`** + locales FR/EN |
| Token storage | **`expo-secure-store`** |
| Auth web | **`expo-web-browser`** (`openAuthSessionAsync`) |
| Logging | **`cozy-minilog`** |
| Tests | **Jest** + **`@testing-library/react-native`** + **`nock`** |
| TS | TypeScript strict |

## 4. Architecture & arborescence

```
twake-drive-mobile/
├── app.json                    # Config Expo (custom scheme `twakedrive`, plugins, splash)
├── app/                        # Expo Router (file-based routing)
│   ├── _layout.tsx             # Root layout: providers (Cozy, Paper, i18n, SafeArea, ErrorBoundary)
│   ├── index.tsx               # Splash / redirect selon état auth
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── welcome.tsx         # Écran d'accueil
│   │   └── login.tsx           # Saisie email → discovery → OIDC
│   └── (drive)/                # Écrans authentifiés
│       ├── _layout.tsx         # Bottom tabs
│       ├── files/
│       │   ├── _layout.tsx     # Stack pour navigation dossiers
│       │   └── [...path].tsx   # Listing + nav dans dossiers
│       ├── shared/
│       │   ├── _layout.tsx
│       │   └── [...path].tsx
│       ├── recent.tsx
│       └── trash.tsx
├── src/
│   ├── auth/                   # Discovery, OIDC, register, token mgmt
│   │   ├── autodiscovery.ts    # extractDomain + fetchTwakeConfig (calque flagship)
│   │   ├── oidcFlow.ts         # InAppBrowser + parsing deep link callback
│   │   ├── tokenStorage.ts     # expo-secure-store wrappers
│   │   ├── useAuth.ts          # hook orchestrant la session (load, login, logout)
│   │   └── revocationListener.ts
│   ├── client/                 # cozy-client setup
│   │   ├── createClient.ts
│   │   └── queries.ts          # Query definitions (folder content, shared, recent, trash)
│   ├── ui/                     # Composants réutilisables
│   │   ├── FileRow.tsx
│   │   ├── FolderRow.tsx
│   │   ├── FileMetadataSheet.tsx
│   │   ├── Breadcrumb.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ErrorState.tsx
│   │   ├── LoadingState.tsx
│   │   ├── AppBar.tsx
│   │   └── theme.ts            # MD3 light/dark theme + couleurs Twake
│   ├── i18n/
│   │   ├── index.ts
│   │   └── locales/
│   │       ├── fr.json
│   │       └── en.json
│   └── utils/
│       ├── fileIcons.ts        # Mapping mime → icône MCI
│       ├── formatters.ts       # Tailles, dates relatives
│       └── errorMessages.ts    # error → message i18n key
├── assets/
│   ├── icon.png
│   ├── splash.png
│   └── ...
└── package.json
```

**Couches & responsabilités :**

- **Auth layer** (`src/auth/`) — pure logique, isolée de l'UI, testable.
- **Data layer** = cozy-client. Pas de couche d'abstraction supplémentaire (YAGNI). Les écrans consomment `useQuery` directement.
- **UI primitives** (`src/ui/`) — composants visuels réutilisables, sans logique métier.
- **Routing** = Expo Router. Le `<CozyProvider>` est au **root layout**, partagé entre tous les groupes (auth + drive) et tous les onglets.

## 5. Flow d'authentification

Calque le flow `linagora/cozy-flagship-app` (`src/screens/login/components/functions/autodiscovery.ts`).

```
WelcomeScreen → LoginScreen → OIDC (InAppBrowser) → register → DriveScreen
```

### 5.1 Discovery

```ts
// src/auth/autodiscovery.ts
const extractDomain = (email: string): string | null => { /* split sur '@' */ }

const fetchTwakeConfiguration = async (domain: string): Promise<TwakeConfig | null> => {
  const url = `https://${domain}/.well-known/twake-configuration`
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) return null
  return response.json()
}

const getLoginUri = async (email: string): Promise<URL | null> => {
  const domain = extractDomain(email)
  if (!domain) return null
  const config = await fetchTwakeConfiguration(domain)
  if (!config?.['twake-flagship-login-uri']) return null
  const uri = new URL(config['twake-flagship-login-uri'])
  uri.searchParams.append('redirect_after_oidc', 'twakedrive://')
  return uri
}
```

### 5.2 OIDC

```ts
// src/auth/oidcFlow.ts
import * as WebBrowser from 'expo-web-browser'

const startOidcFlow = async (loginUri: URL): Promise<OidcCallback> => {
  const result = await WebBrowser.openAuthSessionAsync(
    loginUri.toString(),
    'twakedrive://'
  )
  if (result.type !== 'success') throw new UserCancelledError()
  return parseCallbackUrl(result.url) // { fqdn, registerToken, code? }
}
```

### 5.3 Register cozy-client

Avec `fqdn` + `registerToken`, on construit un `CozyClient` initial, on appelle son flow de register pour échanger le token contre access/refresh, on persiste la session.

```ts
const session = await registerSession({ fqdn, registerToken })
await saveSession(session) // expo-secure-store, clé 'twake-drive-session'
```

### 5.4 Bootstrap au cold start

`app/index.tsx` lit la session, recrée le client, redirige selon présence/validité.

### 5.5 Logout

Effacer la session de secure-store, appeler `client.logout()`, retourner `/welcome`.

### 5.6 Custom scheme

Déclaré dans `app.json` :
```json
{
  "expo": {
    "scheme": "twakedrive"
  }
}
```

### 5.7 Cas d'erreur

| Cas | Traitement |
|---|---|
| Pas de réseau | Toast + retry sur écran login |
| `.well-known` absent ou champ manquant | "Domaine non supporté" sous le champ email |
| `openAuthSessionAsync` retourne `cancel` | Retour silencieux à l'écran email |
| `register()` échoue | On efface le secure-store partiel + retour email |
| Token expiré au boot | cozy-client tente le refresh ; si échec → logout silencieux + welcome |
| `RevocationListener` (cozy-client) émet | Logout silencieux + welcome |

## 6. Couche données

### 6.1 Création du client

```ts
// src/client/createClient.ts
import CozyClient from 'cozy-client'

const createClient = (session: Session): CozyClient =>
  new CozyClient({
    uri: session.uri,
    token: session.accessToken,
    schema: { files: { doctype: 'io.cozy.files' } },
    appMetadata: { slug: 'twake-drive-mobile', version: '0.1.0' }
  })
```

Provider unique au root layout. Reconstruit quand la session change.

### 6.2 Queries par section

Naming des `as` selon `cozy-guidelines` : `as: DOCTYPE` par défaut, paramétré `${DOCTYPE}/${param}/...`.

| Section | Query |
|---|---|
| **Mes fichiers** (un dossier) | `Q('io.cozy.files').where({ dir_id: <id> }).sortBy([{ type: 'asc' }, { name: 'asc' }])`<br>`as: 'io.cozy.files/dir/${dirId}'` |
| **Partagés avec moi** | `Q('io.cozy.files.shared-with-me')`<br>`as: 'io.cozy.files.shared-with-me'` |
| **Récents** | `Q('io.cozy.files').where({ type: 'file', trashed: false }).sortBy([{ updated_at: 'desc' }]).limitBy(50)`<br>`as: 'io.cozy.files/recent'` |
| **Corbeille** | `Q('io.cozy.files').where({ dir_id: 'io.cozy.files.trash-dir' })`<br>`as: 'io.cozy.files/trash'` |
| **Lookup d'un dossier (breadcrumb)** | `Q('io.cozy.files').getById(id)`<br>`as: 'io.cozy.files/${id}'` |

Root dir = `'io.cozy.files.root-dir'`, trash dir = `'io.cozy.files.trash-dir'`.

### 6.3 Pagination

`useQuery` retourne `fetchMore`. Branché sur `onEndReached` du `FlatList`, seuil 0.5.

### 6.4 Refresh

Pull-to-refresh via `RefreshControl` → re-fetch de la query courante.

### 6.5 Cache & offline

Cache mémoire de cozy-client uniquement. Pas de PouchDB / persistence custom au MVP. Cold start sans réseau → `ErrorState` avec retry.

## 7. Navigation & écrans

### 7.1 Structure

- Groupe `(auth)` : welcome, login.
- Groupe `(drive)` : bottom tabs avec 4 onglets, chacun avec sa propre stack interne.
- Le `<CozyProvider>` est au-dessus des deux groupes (root layout).
- Swipe-back activé : `<Stack screenOptions={{ gestureEnabled: true, fullScreenGestureEnabled: true }}>`.

### 7.2 Écrans

**Action "logout" — accessible depuis un menu (icône 3-points dans l'AppBar) uniquement sur les écrans racines des onglets (Mes fichiers root, Partagés root, Récents, Corbeille). Pas de page Paramètres dédiée au MVP.**

#### `app/(auth)/welcome.tsx`
- Logo Twake Drive.
- Slogan i18n.
- Bouton `Button mode="contained"` "Se connecter" → `/login`.

#### `app/(auth)/login.tsx`
- `TextField` email avec validation regex (`type="email-address"`, `autoCapitalize="none"`).
- Bouton "Continuer" disabled tant qu'email invalide.
- Au tap : `getLoginUri(email)` → `startOidcFlow()` → `registerSession()` → save → push `/files`.
- Spinner pendant les phases async (un seul état `loading`).
- Toast d'erreur sous le champ.

#### `app/(drive)/files/[...path].tsx`
- AppBar avec :
  - Bouton retour (sauf root) — natif via Expo Router.
  - Titre = nom du dossier courant (root = i18n `drive.myFiles`).
- `Breadcrumb` sous l'AppBar (caché à la racine).
- `FlatList` :
  - `data` = résultat de la query (dossiers avant fichiers).
  - `renderItem` = factory : `FolderRow` si `type === 'directory'`, sinon `FileRow`.
  - `RefreshControl` pour pull-to-refresh.
  - `onEndReached` → `fetchMore`.
  - États : `LoadingState` (initial), `EmptyState` (zéro résultat), `ErrorState` (query en erreur).
- Tap `FolderRow` → `router.push` avec le path étendu.
- Tap `FileRow` → ouverture `FileMetadataSheet` avec le doc en prop.

#### `app/(drive)/shared/[...path].tsx`
Même UI, query "shared-with-me" à la racine, puis navigation dans les dossiers via la même logique.

#### `app/(drive)/recent.tsx`
- Liste plate, pas de navigation dans les dossiers.
- Pas de breadcrumb.
- Tap fichier → `FileMetadataSheet`.

#### `app/(drive)/trash.tsx`
- Liste plate, pas de navigation.
- Pas de breadcrumb.
- Tap fichier → `FileMetadataSheet` (en mode read-only, pas d'actions).

### 7.3 Breadcrumb

- Composant `Breadcrumb` placé sous l'AppBar.
- Données : array `[{ id, name }]` correspondant à chaque segment du chemin.
- Reconstruit à partir du path Expo Router : on lookup chaque ID via `Q('io.cozy.files').getById(id)` (mis en cache).
- Affichage : `ScrollView horizontal` (sans tronquage côté texte), segments séparés par `/`.
- Au render initial, le scroll est positionné sur le segment courant (à droite) — c'est lui qui est visible par défaut, les segments parents sont accessibles en scrollant à gauche.
- Segment courant en gras, non-tappable. Autres segments tappables → `router.dismissTo` jusqu'au bon écran.

### 7.4 Bottom sheet métadonnées

`@gorhom/bottom-sheet` snap points `[40%, 90%]`. Contenu :
- Icône large selon mime.
- Nom complet (wrap multi-ligne si besoin).
- Type (mime humanisé) · taille (formatée) · `formatRelative` modif (date-fns).
- Chemin complet (`path`).
- Propriétaire (depuis `cozyMetadata.createdBy.account` ou nom).
- Bouton "Fermer" (Paper).

## 8. UI, theming, i18n

### 8.1 Theming

- `MD3LightTheme` + `MD3DarkTheme` étendus avec palette Twake. Couleurs récupérées du CSS de twake-drive web (à caler à l'implémentation).
- `useColorScheme()` au root layout détermine le thème actif.
- Tous les styles consomment `useTheme()`. **Aucune couleur en dur** dans les composants.
- **Aucun style inline** — tous les styles via `StyleSheet.create()` ou via les props Paper.

### 8.2 Composants UI partagés

| Composant | Rôle | Base |
|---|---|---|
| `FileRow` | Ligne fichier | `List.Item` Paper |
| `FolderRow` | Ligne dossier | `List.Item` Paper avec chevron right |
| `FileMetadataSheet` | Bottom sheet | `@gorhom/bottom-sheet` |
| `Breadcrumb` | Fil d'Ariane | `ScrollView` horizontal + `Pressable` |
| `EmptyState` | Liste vide | `View` + icône + texte |
| `ErrorState` | Erreur + retry | `View` + icône + `Button` |
| `LoadingState` | Spinner centré | `ActivityIndicator` |
| `AppBar` | Header d'écran | `Appbar.Header` Paper |

### 8.3 Icônes (mime → icon)

`src/utils/fileIcons.ts` :
- `application/pdf` → `file-pdf-box`
- `image/*` → `file-image`
- `video/*` → `file-video`
- `audio/*` → `file-music`
- `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` → `file-excel`
- `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` → `file-word`
- `text/*` → `file-document`
- `application/zip`, `application/x-tar`, `application/x-gzip` → `folder-zip`
- dossier (`type === 'directory'`) → `folder`
- fallback → `file`

### 8.4 i18n

- `react-i18next` configuré dans `src/i18n/index.ts`. Langue auto via `expo-localization`. Fallback : `en`.
- Namespaces : `common`, `auth`, `drive`, `errors`.
- Aucune chaîne en dur dans le JSX. Hook `useTranslation()` partout où on affiche du texte.
- Format de dates via `date-fns` + locale dynamique.

## 9. Conventions de code

Issues de `cozy/cozy-guidelines` et `linagora/twake-guidelines`.

- **Naming des fonctions** : `fetchX`, `getX`, `findX`, `saveX`, `hasX`/`isX`, `makeX`, `ensureX`, `computeX`, `normalizeX`, `doXAndForget`.
- **Naming des queries cozy-client** : `as: DOCTYPE` par défaut, paramétré `${DOCTYPE}/${param}/...`.
- **Import order** : externals → cozy-* → locaux (alias `@/...` configuré via `babel-plugin-module-resolver`).
- `null` plutôt que `undefined` pour les valeurs absentes.
- `async`/`await` uniquement, pas de `.then()`.
- **Pas de styles inline** — `StyleSheet.create()` ou props Paper.
- **Pas de commentaires** sauf logique métier complexe ou contre-intuitive.
- **Composants fonctionnels uniquement**, pas de class components.
- TypeScript strict.

## 10. Gestion d'erreurs

### 10.1 Mapping erreur → UI

| Cas | Traitement |
|---|---|
| Réseau indisponible | `ErrorState` "Pas de connexion" + retry |
| Token expiré + refresh impossible | Logout silencieux + redirect `/welcome` |
| 403 sur ressource | `ErrorState` "Accès refusé" |
| 404 dossier supprimé pendant nav | `ErrorState` "Ce dossier n'existe plus" + retour |
| 5xx | `ErrorState` "Erreur serveur, réessayez plus tard" + retry |
| Discovery échoue | Toast sous le champ email "Domaine non supporté" |
| OIDC annulé | Retour silencieux à l'écran email |
| Exception JS non capturée | `ErrorBoundary` global au root layout |

Mapping centralisé dans `src/utils/errorMessages.ts` : `getErrorMessage(error): string` (clé i18n).

### 10.2 Logging

`cozy-minilog` en dev. Pas de Sentry au MVP.

## 11. Tests

Stratégie pragmatique pour MVP — on teste ce qui est risqué/critique, pas tout.

| Couche | Outils | Coverage cible |
|---|---|---|
| Auth utilities (`autodiscovery.ts`, `tokenStorage.ts`, parsing callback) | Jest + nock | Quasi 100% (logique pure, critique) |
| `useAuth` hook | RTL + mock cozy-client | Cas nominal, token expiré, logout, OIDC cancel |
| Composants UI primitives (`FileRow`, `FolderRow`, `EmptyState`, `ErrorState`, `Breadcrumb`) | RTL | Render + props |
| `FileMetadataSheet` | RTL | Render avec doc fictif |
| Écrans avec data | **Pas au MVP** |
| E2E | **Pas au MVP** |

TDD strict sur la logique pure d'auth. Pas de TDD sur l'UI au MVP.

## 12. Définition de "done" pour la v1

- [ ] L'utilisateur saisit son email, est redirigé vers OIDC, revient avec une session.
- [ ] La session persiste après fermeture/réouverture de l'app.
- [ ] L'utilisateur voit ses fichiers dans "Mes fichiers" et navigue dans les sous-dossiers.
- [ ] Les onglets "Partagés", "Récents", "Corbeille" affichent leur contenu respectif.
- [ ] Le tap sur un fichier ouvre la bottom sheet métadonnées.
- [ ] Le tap sur un dossier navigue dedans (même comportement dans Mes fichiers et Partagés).
- [ ] Le swipe-back fonctionne sur iOS et Android.
- [ ] Le fil d'Ariane s'affiche sous l'AppBar (sauf à la racine), est scrollable, et chaque segment est tappable.
- [ ] Le pull-to-refresh fonctionne sur toutes les listes.
- [ ] Mode sombre suit le système.
- [ ] FR + EN disponibles.
- [ ] Logout fonctionne et ramène à `/welcome`.
- [ ] Tests verts pour auth + composants UI primitives.
- [ ] Build iOS + Android via Expo prebuild fonctionne.

## 13. Hors-périmètre, à reprendre dans v2+

- Download / preview / upload.
- Création et gestion de partages.
- Recherche.
- Offline persistant (PouchDB ou équivalent).
- Notifications push.
- Realtime cozy-client.
- Biométrie à l'ouverture.
- Switch manuel light/dark.
- Sentry / crash reporting.
- Tests E2E (Detox / Maestro).
