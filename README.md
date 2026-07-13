# featuretoggle-sdk-react

React adapter for [featuretoggle-sdk-typescript](https://www.npmjs.com/package/featuretoggle-sdk-typescript) — `FeatureToggleProvider`, `useFeature`, and `useFeatureToggle`.

[![Publish to npm](https://github.com/feature-toggle/sdk-react/actions/workflows/publish.yml/badge.svg)](https://github.com/feature-toggle/sdk-react/actions/workflows/publish.yml)

## Install

```bash
bun add featuretoggle-sdk-react featuretoggle-sdk-typescript react
```

Peers: `react` (≥18), `featuretoggle-sdk-typescript` (^1.0.3).

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

## Integration patterns

See [INTEGRATION.md](./INTEGRATION.md) for server loader patterns, SSR seed, bring-your-own client, `autoInit={false}`, and security notes.

## API

- `<FeatureToggleProvider>` — `apiKey`, optional `client`, `initialFeatures`, `initialEtag`, `autoInit` (default `true`)
- `useFeature(key)` — `{ enabled, value, loading, error }`
- `useFeatureToggle()` — `{ init, refresh, getFeatures, loading, error }`

Import `FeatureResponse` from `featuretoggle-sdk-typescript` — not re-exported from this package.
