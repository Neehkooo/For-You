import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Short links live at /l/<id>, so assets must load from the site root.
// SINGLE_FILE=1 is only used to build the one-file preview.
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  build: {
    assetsInlineLimit: process.env.SINGLE_FILE ? 100_000_000 : 4096,
    rollupOptions: { output: { inlineDynamicImports: !!process.env.SINGLE_FILE } },
  },
});
