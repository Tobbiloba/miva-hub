#!/usr/bin/env python3
"""Quick verification of usage tracking for student 30012976"""
import sys
sys.path.append('src')
from core.database import academic_repo

conn = academic_repo.get_connection()
cursor = conn.cursor()

# Get user_id from email
cursor.execute("SELECT id, student_id, name FROM \"user\" WHERE email = %s", ('oluwatobi.salau@miva.edu.ng',))
user = cursor.fetchone()

if user:
    user_id = user['id']
    print(f"📊 Usage Tracking for {user['name']} (Student ID: {user['student_id']})")
    print("=" * 70)
    
    # Get current period usage
    cursor.execute("""
        SELECT usage_type, current_count, limit_count, 
               period_end, updated_at
        FROM usage_tracking 
        WHERE user_id = %s 
        AND period_end >= CURRENT_DATE
        ORDER BY usage_type
    """, (user_id,))
    
    usage = cursor.fetchall()
    for row in usage:
        progress = f"{row['current_count']}/{row['limit_count']}"
        bar_length = 20
        filled = int((row['current_count'] / row['limit_count']) * bar_length) if row['limit_count'] > 0 else 0
        bar = "█" * filled + "░" * (bar_length - filled)
        
        print(f"\n📌 {row['usage_type'].replace('_', ' ').title()}")
        print(f"   {bar} {progress}")
        print(f"   Last used: {row['updated_at'].strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"   Resets: {row['period_end']}")
else:
    print("❌ User not found")

cursor.close()
conn.close()

