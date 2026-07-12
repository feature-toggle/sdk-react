import {
  FeatureToggle,
  type FeatureResponse,
} from "featuretoggle-sdk-typescript";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { FeatureToggleContext } from "./context.js";
import type {
  FeatureToggleContextValue,
  FeatureToggleProviderProps,
  UseFeatureResult,
  UseFeatureToggleResult,
} from "./types.js";

function useFeatureToggleContext(): FeatureToggleContextValue {
  const value = useContext(FeatureToggleContext);
  if (!value) {
    throw new Error("useFeature must be used within FeatureToggleProvider");
  }
  return value;
}

function isSeeded(initialFeatures: FeatureResponse[] | undefined): boolean {
  return initialFeatures !== undefined;
}

export function FeatureToggleProvider({
  apiKey,
  client: clientProp,
  initialFeatures,
  initialEtag,
  autoInit = true,
  pollInterval: _pollInterval,
  children,
}: FeatureToggleProviderProps) {
  const ownsClient = clientProp === undefined;
  const seeded = isSeeded(initialFeatures);
  const initGenerationRef = useRef(0);
  const clientRef = useRef<FeatureToggle | null>(null);
  const apiKeyRef = useRef(apiKey);

  if (clientProp) {
    clientRef.current = null;
  } else if (apiKey) {
    if (!clientRef.current || apiKeyRef.current !== apiKey) {
      clientRef.current?.close();
      clientRef.current = new FeatureToggle({
        apiKey,
        initialFeatures,
        initialEtag,
      });
      apiKeyRef.current = apiKey;
    }
  } else {
    throw new Error("FeatureToggleProvider requires apiKey or client");
  }

  const client = clientProp ?? clientRef.current!;

  const [loading, setLoading] = useState(() => !seeded);
  const [error, setError] = useState<Error | null>(null);

  const runInit = useCallback(async () => {
    const generation = ++initGenerationRef.current;
    setError(null);
    if (!seeded) {
      setLoading(true);
    }

    try {
      await client.init();
      if (initGenerationRef.current !== generation) return;
      setLoading(false);
    } catch (unknownError) {
      if (initGenerationRef.current !== generation) return;
      const nextError =
        unknownError instanceof Error
          ? unknownError
          : new Error(String(unknownError));
      setError(nextError);
      setLoading(false);
      throw nextError;
    }
  }, [client, seeded]);

  const refresh = useCallback(async () => {
    await client.refresh();
  }, [client]);

  useEffect(() => {
    if (!autoInit) return;
    void runInit().catch(() => undefined);
  }, [autoInit, runInit]);

  useEffect(() => {
    if (!ownsClient) return;
    return () => {
      initGenerationRef.current += 1;
      clientRef.current?.close();
      clientRef.current = null;
    };
  }, [ownsClient]);

  const contextValue = useMemo<FeatureToggleContextValue>(
    () => ({
      client,
      loading,
      error,
      init: runInit,
      refresh,
    }),
    [client, loading, error, runInit, refresh],
  );

  return (
    <FeatureToggleContext.Provider value={contextValue}>
      {children}
    </FeatureToggleContext.Provider>
  );
}

export function useFeature<T = unknown>(key: string): UseFeatureResult<T> {
  const { client, loading, error } = useFeatureToggleContext();

  const snapshot = useSyncExternalStore(
    (listener) => client.subscribe(listener),
    () =>
      JSON.stringify({
        enabled: client.isEnabled(key),
        value: client.getValue<T>(key),
      }),
    () => JSON.stringify({ enabled: false, value: undefined }),
  );

  const parsed = JSON.parse(snapshot) as {
    enabled: boolean;
    value: T | undefined;
  };

  return {
    enabled: parsed.enabled,
    value: parsed.value,
    loading,
    error,
  };
}

export function useFeatureToggle(): UseFeatureToggleResult {
  const { client, loading, error, init, refresh } = useFeatureToggleContext();

  // Subscribe so callers re-render when the core cache updates (SSE, refresh, etc.).
  useSyncExternalStore(
    (listener) => client.subscribe(listener),
    () => JSON.stringify(client.getFeatures()),
    () => "[]",
  );

  return {
    init,
    refresh,
    getFeatures: (options) => client.getFeatures(options),
    loading,
    error,
  };
}
