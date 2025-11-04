/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/lib/env.ts";

/** @type {import("next").NextConfig} */
const config = {
  reactCompiler: true,
};

export default config;
