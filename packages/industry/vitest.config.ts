import { defineConfig } from "vitest/config";

// Tests live in `src/`, and ONLY in `src/`.
//
// This file exists because the default `include` was relied on until vitest 4.
// `npm run build` compiles to `dist/`, so after any build the tree holds a
// second copy of every test as emitted JavaScript. Vitest 3's defaults did not
// match them; vitest 4's do. The compiled copies then fail for reasons that say
// nothing about the code — `dist/rag-benchmark/domain/dataset.test.js` looks for
// a fixture JSON that `tsc` does not copy — so the suite goes red on a build
// artifact rather than on a defect.
//
// Pinning the root here also makes the run independent of whether `dist` exists,
// which is what made the failure depend on command ORDER (test-then-build passed,
// build-then-test did not).
export default defineConfig({
  test: {
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "dist/**"],
  },
});
