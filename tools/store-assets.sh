#!/usr/bin/env bash
# Gera as imagens das lojas (store/*.png) a partir de store/assets.html.
# Precisa de um Chrome/Chromium headless: CHROME=/caminho/do/chrome tools/store-assets.sh
set -euo pipefail
cd "$(dirname "$0")/.."

CHROME="${CHROME:-$(command -v google-chrome || command -v chromium || command -v chromium-browser)}"
PORT=8799
python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER' EXIT
sleep 1

shot() { # nome, slide, largura, altura
  "$CHROME" --headless --no-sandbox --hide-scrollbars --window-size="$3,$4" --virtual-time-budget=3000 \
    --screenshot="store/$1.png" "http://127.0.0.1:$PORT/store/assets.html?s=$2" 2>/dev/null
}

shot screenshot-1 1 1280 800
shot screenshot-2 2 1280 800
shot screenshot-3 3 1280 800
shot screenshot-4 4 1280 800
shot promo-small tile 440 280
shot promo-marquee marquee 1400 560
ls -1 store/*.png
