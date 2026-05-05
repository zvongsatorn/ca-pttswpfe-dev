import { fileURLToPath } from "node:url";

const ensurePostcssFromPlugin = fileURLToPath(
  new URL("./postcss-ensure-from.cjs", import.meta.url)
);

const config = {
  plugins: [
    [ensurePostcssFromPlugin, {}],
    ["@tailwindcss/postcss", {}],
  ],
};

export default config;
