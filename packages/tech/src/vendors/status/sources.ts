import type { StatusSourceKind } from "../../llm-model-comparison/domain/availability";
import type { Provider } from "../../llm-model-comparison/domain/types";

// Where each provider publishes its status/incident history, and in what shape.
// These are PUBLIC pages — no credentials. The URLs were verified live on
// 2026-07-09: status.anthropic.com 302-redirects to status.claude.com;
// OpenAI/Google expose incident JSON feeds; xAI's page sits behind Cloudflare and
// blocks scripted access (recorded honestly as unretrievable at fetch time).
export type StatusSource = Readonly<{
  provider: Provider;
  providerName: string;
  url: string;
  kind: StatusSourceKind;
}>;

export const STATUS_SOURCES: ReadonlyArray<StatusSource> = [
  {
    provider: "anthropic",
    providerName: "Anthropic (Claude)",
    url: "https://status.claude.com/api/v2/incidents.json",
    kind: "statuspage-json",
  },
  {
    provider: "google",
    providerName: "Google Cloud",
    url: "https://status.cloud.google.com/incidents.json",
    kind: "google-json",
  },
  {
    provider: "openai",
    providerName: "OpenAI",
    url: "https://status.openai.com/api/v2/incidents.json",
    kind: "statuspage-json",
  },
  {
    provider: "xai",
    providerName: "xAI",
    url: "https://status.x.ai/",
    kind: "html",
  },
];
