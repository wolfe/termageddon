import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import swc from 'unplugin-swc';
import { swcAngularUnpluginOptions } from '@jscutlery/swc-angular';

export default defineConfig({
  plugins: [
    // Use SWC with Angular preset to preserve decorator metadata
    swc.vite(swcAngularUnpluginOptions()),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    // Run tests sequentially to avoid TestBed state conflicts
    threads: false,
    isolate: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test-setup.ts',
        '**/*.spec.ts',
        '**/*.d.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(process.cwd(), './src'),
    },
  },
});
