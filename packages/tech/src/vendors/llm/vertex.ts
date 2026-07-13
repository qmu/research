import { AnthropicVertex } from "@anthropic-ai/vertex-sdk";
import type { CompletionClient } from "./types";
import type { GcpAdcCredential } from "./credentials";
import {
  createMessagesCompletionClient,
  type MessagesClient,
} from "./messages-completion";

// Google Vertex AI transport for Claude models. Vertex serves the Anthropic
// Messages API (`AnthropicVertex`) authenticated with GCP Application Default
// Credentials — resolved by the google-auth library from the ambient environment
// (GOOGLE_APPLICATION_CREDENTIALS or the metadata server), never a bearer key. The
// generalized credential contract carries only the routing facts (project +
// location); the `gcpAdc` credential holds no secret. The single Vertex-specific
// fact (ADC auth + project/region routing) stays behind this ACL; the
// google-auth machinery never reaches `domain/`.
//
// Vertex model ids are the BARE first-party ids (no provider prefix — unlike
// Bedrock), so the registry card's `apiModelId` is used as-is. Vertex supports
// adaptive thinking/effort but not automatic prompt caching, web search/fetch, or
// code execution — none of which the comparison instrument uses. See
// docs/dependency-decisions.md.

export const createVertexCompletionClient = (
  apiModelId: string,
  credential: GcpAdcCredential,
): CompletionClient => {
  const client = new AnthropicVertex({
    projectId: credential.projectId,
    region: credential.location,
  });
  return createMessagesCompletionClient(
    apiModelId,
    client as unknown as MessagesClient,
  );
};
