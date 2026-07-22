# React cookbook

Recipes for apps using `featuretoggle-sdk-react`. Full-stack setups also use [`featuretoggle-sdk-typescript`](https://www.npmjs.com/package/featuretoggle-sdk-typescript) (browser client) and [`featuretoggle-sdk-typescript/server`](https://www.npmjs.com/package/featuretoggle-sdk-typescript) (Node loaders, API routes, SSR).

Install and API surface: [README](./README.md). Platform rules (keys, authz, sanitization): [Security](https://featuretoggle.com/docs/security). Transport and refresh cost: [Caching and syncs](https://featuretoggle.com/docs/caching). Server loaders and middleware: [TypeScript cookbook — Server patterns](https://github.com/feature-toggle/sdk-typescript/blob/main/INTEGRATION.md#server-patterns-node).

## Which entry

| Your runtime | Package |
|--------------|---------|
| React UI (browser) | `featuretoggle-sdk-react` + `featuretoggle-sdk-typescript` |
| Route loader / API route / middleware | `featuretoggle-sdk-typescript/server` |
| SSR + hydrated React | Server entry in loader **and** React adapter in client tree |

---

## React patterns

`featuretoggle-sdk-react` peers: `react`, `featuretoggle-sdk-typescript` only.

### Client-only SPA (simplest)

Use a non-production key in the browser ([Security](https://featuretoggle.com/docs/security)).

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

### Stream off + poll

Forward Core transport options on the provider — no BYO client required:

```tsx
<FeatureToggleProvider apiKey={apiKey} stream="off" pollInterval={5}>
  <App />
</FeatureToggleProvider>
```

Same semantics as `new FeatureToggle({ stream: "off", pollInterval: 5 })`. Use **`pollInterval: 0`** to disable the timer (tab focus + manual `refresh()` only). Details: [Caching and syncs](https://featuretoggle.com/docs/caching).

### Bring-your-own client

Pass a pre-constructed `FeatureToggle` (tests, shared instance, custom `fetch` mock). Provider `stream` / `pollInterval` are ignored when `client` is set.

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

Fetch on the server with `FeatureToggleServer`, then pass bulk features into the provider. Hooks start with `loading: false` when a seed is present; the client still calls `init()` and opens the live stream. Do not seed flags that must stay server-only ([Security](https://featuretoggle.com/docs/security)).

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

Server reads stay imperative in loaders and route handlers. The React tree handles client hydration and subscriptions. Server singleton / gate recipes: [TypeScript cookbook](https://github.com/feature-toggle/sdk-typescript/blob/main/INTEGRATION.md#server-patterns-node).

---

## Framework notes

These are recipes, not shipped packages:

| Framework | Approach |
|-----------|----------|
| Redux / Zustand | `subscribe()` dispatches a slice update |

---

## Core SDK without React

Imperative client usage and `subscribe()` without hooks: [TypeScript cookbook](https://github.com/feature-toggle/sdk-typescript/blob/main/INTEGRATION.md) — SPA singleton, seeded cache, and manual lifecycle.
