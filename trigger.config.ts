
import type { TriggerConfig } from "@trigger.dev/sdk";

export const config: TriggerConfig = {
  project: "proj_mrxpgmvgheruislaxmui",
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["src/trigger"],
  maxDuration: 300,
};
