#!/usr/bin/env python3
"""
Check what tables actually exist in the database
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add the src directory to the path so we can import the database module
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

def main():
    """Check existing tables in database"""
    print("🔍 Checking existing tables in database...")
    
    # Load environment variables
    frontend_env = Path(__file__).parent.parent / "frontend" / ".env.local"
    if frontend_env.exists():
        load_dotenv(frontend_env)
    load_dotenv()
    
    # Import database configuration
    try:
        from core.database import DatabaseConfig
        db_config = DatabaseConfig()
    except Exception as e:
        print(f"❌ Failed to load database config: {e}")
        return 1
    
    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor
        
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
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get all table names
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        """)
        
        tables = cursor.fetchall()
        
        print(f"📊 Found {len(tables)} tables in database:")
        for table in tables:
            print(f"   • {table['table_name']}")
        
        cursor.close()
        conn.close()
        
        return 0
        
    except Exception as e:
        print(f"❌ Database operation failed: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())