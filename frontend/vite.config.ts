import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    proxy: {
      "/data": "http://localhost:8001",
      "/users": "http://localhost:8001",
      "/history": "http://localhost:8001",
      "/annotations": "http://localhost:8001",
      "/tags": "http://localhost:8001",
      "/translations": "http://localhost:8001",
    },
  },
});