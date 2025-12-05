#!/bin/bash
# Database clear script - Completely clears all data from the database
# WARNING: This will delete ALL data permanently!

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-edutech}
DB_USER=${DB_USER:-edutech_user}
DB_PASSWORD=${DB_PASSWORD:-qwerty@12345}

echo -e "${YELLOW}⚠️  WARNING: This will DELETE ALL DATA from the database!${NC}"
echo -e "${YELLOW}Database: $DB_NAME on $DB_HOST:$DB_PORT${NC}"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${GREEN}Operation cancelled.${NC}"
    exit 0
fi

echo -e "${YELLOW}Starting database clear operation...${NC}"

# Export password for psql
export PGPASSWORD="$DB_PASSWORD"

# Function to drop all tables
drop_all_tables() {
    echo "Dropping all tables..."

    # Get all table names and drop them
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        DO \$\$
        DECLARE
            r RECORD;
        BEGIN
            -- Drop all tables in the current schema
            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
            END LOOP;

            -- Drop all sequences
            FOR r IN (SELECT sequencename FROM pg_sequences WHERE schemaname = 'public') LOOP
                EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequencename) || ' CASCADE';
            END LOOP;

            -- Drop all views
            FOR r IN (SELECT viewname FROM pg_views WHERE schemaname = 'public') LOOP
                EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(r.viewname) || ' CASCADE';
            END LOOP;

            -- Drop all materialized views
            FOR r IN (SELECT matviewname FROM pg_matviews WHERE schemaname = 'public') LOOP
                EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS ' || quote_ident(r.matviewname) || ' CASCADE';
            END LOOP;

            -- Drop all functions
            FOR r IN (SELECT proname FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) LOOP
                EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.proname) || ' CASCADE';
            END LOOP;

            RAISE NOTICE 'All database objects dropped successfully';
        END \$\$;
    "
}

# Function to reset sequences
reset_sequences() {
    echo "Resetting sequences..."

    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        -- Reset all sequences to start from 1
        SELECT setval(oid, 1, false)
        FROM pg_class
        WHERE relkind = 'S' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    "
}

# Main execution
echo "Connecting to database..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" > /dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database connection successful${NC}"

    # Drop all tables and objects
    drop_all_tables

    # Reset sequences
    reset_sequences

    echo -e "${GREEN}✓ Database cleared successfully!${NC}"
    echo -e "${GREEN}✓ All tables, sequences, views, and functions have been dropped.${NC}"
    echo ""
    echo -e "${YELLOW}Note: To recreate the schema, run:${NC}"
    echo "  cd backend && npx prisma db push"
    echo "  # or"
    echo "  cd backend && npx prisma migrate deploy"

else
    echo -e "${RED}✗ Database connection failed${NC}"
    echo "Please check your database credentials and ensure PostgreSQL is running."
    exit 1
fi

unset PGPASSWORD