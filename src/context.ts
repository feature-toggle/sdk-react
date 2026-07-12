import { createContext } from "react";

import type { FeatureToggleContextValue } from "./types.js";

export const FeatureToggleContext = createContext<FeatureToggleContextValue | null>(
  null,
);
