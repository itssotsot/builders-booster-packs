import { build } from 'esbuild';
await build({ entryPoints: ['server/worker.js'], outfile: 'dist/server/index.js', bundle: true, format: 'esm', platform: 'browser', target: 'es2022', minify: true });
