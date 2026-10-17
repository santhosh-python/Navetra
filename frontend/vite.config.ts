import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const frontendRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, frontendRoot, "");
  const apiProxyTarget = env.VITE_DEV_API_TARGET;

  return {
    root: frontendRoot,
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      allowedHosts: [".e2b.app"],
      ...(apiProxyTarget
        ? {
            proxy: {
              "/api": {
                target: apiProxyTarget,
                changeOrigin: true,
              },
            },
          }
        : {}),
    },
    preview: {
      host: "0.0.0.0",
      allowedHosts: [".e2b.app"],
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
  };
});
