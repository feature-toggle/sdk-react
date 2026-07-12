import { afterEach, describe, expect, mock, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { FeatureToggle } from "featuretoggle-sdk-typescript";

import {
  FeatureToggleProvider,
  useFeature,
  useFeatureToggle,
} from "../src/index.js";
import fixture from "./fixtures/features-bulk-200.json";
import { createDefaultMockFetch, feature, jsonResponse } from "./helpers.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  mock.restore();
  globalThis.fetch = originalFetch;
});

function Probe({ featureKey }: { featureKey: string }) {
  const state = useFeature(featureKey);
  return (
    <div>
      <span data-testid="loading">{String(state.loading)}</span>
      <span data-testid="enabled">{String(state.enabled)}</span>
      <span data-testid="value">{String(state.value ?? "")}</span>
      <span data-testid="error">{state.error?.message ?? ""}</span>
    </div>
  );
}

function ManualInitProbe() {
  const { init, loading } = useFeatureToggle();
  const checkout = useFeature("new-checkout");
  return (
    <div>
      <span data-testid="toggle-loading">{String(loading)}</span>
      <span data-testid="feature-loading">{String(checkout.loading)}</span>
      <button type="button" onClick={() => void init()}>
        init
      </button>
    </div>
  );
}

function FeaturesProbe() {
  const { getFeatures } = useFeatureToggle();
  return <span data-testid="feature-count">{getFeatures().length}</span>;
}

function mockNetwork() {
  const fetchFn = createDefaultMockFetch(() =>
    jsonResponse(fixture, { headers: { ETag: '"1"' } }),
  );
  globalThis.fetch = fetchFn as typeof fetch;
  return fetchFn;
}

describe("FeatureToggleProvider", () => {
  test("default provider with apiKey initializes useFeature", async () => {
    mockNetwork();

    const view = render(
      <FeatureToggleProvider apiKey="ft_test_key">
        <Probe featureKey="new-checkout" />
      </FeatureToggleProvider>,
    );

    await waitFor(() => {
      expect(view.getByTestId("loading").textContent).toBe("false");
      expect(view.getByTestId("enabled").textContent).toBe("true");
    });

    view.unmount();
  });

  test("seeded provider starts with loading false", async () => {
    mockNetwork();

    const view = render(
      <FeatureToggleProvider
        apiKey="ft_test_key"
        initialFeatures={fixture.features}
        initialEtag='"1"'
      >
        <Probe featureKey="theme-variant" />
      </FeatureToggleProvider>,
    );

    expect(view.getByTestId("loading").textContent).toBe("false");
    expect(view.getByTestId("value").textContent).toBe("dark");

    await waitFor(() => {
      expect(view.getByTestId("enabled").textContent).toBe("true");
    });

    view.unmount();
  });

  test("BYO client is not closed by provider on unmount", async () => {
    const fetchFn = createDefaultMockFetch(() =>
      jsonResponse({ features: [feature({ key: "alpha" })] }),
    );

    const client = new FeatureToggle({
      apiKey: "ft_test_key",
      fetch: fetchFn,
      stream: "off",
    });

    await client.init();
    const callsBefore = fetchFn.callCount();

    const view = render(
      <FeatureToggleProvider client={client}>
        <Probe featureKey="alpha" />
      </FeatureToggleProvider>,
    );

    await waitFor(() => {
      expect(view.getByTestId("enabled").textContent).toBe("true");
    });

    view.unmount();

    await client.refresh();
    expect(fetchFn.callCount()).toBeGreaterThan(callsBefore);
    client.close();
  });

  test("autoInit false waits for manual init", async () => {
    const fetchFn = createDefaultMockFetch(() =>
      jsonResponse(fixture, { headers: { ETag: '"1"' } }),
    );

    const client = new FeatureToggle({
      apiKey: "ft_test_key",
      fetch: fetchFn,
      stream: "off",
    });

    const view = render(
      <FeatureToggleProvider client={client} autoInit={false}>
        <ManualInitProbe />
      </FeatureToggleProvider>,
    );

    expect(view.getByTestId("toggle-loading").textContent).toBe("true");

    view.getByRole("button", { name: "init" }).click();

    await waitFor(() => {
      expect(view.getByTestId("toggle-loading").textContent).toBe("false");
      expect(view.getByTestId("feature-loading").textContent).toBe("false");
    });

    view.unmount();
    client.close();
  });

  test("init failure surfaces error on hooks", async () => {
    const fetchFn = createDefaultMockFetch(() => new Response(null, { status: 500 }));

    const client = new FeatureToggle({
      apiKey: "ft_test_key",
      fetch: fetchFn,
      stream: "off",
    });

    const view = render(
      <FeatureToggleProvider client={client}>
        <Probe featureKey="missing" />
      </FeatureToggleProvider>,
    );

    await waitFor(() => {
      expect(view.getByTestId("loading").textContent).toBe("false");
      expect(view.getByTestId("error").textContent).toContain("HTTP 500");
    });

    view.unmount();
  });

  test("hooks outside provider throw", () => {
    function Orphan() {
      useFeature("x");
      return null;
    }

    expect(() => render(<Orphan />)).toThrow(
      "useFeature must be used within FeatureToggleProvider",
    );
  });

  test("getFeatures re-renders when cache updates", async () => {
    const bulkResponses = [
      jsonResponse({ features: [feature({ key: "alpha" })] }),
      jsonResponse({
        features: [feature({ key: "alpha" }), feature({ key: "beta" })],
      }),
    ];
    let bulkCalls = 0;

    const fetchFn = createDefaultMockFetch((input) => {
      const url = String(input);
      if (url.endsWith("/v1/features/stream")) {
        return new Response(new ReadableStream(), {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        });
      }

      const response = bulkResponses[Math.min(bulkCalls, bulkResponses.length - 1)]!;
      bulkCalls += 1;
      return response;
    });

    const client = new FeatureToggle({
      apiKey: "ft_test_key",
      fetch: fetchFn,
      stream: "off",
    });

    await client.init();

    const view = render(
      <FeatureToggleProvider client={client} autoInit={false}>
        <FeaturesProbe />
      </FeatureToggleProvider>,
    );

    expect(view.getByTestId("feature-count").textContent).toBe("1");

    await client.refresh();

    await waitFor(() => {
      expect(view.getByTestId("feature-count").textContent).toBe("2");
    });

    view.unmount();
    client.close();
  });

  test("Strict Mode double-mount with owned client", async () => {
    mockNetwork();

    const view = render(
      <StrictMode>
        <FeatureToggleProvider apiKey="ft_test_key">
          <Probe featureKey="new-checkout" />
        </FeatureToggleProvider>
      </StrictMode>,
    );

    await waitFor(() => {
      expect(view.getByTestId("loading").textContent).toBe("false");
      expect(view.getByTestId("enabled").textContent).toBe("true");
    });

    view.unmount();
  });
});
