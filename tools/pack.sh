#!/usr/bin/env bash
# Gera o .zip da extensão em dist/ (lojas e GitHub Releases): o conteúdo de
# build/, já empacotado. Nada de testes, docs, fontes TS ou ferramentas.
set -euo pipefail
cd "$(dirname "$0")/.."

npx tsc || { echo "O typecheck falhou: rode npm run typecheck"; exit 1; }
node test/run.ts >/dev/null || { echo "Os testes falharam: rode npm test"; exit 1; }
node scripts/build.ts

VERSION=$(node -p 'require("./extension/manifest.json").version')
OUT="$PWD/dist/fanficblock-$VERSION.zip"
mkdir -p dist
rm -f "$OUT"
(cd build && zip -q -X -r "$OUT" .)
unzip -l "$OUT"
