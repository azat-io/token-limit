import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import path from 'node:path'

export default defineConfig({
  build: {
    lib: {
      entry: [
        path.resolve(import.meta.dirname, 'cli/index.ts'),
        path.resolve(import.meta.dirname, 'core/index.ts'),
      ],
      fileName: (_format, entryName) => `${entryName}.js`,
      name: 'token-limit',
      formats: ['es'],
    },
    rollupOptions: {
      output: {
        preserveModules: true,
        exports: 'auto',
      },
      external: (id: string) => !id.startsWith('.') && !path.isAbsolute(id),
    },
    minify: false,
  },
  plugins: [
    dts({
      include: [
        path.join(import.meta.dirname, 'cli'),
        path.join(import.meta.dirname, 'constants'),
        path.join(import.meta.dirname, 'core'),
        path.join(import.meta.dirname, 'reporters'),
        path.join(import.meta.dirname, 'runners'),
        path.join(import.meta.dirname, 'types'),
      ],
      insertTypesEntry: true,
      copyDtsFiles: true,
      strictOutput: true,
    }),
  ],
})
