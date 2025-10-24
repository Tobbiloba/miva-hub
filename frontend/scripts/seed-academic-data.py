#!/usr/bin/env python3
import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
import uuid
from datetime import datetime

# Database connection
DB_URL = os.environ.get("POSTGRES_URL", "postgresql://better_chatbot:better_chatbot@localhost:5432/better_chatbot")

# Department definitions
DEPARTMENTS = [
    {
        "code": "COMP",
        "name": "School of Computing",
        "description": "Computing programs covering software development, data science, cybersecurity, and information technology"
    },
    {
        "code": "MGMT",
        "name": "School of Management and Social Sciences",
        "description": "Management, economics, accounting, entrepreneurship, public policy, and criminology programs"
    },
    {
        "code": "COMM",
        "name": "School of Communication and Media Studies",
        "description": "Mass communication and media studies programs"
    },
    {
        "code": "HLTH",
        "name": "School of Allied Health Sciences",
        "description": "Nursing science and public health programs"
    }
]

# Program to Department mapping
PROGRAM_DEPARTMENT_MAP = {
    "Computer Science": "COMP",
    "Cybersecurity": "COMP",
    "Data Science": "COMP",
    "Software Engineering": "COMP",
    "Information Technology": "COMP",
    "Business Management": "MGMT",
    "Economics": "MGMT",
    "Accounting": "MGMT",
    "Entrepreneurship": "MGMT",
    "Public Policy and Administration": "MGMT",
    "Criminology and Security Studies": "MGMT",
    "Mass Communication and Media Studies": "COMM",
    "Nursing Science": "HLTH",
    "Public Health": "HLTH",
}

def parse_curriculum(content):
    """Parse curriculum section from content.md"""
    courses = []
    lines = content.split('\n')
    
    current_level = "100L"
    current_semester = "fall"
    current_program = ""
    current_dept_code = "COMP"
    in_curriculum = False
    
    for i, line in enumerate(lines):
        line = line.strip()
        
        if "100 level" in line.lower():
            in_curriculum = True
        
        if not in_curriculum:
            continue
        
        if not line:
            continue
        
        # Detect program
        if line.endswith(":") and not line[0].isupper():
            current_program = line.rstrip(":")
            current_dept_code = PROGRAM_DEPARTMENT_MAP.get(current_program, "COMP")
            continue
        
        # Detect level
        if line.lower() == "100 level":
            current_level = "100L"
        elif line.lower() == "200 level":
            current_level = "200L"
        elif line.lower() == "300 level":
            current_level = "300L"
        elif line.lower() == "400 level":
            current_level = "400L"
        
        # Detect semester
        if "1st semester" in line.lower():
            current_semester = "fall"
        elif "2nd semester" in line.lower():
            current_semester = "spring"
        
        # Parse course: "COURSE_CODE\tTitle\tUnits"
        parts = line.split('\t')
        if len(parts) >= 3:
            code_part = parts[0].strip()
            title = parts[1].strip() if len(parts) > 1 else ""
            units_part = parts[2].strip() if len(parts) > 2 else ""
            
            # Check if this looks like a course
            if code_part and title and units_part.isdigit():
                code = code_part.replace(" ", "")
                if len(code) >= 5 and code[:3].isalpha() and code[3:].isdigit():
                    courses.append({
                        "courseCode": code,
                        "title": title,
                        "credits": int(units_part),
                        "level": current_level,
                        "semesterOffered": current_semester,
                        "departmentCode": current_dept_code
                    })
    
    return courses

def seed_academic_data():
    """Main seeding function"""
    print("\n🎓 Starting MIVA University Academic Data Seeding...\n")
    
    try:
        # Read content.md
        with open("content.md", "r") as f:
            content = f.read()
        print("✅ Loaded content.md\n")
    except FileNotFoundError:
        print("❌ content.md not found!")
        return False
    
    # Connect to database
    try:
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        print("✅ Connected to database\n")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False
    
    # Step 1: Create departments
    print("📚 Step 1: Creating departments...")
    department_map = {}
    
    for dept in DEPARTMENTS:
        try:
            cursor.execute(
                "SELECT id FROM department WHERE code = %s",
                (dept["code"],)
            )
            existing = cursor.fetchone()
            
            if existing:
                print(f"  ✅ Department '{dept['code']}' already exists")
                department_map[dept["code"]] = existing["id"]
            else:
                dept_id = str(uuid.uuid4())
                cursor.execute(
                    "INSERT INTO department (id, code, name, description, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s)",
                    (dept_id, dept["code"], dept["name"], dept["description"], datetime.now(), datetime.now())
                )
                department_map[dept["code"]] = dept_id
                print(f"  ✅ Created department: {dept['code']}")
        except Exception as e:
            print(f"  ❌ Error with department {dept['code']}: {e}")
    
    conn.commit()
    print(f"\n✅ Department seeding complete. Total: {len(department_map)}\n")
    
    # Step 2: Parse courses
    print("📖 Step 2: Parsing courses from content.md...")
    courses = parse_curriculum(content)
    print(f"  ✅ Parsed {len(courses)} courses\n")
    
    # Step 3: Insert courses
    print("💾 Step 3: Inserting courses...")
    inserted = 0
    skipped = 0
    errors = 0
    
    for course in courses:
        try:
            cursor.execute("SELECT id FROM course WHERE course_code = %s", (course["courseCode"],))
            if cursor.fetchone():
                skipped += 1
                continue
            
            dept_id = department_map.get(course["departmentCode"])
            if not dept_id:
                errors += 1
                continue
            
            course_id = str(uuid.uuid4())
            cursor.execute(
                """INSERT INTO course (id, course_code, title, credits, department_id, level, semester_offered, is_active, created_at, updated_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (course_id, course["courseCode"], course["title"], course["credits"], dept_id, 
                 course["level"], course["semesterOffered"], True, datetime.now(), datetime.now())
            )
            inserted += 1
        except Exception as e:
            errors += 1
    
    conn.commit()
    print(f"\n✅ Course insertion complete!")
    print(f"   📊 Total inserted: {inserted}")
    print(f"   ⏭️  Total skipped: {skipped}")
    if errors > 0:
        print(f"   ⚠️  Total errors: {errors}")
    
    cursor.close()
    conn.close()
    
    print("\n✨ Seeding complete!")
    return True

if __name__ == "__main__":
    success = seed_academic_data()
    sys.exit(0 if success else 1)
