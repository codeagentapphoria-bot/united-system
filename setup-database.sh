#!/bin/bash
# Database Setup Script for United Systems
# Run this script to set up the local PostgreSQL database

set -e

echo "🚀 Setting up United Systems Database..."

# Start PostgreSQL service
echo "📡 Starting PostgreSQL service..."
sudo systemctl start postgresql

# Wait for service to be ready
sleep 2

# Create database as postgres user
echo "🗄️  Creating united_systems database..."
sudo -u postgres createdb united_systems

# Install required extensions
echo "🔧 Installing PostGIS and pg_trgm extensions..."
sudo -u postgres psql -d united_systems -c "CREATE EXTENSION IF NOT EXISTS postgis;"
sudo -u postgres psql -d united_systems -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"

# Import schema
echo "📋 Importing database schema..."
sudo -u postgres psql -d united_systems -f united-database/schema.sql

# Run base seeds
echo "🌱 Running base seeds..."
sudo -u postgres psql -d united_systems -f united-database/seed.sql

# Run BIMS-specific seeds
echo "🏛️  Running BIMS seeds..."
sudo -u postgres psql -d united_systems -f united-database/seed_bims.sql

# Run migrations
echo "🔄 Running migrations..."
sudo -u postgres psql -d united_systems -f united-database/migrations/05_add-live-in-civil-status.sql
sudo -u postgres psql -d united_systems -f united-database/migrations/06_add-requests-full-name.sql
sudo -u postgres psql -d united_systems -f united-database/migrations/07_perf_indexes_001.sql
sudo -u postgres psql -d united_systems -f united-database/migrations/08_performance_indexes.sql

echo "✅ Database setup complete!"
echo ""
echo "📊 Database: united_systems"
echo "🔗 Connection: postgresql://postgres@localhost:5432/united_systems"
echo ""
echo "You can now start the development servers with: npm run dev"