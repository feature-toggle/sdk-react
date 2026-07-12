# React integration patterns

Recipes for apps using `featuretoggle-sdk-react`. Full-stack setups also use [`featuretoggle-sdk-typescript`](https://www.npmjs.com/package/featuretoggle-sdk-typescript) (browser client) and [`featuretoggle-sdk-typescript/server`](https://www.npmjs.com/package/featuretoggle-sdk-typescript) (Node loaders, API routes, SSR).

No single golden path — pick what fits your runtime, framework, and freshness needs.

## Package picker

| Your runtime | Package |
|--------------|---------|
| React UI (browser) | `featuretoggle-sdk-react` + `featuretoggle-sdk-typescript` |
| Route loader / API route / middleware | `featuretoggle-sdk-typescript/server` |
| SSR + hydrated React | Server entry in loader **and** React adapter in client tree |

Both TypeScript entries ship **ESM + CJS + types**. Plain JavaScript works — TypeScript is optional.

```javascript
// ESM
import { FeatureToggle } from "featuretoggle-sdk-typescript";
import { FeatureToggleServer } from "featuretoggle-sdk-typescript/server";

// CJS
const { FeatureToggle } = require("featuretoggle-sdk-typescript");
const { FeatureToggleServer } = require("featuretoggle-sdk-typescript/server");
```

---

## Security

### API keys in the browser are public

Keys in client bundles (`VITE_*`, inlined env) can be extracted. Use **test keys** (`ft_test_`) from `development` on **localhost** in the browser. Use **live keys** (`ft_live_`) from `staging` / `production` on trusted backends via `featuretoggle-sdk-typescript/server`.

### Read-only, not secret

Keys grant read access to all enabled flags for one environment. Revoke compromised keys in the dashboard; the core SDK clears its cache on `401`.

### Feature flags are not authorization

Client `useFeature().enabled` is for UX only — gate sensitive routes and APIs on the server (see [API route / middleware gate](#api-route--middleware-gate)).

### Sanitize flag values

Treat `value` from hooks as untrusted before rendering HTML or executing as code.

### SSR seed exposure

Patterns that pass `initialFeatures` embed flag state in HTML or loader data visible to the client — do not seed flags that must stay server-only.

### SSR localhost and test keys

Server `fetch` without `Origin` returns **403** for test keys. Use a custom `fetch` with `Origin: http://localhost:<port>`, client-only init, or `ft_live_` in a deployed environment.

### Server singleton concurrency

When sharing one `FeatureToggleServer` per process, **await `refresh()`** before reads under concurrent requests, or use a [per-request server instance](#per-request-server-instance).

### Custom fetch

The optional `fetch` option on `FeatureToggle` is for tests. Do not log `Authorization` headers in production wrappers.

Full security notes for the core SDK: [featuretoggle-sdk-typescript README](https://github.com/feature-toggle/sdk-typescript#security).

---

## Server patterns (loaders and APIs)

Use these in route loaders, middleware, and API handlers. Pair with the React patterns below for full-stack apps.

### Module singleton (default)

One `FeatureToggleServer` per process; refresh when you need freshness.

```typescript
import { FeatureToggleServer } from "featuretoggle-sdk-typescript/server";

let ft: FeatureToggleServer | null = null;

export async function getServerFt() {
  if (!ft) {
    ft = new FeatureToggleServer({ apiKey: process.env.FT_API_KEY! });
    await ft.init();
  }
  return ft;
}

// per request
const ft = await getServerFt();
await ft.refresh();
if (ft.isEnabled("beta")) {
  /* branch */
}
```

### Per-request server instance

Strict isolation; one bulk fetch per request. Simplest mental model; higher origin load.

```typescript
export async function handleRequest() {
  const ft = new FeatureToggleServer({ apiKey: process.env.FT_API_KEY! });
  await ft.init();
  return ft.isEnabled("feature-x");
}
```

### API route / middleware gate

Server entry only — no React. **This is the security boundary** for sensitive flags: gate redirects, JSON responses, and authorization checks here. Client-side hooks alone are not authorization.

```typescript
const ft = await getServerFt();
await ft.refresh();
if (!ft.isEnabled("api-v2")) {
  return new Response("Not found", { status: 404 });
}
```

### TTL refresh (singleton variant)

Call `refresh()` only when cache age exceeds your TTL (track `lastRefreshAt` in app code). Fewer origin calls; slightly staler reads.

---

## React patterns

`featuretoggle-sdk-react` peers: `react`, `featuretoggle-sdk-typescript` only.

### Client-only SPA (simplest)

Use a non-production key in the browser (see [API keys in the browser are public](#api-keys-in-the-browser-are-public)).

```tsx
import { FeatureToggleProvider, useFeature } from "featuretoggle-sdk-react";

function App() {
  return (
    <FeatureToggleProvider apiKey={import.meta.env.VITE_FT_API_KEY}>
      <Checkout />
    </FeatureToggleProvider>
  );
}

function Checkout() {
  const { enabled, value, loading } = useFeature("new-checkout");
  if (loading) return null;
  return enabled ? <NewCheckout /> : <LegacyCheckout />;
}
```

### Bring-your-own client

Pass a pre-constructed `FeatureToggle` (tests, shared instance, custom `fetch` mock).

```tsx
import { FeatureToggle } from "featuretoggle-sdk-typescript";
import { FeatureToggleProvider } from "featuretoggle-sdk-react";

const ft = new FeatureToggle({ apiKey, fetch: mockFetch });
await ft.init();

<FeatureToggleProvider client={ft}>
  <App />
</FeatureToggleProvider>;
```

The provider does **not** call `close()` on unmount when `client` is supplied — you own lifecycle.

### SSR seed (no flash)

Fetch on the server with `FeatureToggleServer`, then pass bulk features into the provider. Hooks start with `loading: false` when a seed is present; the client still calls `init()` and opens the live stream.

```tsx
// loader (server)
import { FeatureToggleServer } from "featuretoggle-sdk-typescript/server";

const ft = new FeatureToggleServer({ apiKey: process.env.FT_API_KEY! });
await ft.init();
await ft.refresh();
const features = ft.getFeatures();

// client root
<FeatureToggleProvider
  apiKey={clientApiKey}
  initialFeatures={features}
  initialEtag={etagFromLoader}
>
  <App />
</FeatureToggleProvider>;
```

Do not seed flags that must remain server-only (see [SSR seed exposure](#ssr-seed-exposure)).

### SSR props (component-level)

Server evaluates a flag and passes a boolean or value as props. The hook takes over after client init. Prefer booleans over raw values when the value must not appear in HTML.

```tsx
function Banner({ initialEnabled }: { initialEnabled: boolean }) {
  const { enabled, loading } = useFeature("banner-v2");
  const show = loading ? initialEnabled : enabled;
  return show ? <NewBanner /> : null;
}
```

No provider seed required — good for one-off SSR markup.

### Companion hook (bulk / refresh)

```tsx
import { useFeatureToggle } from "featuretoggle-sdk-react";

function FeatureList() {
  const { refresh, getFeatures, loading, error } = useFeatureToggle();
  // ...
}
```

Use when you need filtered lists or manual reload — not per-key hooks.

### Manual init

Defer `init()` until your app is ready (e.g. after auth, route transition).

```tsx
<FeatureToggleProvider apiKey={apiKey} autoInit={false}>
  <App />
</FeatureToggleProvider>
```

```tsx
function Startup() {
  const { init } = useFeatureToggle();

  useEffect(() => {
    void init();
  }, [init]);

  return null;
}
```

---

## SSR split (server loader + client provider)

Full-stack apps combine **server core** and **this React adapter** — there is no separate server provider package.

| Step | Package | Role |
|------|---------|------|
| Loader / middleware | `featuretoggle-sdk-typescript/server` | Redirects, SSR branches, seed data |
| Client layout | `featuretoggle-sdk-react` | Hooks, live updates |
| Optional seed | `initialFeatures` on provider | Match SSR without loading flash |

```
Route loader          FeatureToggleServer
      │                      │
      ├──── refresh() ───────┤
      │                      │
      ▼                      ▼
  SSR HTML / loader data ──► FeatureToggleProvider ──► useFeature
```

Server reads stay imperative in loaders and route handlers. The React tree handles client hydration and subscriptions.

---

## Framework notes

These are recipes, not shipped packages:

| Framework | Approach |
|-----------|----------|
| TanStack Router / Start | Server loader uses `FeatureToggleServer`; client route wraps [client-only SPA](#client-only-spa-simplest) or [SSR seed](#ssr-seed-no-flash) |
| Next.js App Router | Server Component or loader uses server entry; `'use client'` boundary wraps the provider |
| TanStack Query | Key `['features']`; `queryFn` wraps `getFeatures()`; invalidate on `client.subscribe()` |
| Redux / Zustand | `subscribe()` dispatches a slice update |

---

## Freshness vs cost

| Pattern | Freshness | Origin load |
|---------|-----------|-------------|
| Client stream (default) | Good for open tabs | Low when ETag / 304 works |
| SSR seed + client stream | Good SSR + live client | Medium |
| Server per-request refresh | Best per page load | Highest |
| Server singleton + TTL refresh | Configurable | Lower |

For server singleton patterns, **await `refresh()`** before reads under concurrent requests, or use a per-request `FeatureToggleServer` instance.

---

## Core SDK without React

If you need imperative client usage or `subscribe()` without hooks, see [featuretoggle-sdk-typescript](https://www.npmjs.com/package/featuretoggle-sdk-typescript) — SPA singleton, seeded cache, and manual lifecycle patterns live there.
