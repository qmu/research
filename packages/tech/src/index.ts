// Entry point for the technical research project.
//
// Individual researches live as subfolders under src/ (for example
// src/llm-benchmark/). See TEMPLATE.md for how to add one. Run a specific
// research through its entrypoint under src/entrypoints/.

const main = (): void => {
  process.stdout.write(
    "qmu technical research.\n" +
      "Topics live under src/. Try:\n" +
      "  npm run benchmark:fixture  (the llm-benchmark topic)\n" +
      "  npm run compare:fixture    (the llm-model-comparison topic)\n" +
      "  npm run rag:fixture        (the rag-benchmark topic)\n" +
      "See TEMPLATE.md to add a topic, or run an entrypoint under src/entrypoints/.\n",
  );
};

main();
