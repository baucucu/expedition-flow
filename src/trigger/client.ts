
import { Trigger } from "@trigger.dev/sdk";

export const triggerClient = new Trigger({
  id: "expedition-flow",
  apiKey: process.env.TRIGGER_API_KEY,
  apiUrl: process.env.TRIGGER_API_URL,
});
