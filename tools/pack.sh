#!/usr/bin/env bash
# Gera o .zip para as lojas (Chrome Web Store, Edge Add-ons) em dist/.
# Só entra o que a extensão usa: nada de testes, docs ou ferramentas.
set -euo pipefail
cd "$(dirname "$0")/.."

node test/run.js >/dev/null || { echo "Os testes falharam: rode node test/run.js"; exit 1; }

VERSION=$(node -p 'require("./manifest.json").version')
OUT="dist/fanficblock-$VERSION.zip"
mkdir -p dist
rm -f "$OUT"
zip -q -X "$OUT" \
  manifest.json \
  defaults.js extract.js classify.js stats.js query.js support.js content.js content.css \
  popup.html popup.css popup.js \
  icons/icon-16.png icons/icon-32.png icons/icon-48.png icons/icon-128.png icons/pix-qr.svg
unzip -l "$OUT"
