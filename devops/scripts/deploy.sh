#!/bin/bash
# Despliegue manual de InspectRail en VPS
# Uso: ./deploy.sh <IP_VPS> [version]

set -euo pipefail

VPS_HOST="${1:?Uso: ./deploy.sh <IP_VPS> [version]}"
VPS_USER="${VPS_USER:-deploy}"
VERSION="${2:-latest}"

echo "══════════════════════════════════════════"
echo "  InspectRail — Deploy v${VERSION}"
echo "  Target: ${VPS_USER}@${VPS_HOST}"
echo "══════════════════════════════════════════"

# ── 1. Copiar docker-compose actualizado ──
echo "→ Copiando configuración..."
scp devops/docker/docker-compose.yml "${VPS_USER}@${VPS_HOST}:/opt/inspectrail/"
scp devops/docker/docker-compose.prod.yml "${VPS_USER}@${VPS_HOST}:/opt/inspectrail/"
scp devops/docker/init-db.sql "${VPS_USER}@${VPS_HOST}:/opt/inspectrail/"

# ── 2. Desplegar ──
echo "→ Desplegando..."
ssh "${VPS_USER}@${VPS_HOST}" << EOF
  cd /opt/inspectrail
  export VERSION=${VERSION}
  docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
  docker image prune -f
  echo ""
  echo "→ Estado de los servicios:"
  docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
EOF

echo ""
echo "══════════════════════════════════════════"
echo "  Deploy completado."
echo "══════════════════════════════════════════"
