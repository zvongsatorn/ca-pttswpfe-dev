/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("node:path");

const globalsCss = path.join(__dirname, "src/app/globals.css");

module.exports = function ensurePostcssFrom() {
  return {
    postcssPlugin: "ensure-postcss-from",
    Once(_root, { result }) {
      if (!result.opts.from || path.extname(result.opts.from) !== ".css") {
        result.opts.from = globalsCss;
      }
    },
  };
};

module.exports.postcss = true;
