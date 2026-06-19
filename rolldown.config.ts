import { isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "rolldown";

const packageDir = fileURLToPath(new URL(".", import.meta.url));
const sourceDir = resolve(packageDir, "src");
const distDir = resolve(packageDir, "dist");

function isBareModuleId(id: string) {
  return !(id.startsWith(".") || id.startsWith("/") || isAbsolute(id));
}

export default defineConfig({
  input: resolve(sourceDir, "index.ts"),
  external: isBareModuleId,
  output: [
    {
      dir: distDir,
      format: "es",
      preserveModules: true,
      preserveModulesRoot: sourceDir,
    },
    {
      dir: distDir,
      entryFileNames: "[name].cjs",
      format: "cjs",
      preserveModules: true,
      preserveModulesRoot: sourceDir,
    },
  ],
});
