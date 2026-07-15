import type { FeatureResponse } from "featuretoggle-sdk-typescript";

export function feature(
  overrides: Partial<FeatureResponse> & Pick<FeatureResponse, "key">,
): FeatureResponse {
  return {
    type: "boolean",
    value: true,
    enabled: true,
    deprecated: false,
    ...overrides,
  };
}

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

export function createDefaultMockFetch(
  handler: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Response | Promise<Response>,
): typeof fetch & { callCount: () => number } {
  let calls = 0;
  const fetchFn = ((input: RequestInfo | URL, init?: RequestInit) => {
    calls += 1;
    const url = String(input);
    if (url.endsWith("/v1/features/stream")) {
      return Promise.resolve(
        new Response(new ReadableStream(), {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }),
      );
    }
    return Promise.resolve(handler(input, init));
  }) as typeof fetch & { callCount: () => number };

  fetchFn.callCount = () => calls;
  return fetchFn;
}
