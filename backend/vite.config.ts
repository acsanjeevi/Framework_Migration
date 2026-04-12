import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'node20',
    ssr: true,
    rollupOptions: {
      input: 'src/server.ts',
    },
  },
});
