import { defineConfig } from "vitest/config";

// Les tests comprennent les chemins « @/… » du projet, comme Next.
export default defineConfig({ resolve: { tsconfigPaths: true } });
