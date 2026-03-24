-- CreateEnum
CREATE TYPE "DeploymentMode" AS ENUM ('saas', 'on_premise');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('connected', 'disconnected', 'error');

-- CreateEnum
CREATE TYPE "JourneyStatus" AS ENUM ('in_progress', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('accel_vertical', 'accel_lateral', 'accel_longitudinal', 'leveling', 'alignment', 'twist', 'gauge', 'speed');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('warning', 'alert', 'critical');

-- CreateTable
CREATE TABLE "organizations" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "deployment_mode" "DeploymentMode" NOT NULL DEFAULT 'saas',
    "config" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,
    "scope_type" TEXT,
    "scope_id" INTEGER,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_systems" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sensors_config" JSONB,
    "api_key" TEXT NOT NULL,
    "api_secret_hash" TEXT NOT NULL,
    "connection_status" "ConnectionStatus" NOT NULL DEFAULT 'disconnected',
    "last_seen_at" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspection_systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journeys" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "system_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "status" "JourneyStatus" NOT NULL DEFAULT 'in_progress',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thresholds" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "metric" "MetricType" NOT NULL,
    "warning_min" DOUBLE PRECISION NOT NULL,
    "warning_max" DOUBLE PRECISION NOT NULL,
    "alert_min" DOUBLE PRECISION NOT NULL,
    "alert_max" DOUBLE PRECISION NOT NULL,
    "critical_min" DOUBLE PRECISION NOT NULL,
    "critical_max" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "thresholds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "journey_id" INTEGER NOT NULL,
    "metric" "MetricType" NOT NULL,
    "severity" "Severity" NOT NULL,
    "pk_start" DOUBLE PRECISION NOT NULL,
    "pk_end" DOUBLE PRECISION NOT NULL,
    "lat_start" DOUBLE PRECISION,
    "lon_start" DOUBLE PRECISION,
    "lat_end" DOUBLE PRECISION,
    "lon_end" DOUBLE PRECISION,
    "measured_value" DOUBLE PRECISION NOT NULL,
    "threshold_value" DOUBLE PRECISION NOT NULL,
    "deviation" DOUBLE PRECISION NOT NULL,
    "detected_at" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensor_readings" (
    "time" TIMESTAMPTZ NOT NULL,
    "journey_id" INTEGER NOT NULL,
    "pk" DOUBLE PRECISION NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "accel_vertical" DOUBLE PRECISION,
    "accel_lateral" DOUBLE PRECISION,
    "accel_longitudinal" DOUBLE PRECISION,
    "leveling" DOUBLE PRECISION,
    "alignment" DOUBLE PRECISION,
    "twist" DOUBLE PRECISION,
    "gauge" DOUBLE PRECISION,

    CONSTRAINT "sensor_readings_pkey" PRIMARY KEY ("time","journey_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_code_key" ON "organizations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_systems_code_key" ON "inspection_systems"("code");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_systems_api_key_key" ON "inspection_systems"("api_key");

-- CreateIndex
CREATE UNIQUE INDEX "thresholds_organization_id_metric_key" ON "thresholds"("organization_id", "metric");

-- CreateIndex
CREATE INDEX "alerts_organization_id_severity_idx" ON "alerts"("organization_id", "severity");

-- CreateIndex
CREATE INDEX "alerts_journey_id_idx" ON "alerts"("journey_id");

-- CreateIndex
CREATE INDEX "alerts_detected_at_idx" ON "alerts"("detected_at");

-- CreateIndex
CREATE INDEX "sensor_readings_journey_id_pk_idx" ON "sensor_readings"("journey_id", "pk");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_systems" ADD CONSTRAINT "inspection_systems_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "inspection_systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thresholds" ADD CONSTRAINT "thresholds_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
