import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        // Resolve the tsconfig `paths` mapping (e.g. `utils/config.js`) so tests
        // import source modules the same way the swc/tsc build does.
        tsconfigPaths: true,
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
