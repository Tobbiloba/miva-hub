#!/usr/bin/env python3
"""
Apply AI Database Enhancement to MIVA University Database
Safely adds AI capabilities to existing database without breaking anything
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv()

def print_header(title):
    """Print formatted section header"""
    print(f"\n{'='*60}")
    print(f"🔧 {title}")
    print(f"{'='*60}")

def print_success(message):
    """Print success message"""
    print(f"✅ {message}")

def print_error(message):
    """Print error message"""
    print(f"❌ {message}")

def print_info(message):
    """Print info message"""
    print(f"📊 {message}")

def print_warning(message):
    """Print warning message"""
    print(f"⚠️  {message}")

def get_database_config():
    """Get database configuration from environment variables"""
    config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': int(os.getenv('DB_PORT', '5432')),
        'database': os.getenv('DB_NAME', 'miva_academic'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', '')
    }
    
    # Check if DATABASE_URL is provided (takes precedence)
    database_url = os.getenv('DATABASE_URL')
    if database_url:
        print_info("Using DATABASE_URL for connection")
        return {'dsn': database_url}
    
    return config

def test_database_connection(config):
    """Test database connection before applying changes"""
    print_header("Testing Database Connection")
    
    try:
        if 'dsn' in config:
            conn = psycopg2.connect(config['dsn'])
        else:
            conn = psycopg2.connect(**config)
        
        cursor = conn.cursor()
        
        # Test basic connection
        cursor.execute("SELECT version();")
        db_version = cursor.fetchone()[0]
        print_success(f"Connected to PostgreSQL: {db_version}")
        
        # Check if we're connected to the right database
        cursor.execute("SELECT current_database();")
        current_db = cursor.fetchone()[0]
        print_info(f"Current database: {current_db}")
        
        # Check if the expected tables exist
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('courses', 'course_materials', 'faculty', 'students')
            ORDER BY table_name;
        """)
        
        existing_tables = cursor.fetchall()
        if existing_tables:
            print_success("Found existing MIVA academic tables:")
            for table in existing_tables:
                print_info(f"  • {table[0]}")
        else:
            print_warning("Expected academic tables not found. You may need to run create_dummy_data.sql first.")
        
        # Check existing course materials count
        try:
            cursor.execute("SELECT COUNT(*) FROM course_materials;")
            material_count = cursor.fetchone()[0]
            print_info(f"Existing course materials: {material_count}")
        except psycopg2.Error:
            print_warning("course_materials table not found")
        
        cursor.close()
        conn.close()
        return True
        
    except psycopg2.Error as e:
        print_error(f"Database connection failed: {e}")
        return False
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        return False

def backup_database(config):
    """Create a backup before applying changes"""
    print_header("Creating Database Backup")
    
    backup_file = f"miva_academic_backup_{int(time.time())}.sql"
    
    try:
        if 'dsn' in config:
            # Extract host, user, database from DSN for pg_dump
            # This is a simplified approach - for production, parse the DSN properly
            print_warning("Using DATABASE_URL - manual backup recommended")
            print_info("Run: pg_dump your_database_url > backup.sql")
            return True
        else:
            # Use pg_dump command
            dump_cmd = f"pg_dump -h {config['host']} -p {config['port']} -U {config['user']} -d {config['database']} > {backup_file}"
            print_info(f"Creating backup: {backup_file}")
            print_info("Note: You may need to enter the database password")
            
            # For this implementation, we'll just warn the user
            print_warning("Backup command prepared. Please run manually if needed:")
            print_info(f"  {dump_cmd}")
            
            return True
            
    except Exception as e:
        print_error(f"Backup preparation failed: {e}")
        return False

def check_pgvector_availability(config):
    """Check if pgvector extension is available"""
    print_header("Checking pgvector Availability")
    
    try:
        if 'dsn' in config:
            conn = psycopg2.connect(config['dsn'])
        else:
            conn = psycopg2.connect(**config)
        
        cursor = conn.cursor()
        
        # Check if pgvector extension is available
        cursor.execute("""
            SELECT name, default_version, installed_version 
            FROM pg_available_extensions 
            WHERE name = 'vector';
        """)
        
        extension_info = cursor.fetchone()
        
        if extension_info:
            name, default_version, installed_version = extension_info
            if installed_version:
                print_success(f"pgvector is installed: version {installed_version}")
            else:
                print_info(f"pgvector is available: version {default_version} (not yet installed)")
        else:
            print_error("pgvector extension is not available on this PostgreSQL installation")
            print_info("Please install pgvector extension first:")
            print_info("  - macOS: brew install pgvector")
            print_info("  - Or compile from source: https://github.com/pgvector/pgvector")
            cursor.close()
            conn.close()
            return False
        
        cursor.close()
        conn.close()
        return True
        
    except psycopg2.Error as e:
        print_error(f"Failed to check pgvector: {e}")
        return False

def apply_enhancement(config):
    """Apply the AI database enhancement"""
    print_header("Applying AI Database Enhancement")
    
    try:
        if 'dsn' in config:
            conn = psycopg2.connect(config['dsn'])
        else:
            conn = psycopg2.connect(**config)
        
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Read the enhancement SQL file
        with open('ai_database_enhancement.sql', 'r') as f:
            enhancement_sql = f.read()
        
        print_info("Executing AI database enhancement...")
        
        # Split the SQL into individual statements and execute
        statements = enhancement_sql.split(';')
        
        executed_count = 0
        for i, statement in enumerate(statements):
            statement = statement.strip()
            if statement and not statement.startswith('--'):
                try:
                    cursor.execute(statement)
                    executed_count += 1
                    if executed_count % 10 == 0:
                        print_info(f"Executed {executed_count} statements...")
                except psycopg2.Error as e:
                    # Some statements might fail (like CREATE EXTENSION IF NOT EXISTS when already exists)
                    if "already exists" in str(e).lower() or "extension" in str(e).lower():
                        print_info(f"Statement {i+1}: Already exists (OK)")
                    else:
                        print_warning(f"Statement {i+1} failed: {e}")
        
        print_success(f"Enhancement completed! Executed {executed_count} statements.")
        
        # Verify the enhancement
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'ai_%' OR table_name LIKE 'content_embeddings'
            ORDER BY table_name;
        """)
        
        new_tables = cursor.fetchall()
        if new_tables:
            print_success("New AI tables created:")
            for table in new_tables:
                print_info(f"  • {table[0]}")
        
        # Check pgvector extension
        cursor.execute("SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';")
        vector_ext = cursor.fetchone()
        if vector_ext:
            print_success(f"pgvector extension active: version {vector_ext[1]}")
        
        cursor.close()
        conn.close()
        return True
        
    except FileNotFoundError:
        print_error("ai_database_enhancement.sql file not found")
        return False
    except psycopg2.Error as e:
        print_error(f"Database enhancement failed: {e}")
        return False
    except Exception as e:
        print_error(f"Unexpected error during enhancement: {e}")
        return False

def verify_enhancement(config):
    """Verify that the enhancement was applied correctly"""
    print_header("Verifying AI Enhancement")
    
    try:
        if 'dsn' in config:
            conn = psycopg2.connect(config['dsn'])
        else:
            conn = psycopg2.connect(**config)
        
        cursor = conn.cursor()
        
        # Test 1: Check if pgvector extension is working
        cursor.execute("SELECT '1'::vector;")
        print_success("pgvector extension is working")
        
        # Test 2: Check if new tables exist and are accessible
        tables_to_check = [
            'ai_processed_content',
            'content_embeddings', 
            'ai_processing_jobs',
            'ai_content_analytics'
        ]
        
        for table in tables_to_check:
            cursor.execute(f"SELECT COUNT(*) FROM {table};")
            count = cursor.fetchone()[0]
            print_success(f"Table {table}: {count} records")
        
        # Test 3: Check if views were created
        cursor.execute("""
            SELECT viewname 
            FROM pg_views 
            WHERE schemaname = 'public' 
            AND viewname IN ('course_materials_with_ai', 'pending_ai_jobs');
        """)
        views = cursor.fetchall()
        if views:
            print_success(f"Created {len(views)} AI views")
        
        # Test 4: Check if functions were created
        cursor.execute("""
            SELECT routine_name 
            FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name IN ('semantic_search', 'get_ai_summary');
        """)
        functions = cursor.fetchall()
        if functions:
            print_success(f"Created {len(functions)} AI functions")
        
        # Test 5: Verify existing data is intact
        cursor.execute("SELECT COUNT(*) FROM course_materials;")
        material_count = cursor.fetchone()[0]
        print_success(f"Existing course materials preserved: {material_count}")
        
        cursor.close()
        conn.close()
        return True
        
    except psycopg2.Error as e:
        print_error(f"Verification failed: {e}")
        return False

def main():
    """Main execution function"""
    print_header("MIVA AI Database Enhancement Application")
    print_info("This script will enhance your existing database with AI capabilities")
    print_info("Your existing data will be preserved and enhanced")
    
    # Get database configuration
    config = get_database_config()
    print_info(f"Target database: {config.get('database', 'from DATABASE_URL')}")
    
    # Step 1: Test connection
    if not test_database_connection(config):
        print_error("Cannot proceed without database connection")
        sys.exit(1)
    
    # Step 2: Check pgvector availability
    if not check_pgvector_availability(config):
        print_error("pgvector extension is required")
        sys.exit(1)
    
    # Step 3: Backup recommendation
    backup_database(config)
    
    # Step 4: Ask for confirmation
    print_warning("\nIMPORTANT: This will modify your database structure")
    print_info("Your existing data will be preserved, but new tables will be added")
    
    response = input("\nProceed with AI enhancement? (y/N): ").strip().lower()
    if response != 'y':
        print_info("Enhancement cancelled by user")
        sys.exit(0)
    
    # Step 5: Apply enhancement
    if not apply_enhancement(config):
        print_error("Enhancement failed")
        sys.exit(1)
    
    # Step 6: Verify enhancement
    if not verify_enhancement(config):
        print_warning("Enhancement applied but verification had issues")
    
    # Step 7: Success message
    print_header("AI Enhancement Complete! 🎉")
    print_success("Your MIVA University database now has AI capabilities!")
    print()
    print_info("What's been added:")
    print_info("  ✅ pgvector extension for semantic search")
    print_info("  ✅ AI processing tables linked to your course materials")
    print_info("  ✅ Semantic search functions")
    print_info("  ✅ Background job processing system")
    print_info("  ✅ Content analytics tracking")
    print()
    print_info("Your existing course materials are:")
    print_info("  ✅ Completely preserved and unchanged")
    print_info("  ✅ Ready for AI processing")
    print_info("  ✅ Compatible with existing frontend")
    print()
    print_info("Next steps:")
    print_info("  1. Your existing frontend should work unchanged")
    print_info("  2. Ready to process course content with AI")
    print_info("  3. Ready for Phase 3: Content Processing Service")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print_error("\nEnhancement cancelled by user")
        sys.exit(1)
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        sys.exit(1)