#!/usr/bin/env python3
"""
MIVA University Database Reset Script - Simple Version
Executes the clear_all_data.sql script to completely wipe the database
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add the src directory to the path so we can import the database module
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

def main():
    """Execute the database clearing script"""
    print("🎓 MIVA University Database Reset Tool")
    print("=" * 50)
    
    # Load environment variables
    frontend_env = Path(__file__).parent.parent / "frontend" / ".env.local"
    if frontend_env.exists():
        load_dotenv(frontend_env)
        print(f"✅ Loaded environment from {frontend_env}")
    else:
        print(f"⚠️  No .env.local found at {frontend_env}")
    
    # Load from current directory as well
    load_dotenv()
    
    # Import database configuration
    try:
        from core.database import DatabaseConfig
        db_config = DatabaseConfig()
        print(f"✅ Database config loaded: {db_config.host}:{db_config.port}/{db_config.database}")
    except Exception as e:
        print(f"❌ Failed to load database config: {e}")
        return 1
    
    # Read the SQL script
    sql_file = Path(__file__).parent / "sql" / "clear_all_data.sql"
    if not sql_file.exists():
        print(f"❌ SQL script not found: {sql_file}")
        return 1
    
    with open(sql_file, 'r') as f:
        sql_script = f.read()
    
    print(f"📄 SQL script loaded from {sql_file}")
    
    # Execute the SQL script
    try:
        import psycopg2
        
        # Connect to database
        if db_config.database_url:
            conn = psycopg2.connect(db_config.database_url)
        else:
            conn = psycopg2.connect(
                host=db_config.host,
                port=db_config.port,
                database=db_config.database,
                user=db_config.user,
                password=db_config.password
            )
        
        print(f"🔌 Connected to database: {db_config.database}")
        
        # Execute the script
        cursor = conn.cursor()
        print("🗑️  Executing database clear script...")
        
        # Execute the SQL script
        cursor.execute(sql_script)
        
        # Commit the transaction
        conn.commit()
        cursor.close()
        conn.close()
        
        print("\n✅ Database clearing completed successfully!")
        print("🎯 All data has been removed, table structure preserved")
        
        # Now verify by checking some key tables
        print("\n🔍 Verification - checking table counts...")
        
        # Reconnect for verification
        if db_config.database_url:
            conn = psycopg2.connect(db_config.database_url)
        else:
            conn = psycopg2.connect(
                host=db_config.host,
                port=db_config.port,
                database=db_config.database,
                user=db_config.user,
                password=db_config.password
            )
        
        cursor = conn.cursor()
        
        # Check key tables
        tables_to_check = [
            '"user"', 'course', 'student_enrollment', 'course_material', 
            'assignment', 'chat_thread', 'mcp_server'
        ]
        
        for table in tables_to_check:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            status = "✅ EMPTY" if count == 0 else f"❌ {count} rows"
            print(f"   {table}: {status}")
        
        cursor.close()
        conn.close()
        
        print("\n🚀 Ready for fresh data - MCP tools will now return empty results")
        
        return 0
        
    except Exception as e:
        print(f"❌ Database operation failed: {e}")
        print(f"🔍 Error type: {type(e).__name__}")
        return 1

if __name__ == "__main__":
    sys.exit(main())