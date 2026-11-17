// Monta a extensão em build/ (a pasta que se carrega no Chrome):
// extension/ + ícones + src/content.ts e src/popup.ts empacotados.
//   node scripts/build.ts            monta uma vez
//   node scripts/build.ts --watch    remonta a cada mudança
//   node scripts/build.ts --site     monta também o app.js da página (dist/site)
import fs from "node:fs";
import path from "node:path";
import * as esbuild from "esbuild";

const root = path.join(import.meta.dirname, "..");
const out = path.join(root, "build");
const watch = process.argv.includes("--watch");
const site = process.argv.includes("--site");

const ICONS = ["icon-16.png", "icon-32.png", "icon-48.png", "icon-128.png", "pix-qr.svg"];

function copyStatic() {
  fs.mkdirSync(path.join(out, "icons"), { recursive: true });
  fs.cpSync(path.join(root, "extension"), out, { recursive: true });
  for (const icon of ICONS) fs.copyFileSync(path.join(root, "icons", icon), path.join(out, "icons", icon));
}

// Sem minificar: o código que vai para a loja continua legível para a revisão.
const common: esbuild.BuildOptions = {
  bundle: true,
  format: "iife",
  target: "chrome120",
  charset: "utf8",
  legalComments: "none",
  logLevel: "info"
};

const extension: esbuild.BuildOptions = {
  ...common,
  entryPoints: { content: "src/content.ts", popup: "src/popup.ts" },
  outdir: out,
  absWorkingDir: root
};

fs.rmSync(out, { recursive: true, force: true });
copyStatic();

if (watch) {
  // Os arquivos de extension/ também mudam: copia de novo a cada rebuild.
  const ctx = await esbuild.context({
    ...extension,
    plugins: [{ name: "static", setup: (b) => b.onEnd(copyStatic) }]
  });
  await ctx.watch();
} else {
  await esbuild.build(extension);
  if (site) {
    await esbuild.build({ ...common, entryPoints: ["site/app.ts"], outfile: "dist/site/app.js", absWorkingDir: root });
  }
}
