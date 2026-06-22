// Entry point for the industry research project.
//
// Individual researches live as subfolders under src/. See TEMPLATE.md for how
// to add one. Run a specific research through its entrypoint under
// src/entrypoints/.

const main = (): void => {
  process.stdout.write(
    "qmu industry research. No research topic selected.\n" +
      "See TEMPLATE.md to add a topic, or run an entrypoint under src/entrypoints/.\n",
  );
};

main();
