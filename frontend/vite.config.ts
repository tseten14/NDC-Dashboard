import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tailwindConfigPath = path.resolve(__dirname, "config/tailwind.config.ts");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, ".."), "");
  const apiPort = env.API_PORT || "8787";

  return {
  root: __dirname,
  envDir: path.resolve(__dirname, ".."),
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
    },
  },
  // `npm run preview` serves the real production build. It needs the same /api
  // proxy as the dev server, otherwise every data request 404s and the preview
  // renders empty — which makes it useless for checking a build before deploy.
  preview: {
    port: 8080,
    proxy: {
      "/api": {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
  build: {
    // Leave chunk splitting almost entirely to Rollup.
    //
    // Rollup already does the important part: the heavy libraries (map,
    // diagrams, PDF, charts) are reachable only through dynamic imports, so each
    // lands in its own chunk and none is downloaded until a screen needs it.
    //
    // Hand-written vendor groups were tried and measured on a throttled
    // connection (1.6 Mbps, 4x CPU slowdown), which is the situation that
    // actually matters for this app's users. They did not help:
    //
    //   no manual chunks          first paint  600ms   fully loaded 3464ms
    //   + react/query/ui groups   first paint  824ms   fully loaded 3405ms
    //   + icons only (kept)       first paint  668ms   fully loaded 3247ms
    //
    // Splitting the entry chunk delayed first paint by ~220ms for no meaningful
    // gain — the browser has to fetch several files before it can start, and
    // over a high-latency link that costs more than it saves. Only the icon
    // grouping earned its place.
    //
    // Two traps if you change this:
    //  - Naming a chunk forces every module in it into one file, so grouping a
    //    library that was loading lazily makes it eager. Grouping recharts this
    //    way pushed the initial download from 176 to 325 kB gzipped.
    //  - Bundle size alone will mislead you. Measure first paint and fully
    //    loaded on a throttled connection before and after.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          // Every icon is a separate module, and because different lazy screens
          // use different icons Rollup emitted ~39 chunks under 2 kB. Each one
          // is a round trip costing far more than the bytes it carries. Bundling
          // them took the dashboard from 41 requests to 26.
          if (/[\\/]node_modules[\\/]lucide-react[\\/]/.test(id)) {
            return "vendor-icons";
          }
        },
      },
    },
    // The map and diagram chunks are legitimately large and load on demand only,
    // so the default 500 kB warning is noise here rather than a signal.
    chunkSizeWarningLimit: 1200,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  css: {
    postcss: {
      plugins: [tailwindcss({ config: tailwindConfigPath }), autoprefixer()],
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "../backend/services/**/*.test.js",
      "../shared/**/*.test.js",
    ],
  },
};
});
