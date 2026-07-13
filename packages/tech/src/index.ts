// Entry point for the technical research project.
//
// Individual researches live as subfolders under src/ (for example
// src/llm-benchmark/). See TEMPLATE.md for how to add one. Run a specific
// research through its entrypoint under src/entrypoints/.

const main = (): void => {
  process.stdout.write(
    "qmu technical research.\n" +
      "Topics live under src/ and run through the unified CLI. Try:\n" +
      "  npm run research -- --list          (list all topics)\n" +
      "  npm run research -- <topic>         (keyless fixture by default)\n" +
      "  npm run research -- <topic> --real  (owner-triggered real run)\n" +
      "Back-compat aliases stay: compare / rag / ocr / availability.\n" +
      "See TEMPLATE.md to add a topic, or run an entrypoint under src/entrypoints/.\n",
  );
};

main();
