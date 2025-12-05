#!/bin/bash
# Database clear data script - Clears all data but keeps schema intact
# WARNING: This will delete ALL DATA but preserve table structures!

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

echo -e "${YELLOW}⚠️  WARNING: This will DELETE ALL DATA from tables but keep the schema!${NC}"
echo -e "${YELLOW}Database: $DB_NAME on $DB_HOST:$DB_PORT${NC}"
echo ""
read -p "Are you sure you want to clear all data? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${GREEN}Operation cancelled.${NC}"
    exit 0
fi

echo -e "${YELLOW}Starting data clear operation...${NC}"

# Export password for psql
export PGPASSWORD="$DB_PASSWORD"

# Function to truncate all tables and reset sequences
clear_all_data() {
    echo "Truncating all tables and resetting sequences..."

    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        DO \$\$
        DECLARE
            r RECORD;
        BEGIN
            -- Disable triggers temporarily to speed up truncation
            -- Truncate all tables (but keep the schema)
            FOR r IN (
                SELECT tablename
                FROM pg_tables
                WHERE schemaname = 'public'
                AND tablename NOT LIKE 'pg_%'
                AND tablename NOT LIKE '_prisma_%'
            ) LOOP
                EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
            END LOOP;

            RAISE NOTICE 'All table data cleared and sequences reset successfully';
        END \$\$;
    "
}

# Function to show table counts after clearing
show_table_status() {
    echo "Checking table status..."

    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT
            schemaname,
            relname,
            n_tup_ins AS rows_inserted,
            n_tup_upd AS rows_updated,
            n_tup_del AS rows_deleted,
            n_live_tup AS live_rows,
            n_dead_tup AS dead_rows
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY relname;
    "
}

# Main execution
echo "Connecting to database..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" > /dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database connection successful${NC}"

    # Show current data before clearing
    echo "Current table row counts:"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT
            relname,
            n_tup_ins AS total_rows
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        AND n_tup_ins > 0
        ORDER BY n_tup_ins DESC;
    "

    # Clear all data
    clear_all_data

    # Show status after clearing
    echo "Table status after clearing:"
    show_table_status

    echo -e "${GREEN}✓ All data cleared successfully!${NC}"
    echo -e "${GREEN}✓ Tables truncated and sequences reset to 1.${NC}"
    echo -e "${GREEN}✓ Schema structure preserved.${NC}"
    echo ""
    echo -e "${YELLOW}Note: To reseed with sample data, run:${NC}"
    echo "  cd backend && npm run seed"

else
    echo -e "${RED}✗ Database connection failed${NC}"
    echo "Please check your database credentials and ensure PostgreSQL is running."
    exit 1
fi

unset PGPASSWORD