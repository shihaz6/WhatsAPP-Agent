import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served by the Node server at /admin. In dev (npm run web:dev) API calls go to that server.
export default defineConfig({
  base: "/admin/",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/admin/api": "http://localhost:3000" },
  },
  build: { outDir: "dist", emptyOutDir: true },
});
