#!/usr/bin/env node

import { build } from "tsup";

build({
  clean: true,
  entry: ["src/index.ts"],
  target: "node14",
  format: "esm",
  dts: true,
  minify: true,
  sourcemap: true,

  // https://github.com/evanw/esbuild/pull/2067
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
}).catch(() => process.exit(1));
