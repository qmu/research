import tseslint from "typescript-eslint";

// Enforces the coding-standards policy: default to TypeScript features where the
// type checker and declarative guarantees apply, and flag the ones where those
// guarantees fall away, so the compiler catches as much as possible in
// AI-produced code.
export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      // Unused symbols stay an error, but an underscore prefix marks an argument
      // as intentionally unused — needed where a provider-neutral port method must
      // accept a positional argument (e.g. the prompt) that a particular adapter
      // does not consume.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-var": "error",
      eqeqeq: ["error", "always"],
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSEnumDeclaration",
          message:
            "Use a union of string literals or `as const` instead of enum.",
        },
        {
          selector: "ClassDeclaration",
          message: "Prefer functions and types over classes.",
        },
        {
          selector: "TSModuleDeclaration",
          message: "Avoid namespace; use ES modules.",
        },
        {
          selector: "SwitchStatement",
          message: "Prefer exhaustive handling of a union over switch.",
        },
      ],
    },
  },
  {
    ignores: [
      "dist/",
      "node_modules/",
      // The computer-use fixture site is committed BROWSER DATA, not project
      // source: it is served to a real browser as the pinned task environment,
      // so it targets the browser's own ES5-era globals rather than this
      // project's TypeScript standards. Linting it as source would demand
      // module-scoped `const`/`let` semantics it cannot have. Its correctness is
      // guarded by `src/computer-use/domain/site-fixture.test.ts` instead.
      "src/computer-use/domain/data/site/",
    ],
  },
);
