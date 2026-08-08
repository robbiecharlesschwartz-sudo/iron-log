import esbuild from "esbuild";

const watch = process.argv.includes("--watch");

const options = {
  entryPoints: ["src/main.jsx"],
  bundle: true,
  minify: !watch,
  sourcemap: watch,
  outfile: "app.js",
  loader: { ".js": "jsx", ".jsx": "jsx" },
  jsx: "automatic",
  logLevel: "info",
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log("watching for changes...");
} else {
  await esbuild.build(options);
}
