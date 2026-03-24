-- Inicialización de extensiones PostgreSQL
-- Se ejecuta automáticamente al crear el contenedor por primera vez

CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verificación
DO $$
BEGIN
  RAISE NOTICE 'TimescaleDB version: %', (SELECT extversion FROM pg_extension WHERE extname = 'timescaledb');
  RAISE NOTICE 'PostGIS version: %', (SELECT extversion FROM pg_extension WHERE extname = 'postgis');
END $$;
