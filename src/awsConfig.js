import exampleConfig from "./aws-exports.example";

// Load ./aws-exports.js if it exists, without failing the build when it doesn't.
// require.context resolves at build time and is simply empty when the file is missing.
const ctx = require.context("./", false, /^\.\/aws-exports\.js$/);
const keys = ctx.keys();

const awsconfig = keys.length ? ctx(keys[0]).default : exampleConfig;

export default awsconfig;
