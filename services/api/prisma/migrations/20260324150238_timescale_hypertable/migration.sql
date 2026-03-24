-- Habilitar extensiones
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS postgis;

-- Convertir sensor_readings en hypertable de TimescaleDB
-- Particionada por tiempo con chunks de 1 día
SELECT create_hypertable(
  'sensor_readings',
  by_range('time', INTERVAL '1 day'),
  migrate_data => true
);

-- Habilitar compresión en sensor_readings (datos > 7 días se comprimen)
ALTER TABLE sensor_readings SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'journey_id',
  timescaledb.compress_orderby = 'time ASC'
);

SELECT add_compression_policy('sensor_readings', INTERVAL '7 days');

-- Crear función y trigger para pg_notify en alertas nuevas (ADR-006)
CREATE OR REPLACE FUNCTION notify_new_alert()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'new_alert',
    json_build_object(
      'id', NEW.id,
      'organization_id', NEW.organization_id,
      'journey_id', NEW.journey_id,
      'metric', NEW.metric,
      'severity', NEW.severity,
      'pk_start', NEW.pk_start,
      'pk_end', NEW.pk_end,
      'measured_value', NEW.measured_value,
      'threshold_value', NEW.threshold_value,
      'deviation', NEW.deviation,
      'detected_at', NEW.detected_at
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER alert_notify_trigger
  AFTER INSERT ON alerts
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_alert();
