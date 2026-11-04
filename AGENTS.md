# AGENTS.md — featuretoggle-sdk-react

The React adapter for `featuretoggle-sdk-typescript`. This repo is **public**, so only reference things in it or public URLs (`https://featuretoggle.com/docs/*`, the `sdk-typescript` GitHub repo).

## Layout

- `src/provider.tsx` contains `FeatureToggleProvider`, `useFeature` and `useFeatureToggle`.
- `src/types.ts` holds the public prop and result types.
- `test/provider.test.tsx` uses `bun test`, `@testing-library/react` and happy-dom.

## Rules

- **No cache of its own.** Always delegate to the core `FeatureToggle` client, and re-render through `subscribe()`.
- **The provider supports two modes:**
  - It owns a client (from `apiKey`): forwards `stream`, `pollInterval`, `initialFeatures` and `initialEtag`, and closes the client on unmount.
  - It receives a BYO `client`: the caller owns its lifecycle.
- **`autoInit` defaults to true.** When seeded, the provider starts with `loading: false`.
- **Peer dependencies only:** `react >=18` and `featuretoggle-sdk-typescript`. Never re-export the core SDK.
- **Update `README.md` and `INTEGRATION.md` (Cookbook) together with any behaviour change.**

## Verify and release

- Run `bun run verify`.
- Publishing happens when a version tag is pushed, which triggers `.github/workflows/publish.yml`. Only do it when asked. Keep the core peer range in step with core releases.
