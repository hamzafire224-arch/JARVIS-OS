import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            include: ['src/**/*.ts'],
            exclude: ['src/**/*.d.ts', 'src/index.ts'],
        },
        testTimeout: 30000,
        hookTimeout: 30000,
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
            '@agent': resolve(__dirname, './src/agent'),
            '@providers': resolve(__dirname, './src/providers'),
            '@memory': resolve(__dirname, './src/memory'),
            '@tools': resolve(__dirname, './src/tools'),
            '@config': resolve(__dirname, './src/config'),
            '@utils': resolve(__dirname, './src/utils'),
        },
    },
});
