// Representative captures of real `mlx_lm.generate --verbose` stdout, used to
// unit-test the MLX adapter (`mlx.ts`) without needing Apple Silicon hardware to
// produce a fresh run. The shape — generated text framed by a `==========` line
// on each side, then the `Prompt:` / `Generation:` / `Peak memory:` stats block
// — is `mlx_lm`'s own CLI output, byte-for-byte aside from the numbers.

// A short, single-line completion — the common case.
export const MLX_GENERATE_FIXTURE_SHORT = `==========
Paris is the capital of France.
==========
Prompt: 28 tokens, 214.552 tokens-per-sec
Generation: 9 tokens, 71.063 tokens-per-sec
Peak memory: 4.129 GB
`;

// A longer, multi-paragraph completion, so the text extractor is proven against
// embedded blank lines rather than only a one-line reply.
export const MLX_GENERATE_FIXTURE_MULTILINE = `==========
Mixed-precision training keeps most tensors in a lower-precision format while
accumulating sums in a higher-precision one.

This trades a small amount of numerical range for roughly half the memory
traffic, which is why it speeds up both training and inference on modern
accelerators.
==========
Prompt: 12 tokens, 301.884 tokens-per-sec
Generation: 47 tokens, 58.217 tokens-per-sec
Peak memory: 6.774 GB
`;
