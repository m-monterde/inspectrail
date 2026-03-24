# Continuar el proyecto en otro equipo

## 1. Clonar el repo
```bash
git clone https://github.com/m-monterde/inspectrail.git
cd inspectrail
```

## 2. Instalar Claude Code
Si no lo tienes, instálalo y abre el proyecto — el `CLAUDE.md` le da todo el contexto automáticamente.

## 3. Requisitos
- Node.js 22+ (`nvm install 22`)
- Docker (para la BD local)
- `gh` CLI con login en `m-monterde`

## 4. Levantar la BD
```bash
docker run -d --name inspectrail-db -p 5432:5432 \
  -e POSTGRES_DB=inspectrail -e POSTGRES_USER=inspectrail \
  -e POSTGRES_PASSWORD=inspectrail_dev timescale/timescaledb-ha:pg16
```

## 5. Aplicar migraciones y seed
```bash
cd services/api
npm install
echo 'DATABASE_URL="postgresql://inspectrail:inspectrail_dev@localhost:5432/inspectrail?schema=public"' > .env
npx prisma migrate deploy
npx prisma generate
npx tsx prisma/seed.ts
```

## 6. Continuar con Claude
Decirle: **"Continúa con el desarrollo de la API GraphQL"** — el CLAUDE.md + las memorias le darán todo el contexto.

> Borrar este archivo cuando se retome el desarrollo.
