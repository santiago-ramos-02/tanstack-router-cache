import { isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "rolldown";

const packageDir = fileURLToPath(new URL(".", import.meta.url));

function isBareModuleId(id: string) {
  return !(id.startsWith(".") || id.startsWith("/") || isAbsolute(id));
}

export default defineConfig({
  input: resolve(packageDir, "src/index.ts"),
  external: isBareModuleId,
  output: [
    {
      file: resolve(packageDir, "dist/index.js"),
      format: "es",
    },
    {
      file: resolve(packageDir, "dist/index.cjs"),
      format: "cjs",
    },
  ],
});
