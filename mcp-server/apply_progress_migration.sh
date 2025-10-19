#!/bin/bash

# Auto-Save Progress Tables Migration Script
# This script applies the progress_tables.sql migration to your database

echo "🚀 Auto-Save Progress Tables Migration"
echo "======================================"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Please create a .env file with your database connection string"
    echo "Example: DATABASE_URL=postgresql://user:password@localhost:5432/dbname"
    exit 1
fi

# Load environment variables
source .env

# Extract database connection details from DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL not found in .env file"
    exit 1
fi

echo "📋 Migration: sql/progress_tables.sql"
echo "🗄️  Database: $DATABASE_URL"
echo ""

# Parse DATABASE_URL to extract connection details
# Format: postgresql://user:password@host:port/dbname
DB_URL_REGEX="postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+)"

if [[ $DATABASE_URL =~ $DB_URL_REGEX ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASS="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
else
    echo "❌ Error: Invalid DATABASE_URL format"
    echo "Expected format: postgresql://user:password@host:port/dbname"
    exit 1
fi

echo "Connecting to database..."
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Confirm before proceeding
read -p "Do you want to proceed with the migration? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled."
    exit 0
fi

echo ""
echo "🔄 Applying migration..."

# Run the SQL migration
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f sql/progress_tables.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "Created tables:"
    echo "  • quiz_progress"
    echo "  • exam_progress"
    echo "  • assignment_progress"
    echo ""
    echo "Created function:"
    echo "  • cleanup_old_progress()"
    echo ""
    echo "🎉 Auto-save is now ready to use!"
else
    echo ""
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi
