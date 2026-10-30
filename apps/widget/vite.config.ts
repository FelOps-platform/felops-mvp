import { defineConfig } from 'vite'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'preact',
  },
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'FelopsWidget',
      formats: ['iife'],
      fileName: () => 'widget.js',
    },
    outDir: '../web/public',
    emptyOutDir: false,
    minify: 'esbuild',
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
})
