/**
 * Bundles the compiled API (dist/serverless.js) into one CommonJS file for Vercel.
 *
 * Why: NestJS 12 is published as ES modules only. Node 22+ can require() them, but Vercel's
 * function runtime cannot, so the deployed API failed with ERR_REQUIRE_ESM. Bundling turns every
 * ES module dependency into plain CommonJS. Run after `nest build`; `tsc` already emitted the
 * decorator metadata Nest needs, so esbuild only has to join the files.
 *
 * Kept outside the bundle (loaded from node_modules at runtime):
 * - native addons (sharp, bcrypt) and Prisma's runtime (it loads its query compiler itself)
 * - swagger-ui-dist, whose CSS/JS files are served from its folder
 * - optional NestJS packages that are not installed (Nest loads them only if present)
 */
import { build } from 'esbuild';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const keepExternal = [
  'sharp',
  'bcrypt',
  '@prisma/client',
  '@prisma/adapter-pg',
  'pg',
  'swagger-ui-dist',
];

/** Anything that cannot be resolved (optional peer packages) stays a runtime require. */
const optionalPackages = {
  name: 'optional-packages',
  setup(b) {
    b.onResolve({ filter: /^[^./]/ }, (args) => {
      try {
        require.resolve(args.path, { paths: [args.resolveDir] });
        return undefined;
      } catch {
        return { path: args.path, external: true };
      }
    });
  },
};

await build({
  entryPoints: ['dist/serverless.js'],
  outfile: 'dist/serverless.bundle.cjs',
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'cjs',
  // Nest uses class names for injection tokens and logs
  keepNames: true,
  external: keepExternal,
  plugins: [optionalPackages],
  // ES modules read import.meta; in the CommonJS bundle it comes from the bundle file itself
  banner: {
    js: "const __importMetaUrl = require('url').pathToFileURL(__filename).href;",
  },
  define: {
    'import.meta.url': '__importMetaUrl',
    'import.meta.dirname': '__dirname',
    'import.meta.filename': '__filename',
  },
  // the Swagger plugin repeats some keys in generated metadata; harmless, so only show errors
  logLevel: 'error',
});
console.log('dist/serverless.bundle.cjs ready');
