#!/usr/bin/env python3
"""
MIVA University Academic Data Seeding Script
Populates database with authentic MIVA University data from real timetables
"""

import os
import sys
import uuid
import json
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime, date

# Add the src directory to the path so we can import the database module
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

def main():
    """Seed the database with real MIVA University academic data"""
    print("🎓 MIVA University Academic Data Seeding")
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
    
    # Execute the seeding
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
        
        print(f"🔌 Connected to database: {db_config.database}")
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Start transaction
        print("🌱 Starting academic data seeding...")
        
        # 1. Seed Academic Calendar
        print("\n📅 Creating Academic Calendar...")
        seed_academic_calendar(cursor)
        
        # 2. Seed Departments  
        print("\n🏛️  Creating Departments...")
        dept_mapping = seed_departments(cursor)
        
        # 3. Seed Courses
        print("\n📚 Creating Courses...")
        seed_courses(cursor, dept_mapping)
        
        # 4. Create Sample Faculty (skip for now - requires user creation)
        print("\n👨‍🏫 Skipping Faculty Creation (requires user setup)...")
        print("   ⏭️  Faculty creation skipped")
        
        # 5. Create Sample Class Schedules
        print("\n🗓️  Creating Class Schedules...")
        seed_class_schedules(cursor)
        
        # Commit the transaction
        conn.commit()
        cursor.close()
        conn.close()
        
        print("\n✅ MIVA University academic data seeding completed successfully!")
        print("🎯 Database now contains authentic MIVA University structure")
        print("🚀 Signup page should now work with real departments and courses")
        
        return 0
        
    except Exception as e:
        print(f"❌ Seeding failed: {e}")
        print(f"🔍 Error type: {type(e).__name__}")
        if 'conn' in locals():
            conn.rollback()
        return 1

def seed_academic_calendar(cursor):
    """Create academic calendar entries"""
    calendar_data = [
        {
            'semester': '2024-first',
            'academic_year': '2024-2025',
            'semester_name': 'First Semester 2024/2025',
            'start_date': '2024-09-01',
            'end_date': '2024-12-15',
            'registration_start_date': '2024-08-15',
            'registration_end_date': '2024-09-15',
            'finals_start_date': '2024-12-01',
            'finals_end_date': '2024-12-15',
            'is_active': True
        },
        {
            'semester': '2025-second', 
            'academic_year': '2024-2025',
            'semester_name': 'Second Semester 2024/2025',
            'start_date': '2025-01-15',
            'end_date': '2025-05-30',
            'registration_start_date': '2025-01-01',
            'registration_end_date': '2025-01-20',
            'finals_start_date': '2025-05-15',
            'finals_end_date': '2025-05-30',
            'is_active': False
        }
    ]
    
    for cal in calendar_data:
        cursor.execute("""
            INSERT INTO academic_calendar (
                id, semester, academic_year, semester_name, start_date, end_date, 
                registration_start_date, registration_end_date, finals_start_date, 
                finals_end_date, is_active, created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (semester) DO UPDATE SET
                academic_year = EXCLUDED.academic_year,
                semester_name = EXCLUDED.semester_name,
                start_date = EXCLUDED.start_date,
                end_date = EXCLUDED.end_date,
                registration_start_date = EXCLUDED.registration_start_date,
                registration_end_date = EXCLUDED.registration_end_date,
                finals_start_date = EXCLUDED.finals_start_date,
                finals_end_date = EXCLUDED.finals_end_date,
                is_active = EXCLUDED.is_active
        """, (
            str(uuid.uuid4()),
            cal['semester'],
            cal['academic_year'],
            cal['semester_name'],
            cal['start_date'],
            cal['end_date'],
            cal['registration_start_date'],
            cal['registration_end_date'],
            cal['finals_start_date'],
            cal['finals_end_date'],
            cal['is_active'],
            datetime.now()
        ))
    
    print(f"   ✅ Created {len(calendar_data)} academic calendar entries")

def seed_departments(cursor):
    """Create all MIVA University departments"""
    departments = [
        {
            'code': 'CSC',
            'name': 'Computer Science',
            'description': 'Department of Computer Science focusing on algorithms, programming, and computational theory'
        },
        {
            'code': 'ECO', 
            'name': 'Economics',
            'description': 'Department of Economics covering micro/macroeconomics, development economics, and financial analysis'
        },
        {
            'code': 'PAD',
            'name': 'Public Policy & Administration', 
            'description': 'Department of Public Administration and Policy Studies'
        },
        {
            'code': 'ACC',
            'name': 'Accounting',
            'description': 'Department of Accounting covering financial reporting, auditing, and taxation'
        },
        {
            'code': 'BUA',
            'name': 'Business Management',
            'description': 'Department of Business Administration and Management'
        },
        {
            'code': 'DTS',
            'name': 'Data Science',
            'description': 'Department of Data Science covering analytics, machine learning, and big data'
        },
        {
            'code': 'SEN',
            'name': 'Software Engineering',
            'description': 'Department of Software Engineering focusing on software development methodologies'
        },
        {
            'code': 'CYB',
            'name': 'Cybersecurity', 
            'description': 'Department of Cybersecurity covering information security and digital forensics'
        },
        {
            'code': 'PHS',
            'name': 'Public Health',
            'description': 'Department of Public Health Sciences covering epidemiology and health policy'
        },
        {
            'code': 'NSC',
            'name': 'Nursing Science',
            'description': 'Department of Nursing Science covering clinical nursing and healthcare'
        },
        {
            'code': 'ENT',
            'name': 'Entrepreneurship',
            'description': 'Department of Entrepreneurship and Innovation Studies'
        },
        {
            'code': 'IFT',
            'name': 'Information Technology',
            'description': 'Department of Information Technology covering systems and network administration'
        },
        {
            'code': 'CSS',
            'name': 'Criminology & Security Studies',
            'description': 'Department of Criminology and Security Studies'
        }
    ]
    
    dept_mapping = {}
    
    for dept in departments:
        dept_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO department (id, code, name, description, created_at)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (code) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description
            RETURNING id
        """, (
            dept_id,
            dept['code'],
            dept['name'], 
            dept['description'],
            datetime.now()
        ))
        
        result = cursor.fetchone()
        dept_mapping[dept['code']] = result['id'] if result else dept_id
    
    print(f"   ✅ Created {len(departments)} departments")
    return dept_mapping

def seed_courses(cursor, dept_mapping):
    """Create all MIVA University courses"""
    
    # Define all courses by department and level
    courses_data = {
        'CSC': {
            '200': [
                ('MTH 201', 'Mathematical Methods I', 3),
                ('ENT 211', 'Entrepreneurship and Innovation', 2),
                ('COS 201', 'Computer Programming I', 3),
                ('COS 203', 'Discrete Structures', 3),
                ('SEN 201', 'Introduction to Software Engineering', 3),
                ('IFT 211', 'Digital Logic Design', 3)
            ],
            '300': [
                ('CSC 301', 'Data Structures', 3),
                ('CSC 303', 'Introduction to Data Management', 3),
                ('CSC 309', 'Artificial Intelligence', 3),
                ('ICT 305', 'Data Communication System and Network', 3),
                ('CYB 201', 'Introduction to Cybersecurity and Strategy', 2)
            ]
        },
        'ECO': {
            '200': [
                ('ECO 201', 'Introduction to Microeconomics I', 3),
                ('ENT 211', 'Entrepreneurship and Innovation', 2),
                ('ECO 203', 'Introduction to Macroeconomics I', 3),
                ('ECO 209', 'Financial Markets and Monetary Economics', 3),
                ('ECO 207', 'Mathematics for Economists', 3),
                ('ECO 205', 'Structure of the Nigerian Economy', 3),
                ('ACC 201', 'Financial Accounting I', 3)
            ],
            '300': [
                ('ECO 301', 'Intermediate Microeconomic Theory I', 3),
                ('ECO 307', 'Project Evaluation', 3),
                ('SSC 301', 'Innovation in the Social Sciences', 3),
                ('ECO 303', 'Intermediate Macroeconomic Theory I', 3),
                ('ECO 305', 'History of Economic Thought', 3),
                ('ECO 309', 'Data Analytics and Visualisation', 3),
                ('ECO 311', 'Development Economics', 3)
            ]
        },
        'PAD': {
            '200': [
                ('PAD 203', 'Nigerian Legal System', 3),
                ('ENT 211', 'Entrepreneurship and Innovation', 2),
                ('PAD 207', 'Introduction to Policy and Decision Making', 3),
                ('PAD 205', 'Office Administration', 2),
                ('PAD 201', 'Introduction to Public Administration', 3),
                ('PAD 213', 'Foreign Policy Making and Analysis', 3),
                ('PAD 209', 'Introduction to Political Analysis', 3),
                ('PAD 211', 'Foundations of Political Economy', 3)
            ],
            '300': [
                ('PAD 301', 'Administrative Theory', 3),
                ('PAD 309', 'Comparative Local Government', 3),
                ('PAD 307', 'Research Methods in Public Administration', 3),
                ('PAD 305', 'Public Personnel Administration', 3),
                ('PAD 311', 'Public Finance', 3),
                ('PAD 313', 'Administrative Law', 3),
                ('PAD 303', 'International Administration', 3)
            ]
        },
        'ACC': {
            '200': [
                ('ENT 211', 'Entrepreneurship and Innovation', 2),
                ('ACC 207', 'Data Analytics in Accounting', 3),
                ('ACC 203', 'Corporate Governance and Accounting Ethics', 3),
                ('ACC 215', 'Commercial Law for Accountants I', 3),
                ('ACC 217', 'Petroleum Accounting', 3),
                ('ACC 201', 'Financial Accounting I', 3)
            ],
            '300': [
                ('ACC 301', 'Financial Reporting I', 3),
                ('ACC 317', 'Company Law I', 3),
                ('ACC 315', 'Intermediate Accounting I', 3),
                ('ACC 311', 'Entrepreneurship in Accounting Education', 3),
                ('ACC 307', 'Auditing and Assurance I', 3),
                ('ACC 305', 'Taxation I', 3),
                ('ACC 303', 'Management Accounting', 3)
            ]
        },
        'BUA': {
            '200': [
                ('BUA 203', 'Business Statistics', 3),
                ('ENT 211', 'Entrepreneurship and Innovation', 2),
                ('BUA 201', 'Principles of Business Administration I', 3),
                ('BUA 207', 'Elements of Marketing', 3),
                ('BUA 209', 'Current Issues in Global Business', 3),
                ('BUA 205', 'Leadership and Governance', 3)
            ],
            '300': [
                ('BUA 303', 'Management Theory', 3),
                ('BUA 313', 'Innovation Management', 3),
                ('BUA 305', 'Financial Management', 3),
                ('BUA 319', 'E-Commerce', 3),
                ('BUA 321', 'Business Start-up', 2),
                ('BUA 323', 'Supply Chain Management', 3),
                ('BUA 307', 'Business Law', 3)
            ]
        },
        'DTS': {
            '200': [
                ('MTH 201', 'Mathematical Methods I', 3),
                ('ENT 211', 'Entrepreneurship and Innovation', 2),
                ('COS 201', 'Computer Programming I', 3),
                ('MTH 209', 'Introduction to Numerical Analysis', 3),
                ('CSC 203', 'Discrete Structures', 3),
                ('DTS 211', 'Introduction to R Programming', 3),
                ('MTH 203', 'Sets, Logic and Algebra I', 3),
                ('DTS 201', 'Introduction to Data Science', 3)
            ],
            '300': [
                ('DTS 301', 'Data Structures', 3),
                ('DTS 305', 'Data Quality and Data Wrangling', 3),
                ('DTS 319', 'Internet of Things', 3),
                ('DTS 317', 'Introduction to Data Protection and IT Security', 3),
                ('CYB 201', 'Introduction to Cybersecurity and Strategy', 2)
            ]
        },
        'SEN': {
            '200': [
                ('MTH 201', 'Mathematical Methods I', 3),
                ('ENT 211', 'Entrepreneurship and Innovation', 2),
                ('COS 201', 'Computer Programming I', 3),
                ('CSC 203', 'Discrete Structures', 3),
                ('SEN 201', 'Introduction to Software Engineering', 3),
                ('IFT 211', 'Digital Logic Design', 3),
                ('SEN 203', 'Software Requirements Engineering', 3)
            ],
            '300': [
                ('CSC 301', 'Data Structures', 3),
                ('SEN 301', 'Object-Oriented Analysis and Design', 3),
                ('ICT 305', 'Data Communication System and Network', 3),
                ('SEN 311', 'Web Application Development', 3),
                ('SEN 305', 'Software Defined Networking', 3)
            ]
        },
        'CYB': {
            '200': [
                ('MTH 201', 'Mathematical Methods I', 3),
                ('ENT 211', 'Entrepreneurship and Innovation', 2),
                ('COS 201', 'Computer Programming I', 3),
                ('COS 203', 'Discrete Structures', 3),
                ('SEN 201', 'Introduction to Software Engineering', 3),
                ('MTH 205', 'Linear Algebra I', 3),
                ('CYB 201', 'Introduction to Cybersecurity and Strategy', 2),
                ('CYB 203', 'Cybercrime, Law and Countermeasures', 3)
            ],
            '300': [
                ('CSC 301', 'Data Structures', 3),
                ('CYB 301', 'Cryptography Techniques, Algorithms and Applications', 3),
                ('CYB 307', 'System and Network Administration', 3),
                ('CSC 309', 'Artificial Intelligence', 3),
                ('CYB 303', 'Cybersecurity Risks Analysis, Challenges and Mitigation', 3),
                ('CYB 305', 'Digital Forensics and Investigation Methods', 3),
                ('CYB 309', 'Cybersecurity in Business and Industries', 3)
            ]
        },
        'PHS': {
            '200': [
                ('ENT 211', 'Entrepreneurship and Innovation', 2),
                ('ANA 201', 'Anatomy of upper and Lower Limb', 3),
                ('NSC 203', 'Developmental Psychology', 3),
                ('BCH 201', 'Biochemistry – General and Medical I', 3),
                ('PHS 201', 'Introduction to Public Health', 3),
                ('PIO 201', 'Introductory Physiology and Blood', 3),
                ('PHS 205', 'Human Genetics', 3),
                ('MCB 201', 'General Microbiology', 3),
                ('PHS 203', 'Principles of Epidemiology', 3)
            ]
        },
        'NSC': {
            '300': [
                ('PHA 301', 'Pharmacodynamics and Chemotherapy I', 3),
                ('PHS 301', 'Public Health Microbiology & Parasitology/Entomology', 3),
                ('NSC 319', 'Family Health Nursing', 3),
                ('NSC 301', 'Epidemiology', 3),
                ('NSC 303', 'Community/Public Health Nursing I', 3),
                ('NSC 317', 'Oncology Nursing', 3),
                ('NSC 315', 'Information Management in Nursing and Healthcare', 3),
                ('NSC 307', 'Human Nutrition', 3),
                ('NSC 309', 'Nursing Ethics and Jurisprudence', 3),
                ('NSC 313', 'Medical-Surgical Nursing I', 3)
            ]
        },
        'ENT': {
            '200': [
                ('ENT 211', 'Entrepreneurship and Innovation', 2),
                ('ENT 223', 'Introduction to Entrepreneurial Financing', 3),
                ('ENT 227', 'Theories of Entrepreneurship', 3),
                ('ENT 225', 'Entrepreneurial Marketing', 3),
                ('ENT 201', 'Principles of Sustainable Development', 3),
                ('ENT 229', 'New Media Studies for Entrepreneurs', 3),
                ('ENT 203', 'Business Communication Skills for Entrepreneurs', 3)
            ]
        },
        'IFT': {
            '200': [
                ('ENT 211', 'Entrepreneurship and Innovation', 2),
                ('COS 201', 'Computer Programming I', 3),
                ('IFT 203', 'Introduction to Web Technologies', 3),
                ('IFT 201', 'Introduction to Information Systems for Information Technology', 3),
                ('IFT 211', 'Digital Logic Design', 3),
                ('IFT 205', 'Introduction to Information Technology', 3)
            ]
        },
        'CSS': {
            '200': [
                ('CSS 203', 'Comparative Police and Policing Systems', 3),
                ('ENT 211', 'Entrepreneurship and Innovation', 2),
                ('CSS 201', 'Nigerian Law Enforcement and Security System', 3),
                ('CSS 209', 'Sociology of Crime and Juvenile Delinquency', 3),
                ('CSS 207', 'Prisons and Correctional Services', 3),
                ('CSS 211', 'Cybercrime, Law and Countermeasures for Criminology', 3),
                ('CSS 205', 'Human Rights and Criminal Justice System', 3)
            ]
        }
    }
    
    course_count = 0
    created_courses = set()  # Track unique courses to avoid duplicates
    
    for dept_code, levels in courses_data.items():
        if dept_code not in dept_mapping:
            print(f"   ⚠️  Department {dept_code} not found in mapping")
            continue
            
        dept_id = dept_mapping[dept_code]
        
        for level, courses in levels.items():
            for course_code, course_title, credits in courses:
                # Skip if we've already created this course (for shared courses)
                course_key = f"{course_code}_{level}"
                if course_key in created_courses:
                    continue
                
                cursor.execute("""
                    INSERT INTO course (
                        id, course_code, title, description, credits, level, 
                        semester_offered, department_id, is_active, created_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (course_code) DO UPDATE SET
                        title = EXCLUDED.title,
                        credits = EXCLUDED.credits,
                        level = EXCLUDED.level,
                        department_id = EXCLUDED.department_id
                """, (
                    str(uuid.uuid4()),
                    course_code,
                    course_title,
                    f"Course description for {course_title}",
                    credits,
                    f"{level}L",  # Convert "200" to "200L"
                    'fall',  # Use fall instead of first
                    dept_id,
                    True,
                    datetime.now()
                ))
                
                created_courses.add(course_key)
                course_count += 1
    
    print(f"   ✅ Created {course_count} courses")

def seed_faculty(cursor, dept_mapping):
    """Create sample faculty members"""
    faculty_data = [
        ('Dr. Ahmed Ibrahim', 'CSC', 'professor', ['Algorithms and Data Structures', 'Computer Science']),
        ('Dr. Sarah Johnson', 'ECO', 'associate_professor', ['Macroeconomic Policy', 'Economics']),
        ('Dr. Michael Chen', 'DTS', 'professor', ['Machine Learning and AI', 'Data Science']),
        ('Dr. Fatima Al-Hassan', 'CYB', 'assistant_professor', ['Network Security', 'Cybersecurity']),
        ('Dr. James Wilson', 'SEN', 'professor', ['Software Architecture', 'Software Engineering']),
        ('Dr. Aisha Okafor', 'BUA', 'associate_professor', ['Strategic Management', 'Business']),
        ('Dr. Robert Kim', 'ACC', 'professor', ['Financial Reporting', 'Accounting']),
        ('Dr. Halima Musa', 'PAD', 'assistant_professor', ['Public Policy Analysis', 'Public Administration']),
        ('Dr. David Thompson', 'IFT', 'associate_professor', ['Information Systems', 'Information Technology']),
        ('Dr. Khadija Bello', 'PHS', 'professor', ['Epidemiology', 'Public Health'])
    ]
    
    for name, dept_code, position, specializations in faculty_data:
        if dept_code in dept_mapping:
            # Create a user first (simplified)
            user_id = str(uuid.uuid4())
            employee_id = f"FAC{hash(name) % 10000:04d}"
            
            cursor.execute("""
                INSERT INTO faculty (
                    id, user_id, employee_id, department_id, position, 
                    specializations, created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (employee_id) DO NOTHING
            """, (
                str(uuid.uuid4()),
                user_id,
                employee_id,
                dept_mapping[dept_code],
                position,
                json.dumps(specializations),  # Convert to JSON string
                datetime.now()
            ))
    
    print(f"   ✅ Created {len(faculty_data)} faculty members")

def seed_class_schedules(cursor):
    """Create sample class schedules based on real MIVA timetable format"""
    # Get some courses to create schedules for
    cursor.execute("SELECT id, course_code FROM course LIMIT 20")
    courses = cursor.fetchall()
    
    # MIVA uses these time slots
    time_slots = [
        ('09:00', '11:00'),  # 9-11am
        ('13:00', '15:00')   # 1-3pm  
    ]
    
    days = ['tuesday', 'wednesday', 'friday', 'saturday']
    
    schedule_count = 0
    for i, course in enumerate(courses):
        day = days[i % len(days)]
        start_time, end_time = time_slots[i % len(time_slots)]
        
        cursor.execute("""
            INSERT INTO class_schedule (
                id, course_id, day_of_week, start_time, end_time,
                room_location, class_type, semester, created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
        """, (
            str(uuid.uuid4()),
            course['id'],
            day,
            start_time,
            end_time,
            f"Room {100 + i}",
            'lecture',
            'first',
            datetime.now()
        ))
        schedule_count += 1
    
    print(f"   ✅ Created {schedule_count} class schedules")

if __name__ == "__main__":
    sys.exit(main())