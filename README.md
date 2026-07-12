# featuretoggle-sdk-react

React adapter for [featuretoggle-sdk-typescript](https://www.npmjs.com/package/featuretoggle-sdk-typescript) — `FeatureToggleProvider`, `useFeature`, and `useFeatureToggle`.

## Install

```bash
bun add featuretoggle-sdk-react featuretoggle-sdk-typescript react
```

Peers: `react` (≥18), `featuretoggle-sdk-typescript` (^1.0.0).

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

See the [integration cookbook](https://github.com/feature-toggle/feature-toggle-monorepo/blob/main/docs/17-sdk-integration-patterns.md) for SSR seed, BYO client, `autoInit={false}`, and more (patterns I–N).

## API

- `<FeatureToggleProvider>` — `apiKey`, optional `client`, `initialFeatures`, `initialEtag`, `autoInit` (default `true`)
- `useFeature(key)` — `{ enabled, value, loading, error }`
- `useFeatureToggle()` — `{ init, refresh, getFeatures, loading, error }`

Import `FeatureResponse` from `featuretoggle-sdk-typescript` — not re-exported from this package.
