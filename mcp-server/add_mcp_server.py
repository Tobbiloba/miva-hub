#!/usr/bin/env python3
"""
Script to add MIVA Academic MCP Server to the Miva Hub database
"""

import sys
import os
import psycopg2
from psycopg2.extras import RealDictCursor
import json
import uuid

# Database Configuration (Miva Hub database)
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'miva_hub',
    'user': 'miva_hub',
    'password': 'miva_hub',
    'cursor_factory': RealDictCursor
}

def add_mcp_server():
    """Add MIVA Academic MCP Server to the database"""
    
    # Generate UUID for the server
    server_id = str(uuid.uuid4())
    
    # MCP Server configuration (Remote SSE)
    mcp_config = {
        "url": "http://localhost:8081/sse",
        "headers": {}
    }
    
    # Server details
    server_name = "miva-academic"
    
    try:
        # Connect to database
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Check if server already exists
        cursor.execute(
            "SELECT id FROM mcp_server WHERE name = %s",
            (server_name,)
        )
        
        existing = cursor.fetchone()
        if existing:
            print(f"✅ MIVA Academic MCP Server already exists with ID: {existing['id']}")
            cursor.close()
            conn.close()
            return existing['id']
        
        # Insert the MCP server
        cursor.execute("""
            INSERT INTO mcp_server (id, name, config, enabled, created_at, updated_at)
            VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id
        """, (
            server_id,
            server_name, 
            json.dumps(mcp_config),
            True
        ))
        
        result = cursor.fetchone()
        conn.commit()
        
        if result:
            print(f"🎓 Successfully added MIVA Academic MCP Server!")
            print(f"   Server ID: {result['id']}")
            print(f"   Server Name: {server_name}")
            print(f"   SSE Endpoint: {mcp_config['url']}")
            print(f"   Status: Enabled")
            print(f"\n📚 Available Study Buddy Tools:")
            print("   🧠 ask_study_question - Ask intelligent study questions")
            print("   🎓 start_study_session - Start new study sessions")
            print("   📜 view_study_history - View session history")
            print("   📚 generate_study_guide - Generate study guides (coming soon)")
            print("   🃏 create_flashcards - Create flashcards (coming soon)")
            print("   📝 generate_practice_quiz - Generate practice quizzes (coming soon)")
            
            cursor.close()
            conn.close()
            return result['id']
        else:
            print("❌ Failed to insert MCP server - no result returned")
            cursor.close()
            conn.close()
            return None
        
    except psycopg2.Error as e:
        print(f"❌ Database error: {e}")
        if 'conn' in locals():
            conn.rollback()
            cursor.close()
            conn.close()
        return None
    except Exception as e:
        print(f"❌ Unexpected error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    print("🔄 Adding MIVA Academic MCP Server to Miva Hub database...")
    server_id = add_mcp_server()

    if server_id:
        print(f"\n✅ Success! The MIVA Academic MCP Server is now available in the Miva Hub interface.")
        print(f"🚀 You can now use Study Buddy tools in your conversations!")
    else:
        print(f"\n❌ Failed to add MCP server. Please check the database connection and try again.")