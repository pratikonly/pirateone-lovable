import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, "/");
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(normalizedId)) {
            return "vendor-react";
          }
          if (/\/node_modules\/(react-router|react-router-dom|@remix-run\/router)\//.test(normalizedId)) {
            return "vendor-router";
          }
          if (normalizedId.includes("/node_modules/@tanstack/react-query/")) {
            return "vendor-query";
          }
          if (normalizedId.includes("/node_modules/@radix-ui/")) {
            return "vendor-ui";
          }
          if (normalizedId.includes("/node_modules/@supabase/")) {
            return "vendor-supabase";
          }
        },
      },
    },
  },
}));
