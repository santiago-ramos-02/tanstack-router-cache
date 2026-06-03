import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "rolldown";

const packageDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  input: resolve(packageDir, "src/index.ts"),
  external: [/^[^./]/],
  output: [
    {
      dir: resolve(packageDir, "dist"),
      format: "es",
      preserveModules: true,
      preserveModulesRoot: resolve(packageDir, "src"),
    },
    {
      dir: resolve(packageDir, "dist"),
      format: "cjs",
      preserveModules: true,
      preserveModulesRoot: resolve(packageDir, "src"),
      entryFileNames: "[name].cjs",
      chunkFileNames: "[name].cjs",
    },
  ],
});
