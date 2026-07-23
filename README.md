# featuretoggle-sdk-react

React adapter for [featuretoggle-sdk-typescript](https://www.npmjs.com/package/featuretoggle-sdk-typescript) — `FeatureToggleProvider`, `useFeature`, and `useFeatureToggle`.

[![Publish to npm](https://github.com/feature-toggle/sdk-react/actions/workflows/publish.yml/badge.svg)](https://github.com/feature-toggle/sdk-react/actions/workflows/publish.yml)

## Install

```bash
npm install featuretoggle-sdk-react featuretoggle-sdk-typescript react
# or
pnpm add featuretoggle-sdk-react featuretoggle-sdk-typescript react
# or
yarn add featuretoggle-sdk-react featuretoggle-sdk-typescript react
# or
bun add featuretoggle-sdk-react featuretoggle-sdk-typescript react
```

Peers: `react` (≥18), `featuretoggle-sdk-typescript` (^1.1.0).

## Quick start

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
  const { enabled, loading } = useFeature("new-checkout");
  if (loading) return null;
  return enabled ? <NewCheckout /> : <LegacyCheckout />;
}
```

## Cookbook

Full recipes in [INTEGRATION.md](./INTEGRATION.md) (Cookbook):

| Pattern | See |
|---------|-----|
| Client-only SPA | [INTEGRATION.md](./INTEGRATION.md#client-only-spa-simplest) |
| Stream off + poll | [INTEGRATION.md](./INTEGRATION.md#stream-off--poll) |
| Bring-your-own client | [INTEGRATION.md](./INTEGRATION.md#bring-your-own-client) |
| SSR seed (no flash) | [INTEGRATION.md](./INTEGRATION.md#ssr-seed-no-flash) |
| SSR props (component-level) | [INTEGRATION.md](./INTEGRATION.md#ssr-props-component-level) |
| Companion hook (bulk / refresh) | [INTEGRATION.md](./INTEGRATION.md#companion-hook-bulk--refresh) |
| Manual init | [INTEGRATION.md](./INTEGRATION.md#manual-init) |

Server loader patterns: [TypeScript cookbook](https://github.com/feature-toggle/sdk-typescript/blob/main/INTEGRATION.md#server-patterns-node).

## API

- `<FeatureToggleProvider>` — `apiKey`, optional `client`, `stream`, `pollInterval`, `initialFeatures`, `initialEtag`, `autoInit` (default `true`)
- `useFeature(key)` — `{ enabled, value, loading, error }`
- `useFeatureToggle()` — `{ init, refresh, getFeatures, loading, error }`

`stream` and `pollInterval` forward to the owned Core client (same semantics as `featuretoggle-sdk-typescript`). Use BYO `client` for custom `fetch` / visibility.

Import `FeatureResponse` from `featuretoggle-sdk-typescript` — not re-exported from this package.
