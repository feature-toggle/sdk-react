import type { FeatureResponse } from "featuretoggle-sdk-typescript";
import type { FeatureToggle } from "featuretoggle-sdk-typescript";

export type FeatureToggleProviderProps = {
  apiKey?: string;
  client?: FeatureToggle;
  pollInterval?: number;
  initialFeatures?: FeatureResponse[];
  initialEtag?: string;
  autoInit?: boolean;
  children: React.ReactNode;
};

export type UseFeatureResult<T = unknown> = {
  enabled: boolean;
  value: T | undefined;
  loading: boolean;
  error: Error | null;
};

export type UseFeatureToggleResult = {
  init: () => Promise<void>;
  refresh: () => Promise<void>;
  getFeatures: (
    options?: Parameters<FeatureToggle["getFeatures"]>[0],
  ) => FeatureResponse[];
  loading: boolean;
  error: Error | null;
};

export type FeatureToggleContextValue = {
  client: FeatureToggle;
  loading: boolean;
  error: Error | null;
  init: () => Promise<void>;
  refresh: () => Promise<void>;
};
