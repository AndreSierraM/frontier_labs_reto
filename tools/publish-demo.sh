#!/usr/bin/env bash
# Publica el render más reciente de demo-video/out/ como public/demo.mp4,
# para que quede accesible en el sitio (p. ej. https://…/demo.mp4).
#
# Uso:
#   tools/publish-demo.sh            # copia el demo-final-*.mp4 más nuevo
#   tools/publish-demo.sh <archivo>  # copia un archivo concreto
set -euo pipefail
cd "$(dirname "$0")/.."

if [ "${1:-}" != "" ]; then
  src="$1"
else
  src="$(ls -t demo-video/out/demo-final-*.mp4 2>/dev/null | head -1 || true)"
fi

if [ -z "${src:-}" ] || [ ! -f "$src" ]; then
  echo "No hay render en demo-video/out/. Genera uno con:"
  echo "  cd demo-video && npm i && npx remotion render la-caja-negra-demo out/demo.mp4"
  exit 1
fi

cp "$src" public/demo.mp4
echo "Publicado: $src -> public/demo.mp4 ($(du -h public/demo.mp4 | cut -f1))"
