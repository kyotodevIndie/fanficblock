#!/usr/bin/env bash
# Monta a página do projeto (GitHub Pages) em dist/site: site/ + o código da
# extensão que o detector e o gerador usam + imagens.
# Para ver: tools/build-site.sh && python3 -m http.server -d dist/site
set -euo pipefail
cd "$(dirname "$0")/.."

OUT=dist/site
rm -rf "$OUT"
mkdir -p "$OUT/icons" "$OUT/store/img"
cp site/* "$OUT/"
cp defaults.js extract.js classify.js stats.js query.js support.js "$OUT/"
cp icons/logo-256.png icons/icon-32.png icons/pix-qr.svg "$OUT/icons/"
cp store/img/painel-topo.png store/img/painel-stats.png "$OUT/store/img/"
cp store/screenshot-1.png "$OUT/store/"
touch "$OUT/.nojekyll"
echo "Página montada em $OUT"
