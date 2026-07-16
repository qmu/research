import { AnthropicBedrockMantle } from "@anthropic-ai/bedrock-sdk";
import type { CompletionClient } from "./types";
import type { AwsSigV4Credential } from "./credentials";
import {
  createMessagesCompletionClient,
  type MessagesClient,
} from "./messages-completion";

// AWS Bedrock transport for Claude models. Bedrock serves the Anthropic Messages
// API through the Mantle endpoint (`AnthropicBedrockMantle`), authenticated with
// SigV4 rather than a bearer key — which is exactly why the entrypoint credential
// contract was generalized to carry a structured `awsSigV4` credential. The single
// Bedrock-specific fact (SigV4 auth + `anthropic.`-prefixed model ids) is kept
// behind this ACL; the `@aws-sdk`/SigV4 machinery never reaches `domain/`.
//
// Bedrock does not support automatic prompt caching, web search/fetch, or code
// execution, but the comparison instrument uses none of those — only the plain,
// streamed, and structured-output completions the shared Messages client provides.
// See docs/dependency-decisions.md.

// Bedrock model ids carry an `anthropic.` provider prefix (e.g.
// `anthropic.claude-opus-4-8`); a bare first-party id 400s. The registry card's
// `apiModelId` is the first-party id, so it is prefixed here at the ACL boundary
// (idempotent for ids already carrying the prefix).
const toBedrockModelId = (apiModelId: string): string =>
  apiModelId.startsWith("anthropic.") ? apiModelId : `anthropic.${apiModelId}`;

export const createBedrockCompletionClient = (
  apiModelId: string,
  credential: AwsSigV4Credential,
): CompletionClient => {
  const client = new AnthropicBedrockMantle({
    awsRegion: credential.region,
    awsAccessKey: credential.accessKeyId,
    awsSecretAccessKey: credential.secretAccessKey,
    ...(credential.sessionToken !== undefined
      ? { awsSessionToken: credential.sessionToken }
      : {}),
  });
  // The port reports the first-party model id (what the report and history key
  // on); the Bedrock wire id is used only for the SDK call.
  return {
    ...createMessagesCompletionClient(
      toBedrockModelId(apiModelId),
      client as unknown as MessagesClient,
    ),
    model: apiModelId,
  };
};
