#!/bin/bash

# Gym SaaS Database Migration Runner
# Runs all consolidated migrations in the correct order

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_URL="${DATABASE_URL:-}"
MIGRATION_DIR="$(dirname "$0")/migrations"

# Help text
show_help() {
    echo "Gym SaaS Database Migration Runner"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -d, --db-url   Database URL (or set DATABASE_URL env var)"
    echo "  -v, --verbose  Verbose output"
    echo "  --dry-run      Show what would be executed without running"
    echo ""
    echo "Example:"
    echo "  $0 -d postgresql://user:pass@localhost/gym_saas"
    echo "  DATABASE_URL=postgresql://... $0"
    echo ""
}

# Parse command line arguments
VERBOSE=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -d|--db-url)
            DB_URL="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Validation
if [[ -z "$DB_URL" ]]; then
    echo -e "${RED}Error: Database URL not provided${NC}"
    echo "Set DATABASE_URL environment variable or use -d option"
    exit 1
fi

if [[ ! -d "$MIGRATION_DIR" ]]; then
    echo -e "${RED}Error: Migration directory not found: $MIGRATION_DIR${NC}"
    exit 1
fi

# Migration files in order
MIGRATIONS=(
    "01_create_base_schema.sql"
    "02_create_rbac_system.sql"
    "03_create_member_system.sql"
    "04_create_subscription_system.sql"
    "05_create_functions.sql"
    "06_create_triggers.sql"
    "07_create_policies.sql"
    "08_create_indexes.sql"
    "09_insert_seed_data.sql"
    "10_create_views.sql"
)

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

run_migration() {
    local migration_file=$1
    local migration_path="$MIGRATION_DIR/$migration_file"
    
    if [[ ! -f "$migration_path" ]]; then
        log_error "Migration file not found: $migration_path"
        return 1
    fi
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "Would run: $migration_file"
        return 0
    fi
    
    log_info "Running migration: $migration_file"
    
    if [[ "$VERBOSE" == true ]]; then
        psql "$DB_URL" -f "$migration_path" -v ON_ERROR_STOP=1
    else
        psql "$DB_URL" -f "$migration_path" -v ON_ERROR_STOP=1 -q
    fi
    
    if [[ $? -eq 0 ]]; then
        log_success "Completed: $migration_file"
    else
        log_error "Failed: $migration_file"
        return 1
    fi
}

# Main execution
main() {
    echo "=============================================="
    echo "  Gym SaaS Database Migration Runner"
    echo "=============================================="
    echo ""
    
    if [[ "$DRY_RUN" == true ]]; then
        log_warning "DRY RUN MODE - No changes will be made"
        echo ""
    fi
    
    # Test database connection
    log_info "Testing database connection..."
    if ! psql "$DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        log_error "Cannot connect to database"
        exit 1
    fi
    log_success "Database connection successful"
    echo ""
    
    # Run migrations
    log_info "Starting migrations..."
    echo ""
    
    local failed_migrations=0
    local total_migrations=${#MIGRATIONS[@]}
    
    for migration in "${MIGRATIONS[@]}"; do
        if ! run_migration "$migration"; then
            ((failed_migrations++))
            break  # Stop on first failure
        fi
    done
    
    echo ""
    echo "=============================================="
    
    if [[ $failed_migrations -eq 0 ]]; then
        if [[ "$DRY_RUN" == true ]]; then
            log_success "Dry run completed successfully"
            log_info "All $total_migrations migrations are ready to run"
        else
            log_success "All migrations completed successfully!"
            log_info "Database schema is now ready for the Gym SaaS application"
            echo ""
            echo "Next steps:"
            echo "1. Set up your Supabase/PostgreSQL environment variables"
            echo "2. Configure Razorpay payment gateway credentials"
            echo "3. Test the application with a new gym registration"
        fi
    else
        log_error "Migration failed. Database may be in inconsistent state."
        echo ""
        echo "Troubleshooting:"
        echo "1. Check the error message above"
        echo "2. Verify database permissions"
        echo "3. Ensure PostgreSQL version compatibility"
        echo "4. Check if migrations were partially applied"
        exit 1
    fi
    
    echo "=============================================="
}

# Check for required tools
if ! command -v psql >/dev/null 2>&1; then
    log_error "psql (PostgreSQL client) is required but not installed"
    exit 1
fi

# Run main function
main

echo ""
log_info "Migration runner completed"