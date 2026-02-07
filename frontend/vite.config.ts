import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5173,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Let Vite handle chunking automatically - this ensures React loads before dependencies
    // Manual chunking was causing "Cannot read properties of undefined" errors
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Use esbuild for minification
    minify: 'esbuild',
    // Source maps disabled for production
    sourcemap: false,
  },
}));
