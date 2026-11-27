// Vercel runs the API as one serverless function: vercel.json sends every path here.
// dist/ is the compiled NestJS app from `npm run build` (see src/serverless.ts).
module.exports = require('../dist/serverless.js').default;
