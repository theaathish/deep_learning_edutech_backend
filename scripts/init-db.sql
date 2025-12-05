-- PostgreSQL initialization script
-- Runs on first container startup

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set timezone
SET timezone = 'UTC';

-- Create indexes for full-text search (optional, for future search feature)
-- These will be created by Prisma migrations, but good to have here as backup

-- Performance tuning for production
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET log_statement = 'none';
ALTER SYSTEM SET log_duration = 'off';
ALTER SYSTEM SET log_min_messages = 'warning';

-- Connection pooling settings
ALTER SYSTEM SET max_connections = 50;
ALTER SYSTEM SET superuser_reserved_connections = 3;

-- Memory settings (optimized for 512MB PostgreSQL container)
ALTER SYSTEM SET shared_buffers = '128MB';
ALTER SYSTEM SET effective_cache_size = '256MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET work_mem = '4MB';

-- WAL settings for data safety
ALTER SYSTEM SET wal_level = 'replica';
ALTER SYSTEM SET max_wal_size = '2GB';
ALTER SYSTEM SET min_wal_size = '1GB';
ALTER SYSTEM SET checkpoint_completion_target = '0.9';

-- Autovacuum settings
ALTER SYSTEM SET autovacuum = 'on';
ALTER SYSTEM SET autovacuum_max_workers = 2;
ALTER SYSTEM SET autovacuum_naptime = '1min';

-- Security
ALTER SYSTEM SET password_encryption = 'scram-sha-256';

SELECT pg_reload_conf();
