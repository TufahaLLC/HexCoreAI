module.exports = [
"[turbopack-node]/transforms/postcss.ts { CONFIG => \"[project]/postcss.config.mjs [postcss] (ecmascript)\" } [postcss] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "build/chunks/node_modules_postcss_lib_abb80249._.js",
  "build/chunks/node_modules_enhanced-resolve_lib_f164f63f._.js",
  "build/chunks/node_modules_jiti_30d07a2a._.js",
  "build/chunks/node_modules_tailwindcss_dist_c262136a._.js",
  "build/chunks/node_modules_21308e14._.js",
  "build/chunks/[root-of-the-server]__25d892ef._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[turbopack-node]/transforms/postcss.ts { CONFIG => \"[project]/postcss.config.mjs [postcss] (ecmascript)\" } [postcss] (ecmascript)");
    });
});
}),
];