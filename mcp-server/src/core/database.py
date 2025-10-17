"""Database connection and configuration for MIVA Academic MCP Server."""

import os
import asyncio
from typing import Any, Dict, List, Optional
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class DatabaseConfig:
    """Database configuration class - unified with Next.js frontend."""
    
    def __init__(self):
        # Use the same POSTGRES_URL as Next.js frontend for unified database
        self.database_url = os.getenv('POSTGRES_URL') or os.getenv('DATABASE_URL')
        if not self.database_url:
            # Fallback to individual components if POSTGRES_URL not available
            self.host = os.getenv('DB_HOST', 'localhost')
            self.port = int(os.getenv('DB_PORT', '5432'))
            self.database = os.getenv('DB_NAME', 'better_chatbot')  # Changed from miva_academic
            self.user = os.getenv('DB_USER', 'postgres')
            self.password = os.getenv('DB_PASSWORD', '')
        else:
            # Parse POSTGRES_URL for individual components if needed
            import urllib.parse as urlparse
            parsed = urlparse.urlparse(self.database_url)
            self.host = parsed.hostname
            self.port = parsed.port or 5432
            self.database = parsed.path.lstrip('/')
            self.user = parsed.username
            self.password = parsed.password


class AcademicRepository:
    """Repository class for academic database operations - unified with Next.js frontend."""
    
    def __init__(self, config: DatabaseConfig):
        self.config = config
        # Real database connection using unified config
        self._connection = None
    
    def get_connection(self):
        """Get database connection using unified config"""
        try:
            import psycopg2
            from psycopg2.extras import RealDictCursor
            
            if self.config.database_url:
                return psycopg2.connect(self.config.database_url, cursor_factory=RealDictCursor)
            else:
                return psycopg2.connect(
                    host=self.config.host,
                    port=self.config.port,
                    database=self.config.database,
                    user=self.config.user,
                    password=self.config.password,
                    cursor_factory=RealDictCursor
                )
        except Exception as e:
            print(f"Database connection failed: {e}")
            return None
    
    async def get_course_materials(
        self,
        course_code: str,
        student_id: str,
        week_number: Optional[int] = None,
        material_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get course materials for a student - real database implementation."""
        conn = self.get_connection()
        if not conn:
            return {"error": "Database connection failed"}
        
        try:
            # Verify student enrollment
            is_enrolled = await self._check_enrollment(student_id, course_code)
            if not is_enrolled:
                return {
                    "error": "Access denied: Student not enrolled in this course",
                    "course_code": course_code,
                    "student_id": student_id
                }
            
            # Build query with optional filters
            query = """
                SELECT cm.id, cm.title, cm.material_type, cm.week_number, 
                       cm.description, cm.content_url, cm.created_at,
                       apc.ai_summary, apc.key_concepts
                FROM course_material cm
                LEFT JOIN ai_processed_content apc ON cm.id = apc.course_material_id
                JOIN course c ON cm.course_id = c.id
                WHERE c.course_code = %s AND cm.is_public = true
            """
            params = [course_code.upper()]
            
            if week_number:
                query += " AND cm.week_number = %s"
                params.append(week_number)
            
            if material_type:
                query += " AND cm.material_type = %s"
                params.append(material_type)
            
            query += " ORDER BY cm.week_number, cm.created_at"
            
            # Run database operations in thread to avoid blocking event loop
            def run_query():
                cursor = conn.cursor()
                cursor.execute(query, params)
                results = cursor.fetchall()
                cursor.close()
                conn.close()
                return results
            
            results = await asyncio.to_thread(run_query)
            
            materials = []
            for row in results:
                materials.append({
                    "id": row["id"],
                    "week_number": row["week_number"],
                    "material_type": row["material_type"],
                    "title": row["title"],
                    "description": row["description"],
                    "file_url": row["content_url"],
                    "upload_date": row["created_at"].isoformat() if row["created_at"] else None,
                    "ai_summary": row["ai_summary"],
                    "key_concepts": row["key_concepts"]
                })
            
            return {
                "course_code": course_code,
                "materials": materials,
                "total_count": len(materials)
            }
            
        except Exception as e:
            print(f"Error getting course materials: {e}")
            return {"error": f"Failed to retrieve course materials: {str(e)}"}
    
    async def get_upcoming_assignments(
        self,
        student_id: str,
        days_ahead: int = 7,
        course_code: Optional[str] = None,
        include_completed: bool = False
    ) -> Dict[str, Any]:
        """Get upcoming assignments for a student - real database implementation."""
        conn = self.get_connection()
        if not conn:
            return {"error": "Database connection failed"}
        
        try:
            # Run database operations in thread to avoid blocking event loop
            def run_query():
                cursor = conn.cursor()
                
                # Build base query for assignments in enrolled courses
                query = """
                    SELECT a.id, a.title, a.description, a.due_date, a.total_points, 
                           a.assignment_type, a.week_number, c.course_code, c.title as course_name,
                           CASE 
                               WHEN asub.id IS NOT NULL THEN 'submitted'
                               WHEN a.due_date < CURRENT_TIMESTAMP THEN 'overdue'
                               ELSE 'pending'
                           END as status,
                           EXTRACT(DAY FROM (a.due_date - CURRENT_TIMESTAMP)) as days_until_due
                    FROM assignment a
                    JOIN course c ON a.course_id = c.id
                    JOIN student_enrollment se ON c.id = se.course_id
                    JOIN "user" u ON se.student_id = u.id
                    LEFT JOIN assignment_submission asub ON a.id = asub.assignment_id AND asub.student_id = u.id
                    WHERE u.student_id = %s 
                        AND se.status = 'enrolled'
                        AND a.is_published = true
                        AND a.due_date >= CURRENT_TIMESTAMP - INTERVAL '{} days'
                        AND a.due_date <= CURRENT_TIMESTAMP + INTERVAL '{} days'
                """.format(0 if not include_completed else 365, days_ahead)
                
                params = [student_id]
                
                # Add course filter if specified
                if course_code:
                    query += " AND c.course_code = %s"
                    params.append(course_code.upper())
                
                # Add completion filter
                if not include_completed:
                    query += " AND asub.id IS NULL"
                
                query += " ORDER BY a.due_date ASC"
                
                cursor.execute(query, params)
                results = cursor.fetchall()
                cursor.close()
                conn.close()
                return results
            
            results = await asyncio.to_thread(run_query)
            
            assignments = []
            for row in results:
                # Calculate urgency based on days until due
                days_until = row["days_until_due"] or 0
                if days_until < 1:
                    urgency = "urgent"
                elif days_until <= 3:
                    urgency = "soon"
                else:
                    urgency = "later"
                
                assignments.append({
                    "id": row["id"],
                    "course_code": row["course_code"],
                    "course_name": row["course_name"],
                    "title": row["title"],
                    "description": row["description"],
                    "assignment_type": row["assignment_type"],
                    "due_date": row["due_date"].strftime("%Y-%m-%d") if row["due_date"] else None,
                    "due_time": row["due_date"].strftime("%H:%M") if row["due_date"] else None,
                    "points_possible": float(row["total_points"]) if row["total_points"] else 0,
                    "week_number": row["week_number"],
                    "status": row["status"],
                    "urgency": urgency,
                    "days_until_due": int(days_until) if days_until is not None else 0
                })
            
            return {
                "student_id": student_id,
                "assignments": assignments,
                "total_count": len(assignments)
            }
            
        except Exception as e:
            print(f"Error getting upcoming assignments: {e}")
            return {"error": f"Failed to retrieve upcoming assignments: {str(e)}"}
    
    async def get_course_info(self, course_code: str, include_materials: bool = False) -> Dict[str, Any]:
        """Get detailed course information - real database implementation."""
        conn = self.get_connection()
        if not conn:
            return {"error": "Database connection failed"}
        
        try:
            # Run database operations in thread to avoid blocking event loop
            def run_query():
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT c.id, c.course_code, c.title, c.description, c.credits,
                           d.name as department_name, u.name as faculty_name
                    FROM course c
                    LEFT JOIN department d ON c.department_id = d.id
                    LEFT JOIN course_instructor ci ON c.id = ci.course_id AND ci.role = 'primary'
                    LEFT JOIN faculty f ON ci.faculty_id = f.id
                    LEFT JOIN "user" u ON f.user_id = u.id
                    WHERE c.course_code = %s AND c.is_active = true
                    LIMIT 1
                """, (course_code.upper(),))
                
                result = cursor.fetchone()
                
                if not result:
                    cursor.close()
                    conn.close()
                    return None, None
                
                course_info = {
                    "course_code": result["course_code"],
                    "course_name": result["title"],
                    "description": result["description"],
                    "credits": result["credits"],
                    "department": result["department_name"],
                    "instructor": result["faculty_name"] or "TBA"
                }
                
                material_count = None
                if include_materials:
                    # Get materials count
                    cursor.execute("""
                        SELECT COUNT(*) as material_count
                        FROM course_material cm
                        WHERE cm.course_id = %s AND cm.is_public = true
                    """, (result["id"],))
                    material_result = cursor.fetchone()
                    material_count = material_result["material_count"] if material_result else 0
                
                cursor.close()
                conn.close()
                return course_info, material_count
            
            course_info, material_count = await asyncio.to_thread(run_query)
            
            if course_info is None:
                return {"error": f"Course {course_code} not found"}
            
            if material_count is not None:
                course_info["materials_count"] = material_count
            
            return course_info
            
        except Exception as e:
            print(f"Error getting course info: {e}")
            return {"error": f"Failed to retrieve course info: {str(e)}"}
    
    async def _check_enrollment(self, student_id: str, course_code: str) -> bool:
        """Check if student is enrolled in course - real database implementation."""
        conn = self.get_connection()
        if not conn:
            return False
        
        try:
            # Run database operations in thread to avoid blocking event loop
            def run_query():
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT 1 FROM "user" u
                    JOIN student_enrollment se ON u.id = se.student_id
                    JOIN course c ON se.course_id = c.id
                    WHERE u.student_id = %s AND c.course_code = %s AND se.status = 'enrolled'
                    LIMIT 1
                """, (student_id, course_code.upper()))
                
                result = cursor.fetchone()
                cursor.close()
                conn.close()
                return result
            
            result = await asyncio.to_thread(run_query)
            return result is not None
            
        except Exception as e:
            print(f"Error checking enrollment: {e}")
            return False

    async def get_student_enrollments(self, student_id: str) -> Dict[str, Any]:
        """Get all courses a student is enrolled in - real database implementation."""
        conn = self.get_connection()
        if not conn:
            return {"error": "Database connection failed"}
        
        try:
            # Run database operations in thread to avoid blocking event loop
            def run_query():
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT c.course_code, c.title, c.credits, se.enrollment_date, 
                           se.status, u2.name as instructor_name
                    FROM "user" u1
                    JOIN student_enrollment se ON u1.id = se.student_id
                    JOIN course c ON se.course_id = c.id
                    LEFT JOIN course_instructor ci ON c.id = ci.course_id
                    LEFT JOIN faculty f ON ci.faculty_id = f.id
                    LEFT JOIN "user" u2 ON f.user_id = u2.id
                    WHERE u1.student_id = %s AND se.status = 'enrolled'
                    ORDER BY c.course_code
                """, (student_id,))
                
                results = cursor.fetchall()
                cursor.close()
                conn.close()
                return results
            
            results = await asyncio.to_thread(run_query)
            
            enrollments = []
            total_credits = 0
            
            for row in results:
                enrollment = {
                    "course_code": row["course_code"],
                    "course_name": row["title"],
                    "credits": row["credits"],
                    "enrollment_date": row["enrollment_date"].isoformat() if row["enrollment_date"] else None,
                    "status": row["status"],
                    "instructor": row["instructor_name"] or "TBA"
                }
                enrollments.append(enrollment)
                total_credits += row["credits"] or 0
            
            return {
                "student_id": student_id,
                "enrollments": enrollments,
                "total_courses": len(enrollments),
                "total_credits": total_credits
            }
            
        except Exception as e:
            print(f"Error getting student enrollments: {e}")
            return {"error": f"Failed to retrieve enrollments: {str(e)}"}

    async def get_assignment_details(self, assignment_id: str, student_id: str) -> Dict[str, Any]:
        """Get detailed information for a specific assignment - real database implementation."""
        conn = self.get_connection()
        if not conn:
            return {"error": "Database connection failed"}
        
        try:
            # Run database operations in thread to avoid blocking event loop
            def run_query():
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT a.id, a.title, a.description, a.instructions, a.due_date, 
                           a.total_points, a.assignment_type, a.submission_type, 
                           a.allow_late_submission, a.late_submission_penalty,
                           a.week_number, c.course_code, c.title as course_name,
                           asub.id as submission_id, asub.submission_text, asub.file_url,
                           asub.grade, asub.feedback, asub.submitted_at,
                           CASE 
                               WHEN asub.id IS NOT NULL THEN 'submitted'
                               WHEN a.due_date < CURRENT_TIMESTAMP THEN 'overdue'
                               ELSE 'pending'
                           END as submission_status
                    FROM assignment a
                    JOIN course c ON a.course_id = c.id
                    JOIN student_enrollment se ON c.id = se.course_id
                    JOIN "user" u ON se.student_id = u.id
                    LEFT JOIN assignment_submission asub ON a.id = asub.assignment_id AND asub.student_id = u.id
                    WHERE a.id = %s AND u.student_id = %s AND se.status = 'enrolled' AND a.is_published = true
                    LIMIT 1
                """, (assignment_id, student_id))
                
                result = cursor.fetchone()
                cursor.close()
                conn.close()
                return result
            
            result = await asyncio.to_thread(run_query)
            
            if not result:
                return {"error": "Assignment not found or access denied"}
            
            return {
                "assignment_id": result["id"],
                "course_code": result["course_code"],
                "course_name": result["course_name"],
                "title": result["title"],
                "description": result["description"],
                "instructions": result["instructions"],
                "assignment_type": result["assignment_type"],
                "submission_type": result["submission_type"],
                "due_date": result["due_date"].strftime("%Y-%m-%d %H:%M") if result["due_date"] else None,
                "points_possible": float(result["total_points"]) if result["total_points"] else 0,
                "week_number": result["week_number"],
                "allow_late_submission": result["allow_late_submission"],
                "late_submission_penalty": float(result["late_submission_penalty"]) if result["late_submission_penalty"] else 0,
                "submission_status": result["submission_status"],
                "submission": {
                    "id": result["submission_id"],
                    "text": result["submission_text"],
                    "file_url": result["file_url"],
                    "submitted_at": result["submitted_at"].isoformat() if result["submitted_at"] else None,
                    "grade": float(result["grade"]) if result["grade"] else None,
                    "feedback": result["feedback"]
                } if result["submission_id"] else None
            }
            
        except Exception as e:
            print(f"Error getting assignment details: {e}")
            return {"error": f"Failed to retrieve assignment details: {str(e)}"}

    async def get_course_schedule(self, course_code: str, student_id: str) -> Dict[str, Any]:
        """Get schedule for a specific course - real database implementation."""
        # Check enrollment first
        is_enrolled = await self._check_enrollment(student_id, course_code)
        if not is_enrolled:
            return {
                "error": "Access denied: Student not enrolled in this course",
                "course_code": course_code,
                "student_id": student_id
            }
        
        conn = self.get_connection()
        if not conn:
            return {"error": "Database connection failed"}
        
        try:
            # Run database operations in thread to avoid blocking event loop
            def run_query():
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT cs.day_of_week, cs.start_time, cs.end_time, 
                           cs.room_location, cs.building_name, cs.class_type,
                           c.title as course_name
                    FROM class_schedule cs
                    JOIN course c ON cs.course_id = c.id
                    WHERE c.course_code = %s
                    ORDER BY 
                        CASE cs.day_of_week
                            WHEN 'monday' THEN 1
                            WHEN 'tuesday' THEN 2
                            WHEN 'wednesday' THEN 3
                            WHEN 'thursday' THEN 4
                            WHEN 'friday' THEN 5
                            WHEN 'saturday' THEN 6
                            WHEN 'sunday' THEN 7
                        END,
                        cs.start_time
                """, (course_code.upper(),))
                
                results = cursor.fetchall()
                cursor.close()
                conn.close()
                return results
            
            results = await asyncio.to_thread(run_query)
            
            schedule = []
            for row in results:
                # Format time display
                start_time = row["start_time"]
                end_time = row["end_time"]
                time_display = f"{start_time} - {end_time}"
                
                # Format room location
                room_display = row["room_location"]
                if row["building_name"]:
                    room_display = f"{row['room_location']}, {row['building_name']}"
                
                schedule.append({
                    "day": row["day_of_week"].title(),
                    "time": time_display,
                    "room": room_display or "TBA",
                    "type": row["class_type"]
                })
            
            return {
                "course_code": course_code,
                "course_name": results[0]["course_name"] if results else None,
                "schedule": schedule,
                "total_sessions": len(schedule)
            }
            
        except Exception as e:
            print(f"Error getting course schedule: {e}")
            return {"error": f"Failed to retrieve course schedule: {str(e)}"}

    async def get_course_announcements(self, course_code: str, student_id: str, limit: int = 10) -> Dict[str, Any]:
        """Get announcements for a specific course - real database implementation."""
        # Check enrollment first
        is_enrolled = await self._check_enrollment(student_id, course_code)
        if not is_enrolled:
            return {
                "error": "Access denied: Student not enrolled in this course",
                "course_code": course_code,
                "student_id": student_id
            }
        
        conn = self.get_connection()
        if not conn:
            return {"error": "Database connection failed"}
        
        try:
            # Run database operations in thread to avoid blocking event loop
            def run_query():
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT a.id, a.title, a.content, a.created_at, u.name as author_name
                    FROM announcement a
                    JOIN course c ON a.course_id = c.id
                    JOIN "user" u ON a.created_by_id = u.id
                    WHERE c.course_code = %s AND a.is_active = true
                    ORDER BY a.created_at DESC
                    LIMIT %s
                """, (course_code.upper(), limit))
                
                results = cursor.fetchall()
                cursor.close()
                conn.close()
                return results
            
            results = await asyncio.to_thread(run_query)
            
            announcements = []
            for row in results:
                announcements.append({
                    "id": row["id"],
                    "title": row["title"],
                    "content": row["content"],
                    "posted_date": row["created_at"].isoformat() if row["created_at"] else None,
                    "author": row["author_name"]
                })
            
            return {
                "course_code": course_code,
                "announcements": announcements,
                "total_count": len(announcements)
            }
            
        except Exception as e:
            print(f"Error getting course announcements: {e}")
            return {"error": f"Failed to retrieve announcements: {str(e)}"}

    async def get_course_syllabus(self, course_code: str, student_id: str) -> Dict[str, Any]:
        """Get syllabus for a specific course."""
        await self._check_enrollment(student_id, course_code)
        return {
            "course_code": course_code,
            "course_name": f"{course_code} Course",
            "instructor": "Dr. Sarah Johnson",
            "credits": 3,
            "description": "Introduction to fundamental concepts",
            "learning_objectives": [
                "Understand basic programming concepts",
                "Write simple programs", 
                "Debug and test code"
            ],
            "grading_policy": {
                "assignments": "40%",
                "midterm": "25%",
                "final": "25%", 
                "participation": "10%"
            },
            "required_materials": [
                "Textbook: Programming Fundamentals",
                "Laptop with development environment"
            ]
        }

    async def get_faculty_info(self, course_code: str, student_id: str) -> Dict[str, Any]:
        """Get faculty information for a course."""
        await self._check_enrollment(student_id, course_code)
        return {
            "course_code": course_code,
            "faculty": [
                {
                    "name": "Dr. Sarah Johnson",
                    "role": "Instructor", 
                    "email": "s.johnson@miva.edu.ng",
                    "office": "CS Building, Room 301",
                    "office_hours": "Tuesday 2-4 PM, Thursday 10-12 PM",
                    "phone": "+234-xxx-xxxx"
                }
            ]
        }
    
    async def get_academic_schedule(
        self, 
        student_id: str, 
        semester: Optional[str] = None,
        week_number: Optional[int] = None
    ) -> Dict[str, Any]:
        """Get comprehensive academic schedule for all enrolled courses - real database implementation."""
        conn = self.get_connection()
        if not conn:
            return {"error": "Database connection failed"}
        
        try:
            # Run database operations in thread to avoid blocking event loop
            def run_query():
                cursor = conn.cursor()
                
                # Build comprehensive schedule query
                query = """
                    SELECT c.course_code, c.title as course_name, 
                           cs.day_of_week, cs.start_time, cs.end_time,
                           cs.room_location, cs.building_name, cs.class_type,
                           cs.semester, se.enrollment_date,
                           u2.name as instructor_name
                    FROM student_enrollment se
                    JOIN "user" u1 ON se.student_id = u1.id
                    JOIN course c ON se.course_id = c.id
                    JOIN class_schedule cs ON c.id = cs.course_id
                    LEFT JOIN course_instructor ci ON c.id = ci.course_id AND ci.role = 'primary'
                    LEFT JOIN faculty f ON ci.faculty_id = f.id
                    LEFT JOIN "user" u2 ON f.user_id = u2.id
                    WHERE u1.student_id = %s AND se.status = 'enrolled'
                """
                
                params = [student_id]
                
                # Add semester filter if specified
                if semester:
                    query += " AND cs.semester = %s"
                    params.append(semester)
                
                query += """
                    ORDER BY 
                        CASE cs.day_of_week
                            WHEN 'monday' THEN 1
                            WHEN 'tuesday' THEN 2
                            WHEN 'wednesday' THEN 3
                            WHEN 'thursday' THEN 4
                            WHEN 'friday' THEN 5
                            WHEN 'saturday' THEN 6
                            WHEN 'sunday' THEN 7
                        END,
                        cs.start_time, c.course_code
                """
                
                cursor.execute(query, params)
                results = cursor.fetchall()
                cursor.close()
                conn.close()
                return results
            
            results = await asyncio.to_thread(run_query)
            
            # Organize schedule by day
            schedule_by_day = {}
            courses = set()
            
            for row in results:
                day = row["day_of_week"].title()
                course_code = row["course_code"]
                courses.add(course_code)
                
                if day not in schedule_by_day:
                    schedule_by_day[day] = []
                
                # Format time display
                time_display = f"{row['start_time']} - {row['end_time']}"
                
                # Format room location
                room_display = row["room_location"]
                if row["building_name"]:
                    room_display = f"{row['room_location']}, {row['building_name']}"
                
                schedule_by_day[day].append({
                    "course_code": course_code,
                    "course_name": row["course_name"],
                    "time": time_display,
                    "room": room_display or "TBA",
                    "type": row["class_type"],
                    "instructor": row["instructor_name"] or "TBA"
                })
            
            # Create daily schedule in order
            daily_schedule = []
            days_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            
            for day in days_order:
                if day in schedule_by_day:
                    daily_schedule.append({
                        "day": day,
                        "classes": schedule_by_day[day]
                    })
            
            return {
                "student_id": student_id,
                "semester": semester or "current",
                "total_courses": len(courses),
                "total_classes": len(results),
                "daily_schedule": daily_schedule,
                "enrolled_courses": list(courses)
            }
            
        except Exception as e:
            print(f"Error getting academic schedule: {e}")
            return {"error": f"Failed to retrieve academic schedule: {str(e)}"}

    async def close(self):
        """Close database connections."""
        if self._connection:
            # TODO: Implement connection cleanup
            pass


# Global repository instance
db_config = DatabaseConfig()
academic_repo = AcademicRepository(db_config)