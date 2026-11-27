// Vercel runs the API as one serverless function: vercel.json sends every path here.
// dist/serverless.bundle.cjs is the compiled NestJS app bundled into CommonJS by
// scripts/bundle-serverless.mjs (Vercel's runtime cannot require() NestJS 12's ES modules).
module.exports = require('../dist/serverless.bundle.cjs').default;
