import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite serves the demo as the dev entry. The library itself lives in src/.
export default defineConfig({
  root: 'demo',
  plugins: [react()],
  server: { port: 5173, open: true },
  build: {
    outDir: '../dist-demo',
    emptyOutDir: true,
  },
});
