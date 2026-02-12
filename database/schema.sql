-- Database Schema for Service Status Checker
-- Based on data analysis of:
-- - data/services.json
-- - data/logs/
-- - data/incidents_bu/
-- - data/notifications.json
-- - data/stats.json

-- Ensure uat schema exists and is used
CREATE SCHEMA IF NOT EXISTS uat;
SET search_path TO uat;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Services Table
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- e.g., 'http', 'ping', 'oracle', 'postgres'
    url TEXT NOT NULL, -- Stored as encrypted string or raw URL
    payload TEXT,
    "interval" INTEGER NOT NULL DEFAULT 60, -- Interval in seconds
    timeout INTEGER NOT NULL DEFAULT 5000, -- Timeout in milliseconds
    latency_threshold INTEGER, -- Threshold in milliseconds for degraded status
    is_public BOOLEAN DEFAULT true,
    show_target BOOLEAN DEFAULT false,
    allow_unauthorized BOOLEAN DEFAULT false,
    auth_type VARCHAR(50) DEFAULT 'none',
    auth_token TEXT,
    order_index INTEGER DEFAULT 0, -- Renamed from 'order' to avoid keyword conflict
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for ordering services
CREATE INDEX IF NOT EXISTS idx_services_order ON services(order_index);

-- 2. Logs Table (Stores check results)
CREATE TABLE IF NOT EXISTS logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL, -- 'UP', 'DOWN', 'DEGRADED'
    latency INTEGER, -- Latency in milliseconds
    message TEXT,
    status_code INTEGER
);

-- Index for querying logs by service and time
CREATE INDEX IF NOT EXISTS idx_logs_service_timestamp ON logs(service_id, "timestamp" DESC);

-- 3. Incidents Table (Stores incidents/outages)
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE, -- Null if incident is ongoing
    status VARCHAR(50) NOT NULL, -- 'DOWN', 'DEGRADED'
    description TEXT,
    duration INTEGER -- Duration in seconds (can be calculated, but stored for convenience)
);

-- Index for active incidents
CREATE INDEX IF NOT EXISTS idx_incidents_active ON incidents(service_id) WHERE end_time IS NULL;

-- 4. Notifications Table (Stores history of notifications)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    "type" VARCHAR(50) NOT NULL, -- 'UP', 'DOWN'
    message TEXT NOT NULL,
    "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT false
);

-- Index for unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(is_read) WHERE is_read = false;

-- 5. Daily Stats Table (Aggregated daily statistics)
CREATE TABLE IF NOT EXISTS daily_stats (
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    up_count INTEGER DEFAULT 0,
    down_count INTEGER DEFAULT 0,
    degraded_count INTEGER DEFAULT 0,
    total_latency BIGINT DEFAULT 0,
    total_count INTEGER DEFAULT 0,
    PRIMARY KEY (service_id, date)
);
