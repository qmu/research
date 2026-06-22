// Entry point for the technical research project.
//
// Individual researches live as subfolders under src/ (for example
// src/llm-benchmark/). See TEMPLATE.md for how to add one. Run a specific
// research through its entrypoint under src/entrypoints/.

const main = (): void => {
  process.stdout.write(
    "qmu technical research. No research topic selected.\n" +
      "See TEMPLATE.md to add a topic, or run an entrypoint under src/entrypoints/.\n",
  );
};

main();
