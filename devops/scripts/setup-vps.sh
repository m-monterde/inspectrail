#!/bin/bash
# Setup inicial del VPS para InspectRail
# Ejecutar como root en un Ubuntu 22.04/24.04 limpio
# Uso: curl -sSL <url-de-este-script> | bash

set -euo pipefail

echo "══════════════════════════════════════════"
echo "  InspectRail — Setup VPS"
echo "══════════════════════════════════════════"

# ── 1. Actualizar sistema ──
echo "→ Actualizando sistema..."
apt-get update && apt-get upgrade -y

# ── 2. Instalar Docker ──
echo "→ Instalando Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "  Docker instalado: $(docker --version)"
else
    echo "  Docker ya instalado: $(docker --version)"
fi

# ── 3. Instalar Docker Compose plugin ──
echo "→ Verificando Docker Compose..."
docker compose version

# ── 4. Crear usuario para despliegue ──
echo "→ Creando usuario 'deploy'..."
if ! id "deploy" &>/dev/null; then
    useradd -m -s /bin/bash -G docker deploy
    mkdir -p /home/deploy/.ssh
    cp /root/.ssh/authorized_keys /home/deploy/.ssh/
    chown -R deploy:deploy /home/deploy/.ssh
    chmod 700 /home/deploy/.ssh
    chmod 600 /home/deploy/.ssh/authorized_keys
    echo "  Usuario 'deploy' creado y añadido al grupo docker"
else
    echo "  Usuario 'deploy' ya existe"
fi

# ── 5. Crear directorio de la aplicación ──
echo "→ Creando directorio de aplicación..."
mkdir -p /opt/inspectrail
chown deploy:deploy /opt/inspectrail

# ── 6. Firewall básico ──
echo "→ Configurando firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 22/tcp    # SSH
    ufw allow 80/tcp    # HTTP
    ufw allow 443/tcp   # HTTPS
    ufw --force enable
    echo "  Firewall configurado (SSH, HTTP, HTTPS)"
fi

# ── 7. Login en GitHub Container Registry ──
echo ""
echo "══════════════════════════════════════════"
echo "  Setup completado."
echo ""
echo "  Pasos siguientes:"
echo "  1. Configura los secrets en GitHub:"
echo "     VPS_HOST = <IP del VPS>"
echo "     VPS_USER = deploy"
echo "     VPS_SSH_KEY = <clave privada SSH>"
echo ""
echo "  2. Copia los docker-compose al VPS:"
echo "     scp devops/docker/docker-compose.yml deploy@<IP>:/opt/inspectrail/"
echo "     scp devops/docker/docker-compose.prod.yml deploy@<IP>:/opt/inspectrail/"
echo "     scp devops/docker/.env.prod deploy@<IP>:/opt/inspectrail/.env"
echo ""
echo "  3. En el VPS, haz login en ghcr.io:"
echo "     docker login ghcr.io -u m-monterde"
echo ""
echo "  4. Primer despliegue:"
echo "     cd /opt/inspectrail"
echo "     docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d"
echo "══════════════════════════════════════════"
