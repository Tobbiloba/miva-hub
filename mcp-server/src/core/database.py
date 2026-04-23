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
            self.database = os.getenv('DB_NAME', 'miva_hub')  # Changed from miva_academic
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
                    "id": result["id"],
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
    
    async def _get_student_context(self, student_id: str) -> Optional[Dict[str, Any]]:
        """Fetch student's current academic context for scoping queries.

        Returns:
            dict with: user_uuid, current_level, current_semester, academic_year,
                       program_id, enrollment_status
            Or None if student not found or not active.
        """
        conn = self.get_connection()
        if not conn:
            return None

        try:
            def run_query():
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT u.id, u.current_level, u.current_semester,
                           u.academic_year, u.program_id, u.enrollment_status
                    FROM "user" u
                    WHERE u.student_id = %s AND u.role = 'student'
                          AND u.enrollment_status = 'active'
                    LIMIT 1
                """, (student_id,))
                result = cursor.fetchone()
                cursor.close()
                conn.close()
                return result

            row = await asyncio.to_thread(run_query)
            if not row:
                return None

            return {
                "user_uuid": str(row["id"]),
                "current_level": row["current_level"],
                "current_semester": row["current_semester"],
                "academic_year": row["academic_year"],
                "program_id": str(row["program_id"]) if row["program_id"] else None,
                "enrollment_status": row["enrollment_status"],
            }
        except Exception as e:
            print(f"Error fetching student context: {e}")
            return None

    async def _verify_student_enrollment(self, student_id: str, course_code: str) -> bool:
        """Verify a student is enrolled in the given course (status = 'enrolled').

        Uses user.student_id (text) to look up the user, then checks student_enrollment.
        """
        conn = self.get_connection()
        if not conn:
            return False

        try:
            def run_query():
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT 1 FROM "user" u
                    JOIN student_enrollment se ON u.id = se.student_id
                    JOIN course c ON se.course_id = c.id
                    WHERE u.student_id = %s AND c.course_code = %s
                          AND se.status = 'enrolled'
                    LIMIT 1
                """, (student_id, course_code.upper()))
                result = cursor.fetchone()
                cursor.close()
                conn.close()
                return result

            result = await asyncio.to_thread(run_query)
            return result is not None
        except Exception as e:
            print(f"Error verifying enrollment: {e}")
            return False

    async def _check_enrollment(self, student_id: str, course_code: str) -> bool:
        """Legacy alias — delegates to _verify_student_enrollment."""
        return await self._verify_student_enrollment(student_id, course_code)

    async def get_student_enrollments(self, student_id: str, semester: Optional[str] = None) -> Dict[str, Any]:
        """Get all courses a student is enrolled in - real database implementation."""
        conn = self.get_connection()
        if not conn:
            return {"error": "Database connection failed"}
        
        try:
            # Run database operations in thread to avoid blocking event loop
            def run_query():
                cursor = conn.cursor()
                
                # Build query with optional semester filter
                query = """
                    SELECT c.id as course_id, c.course_code, c.title, c.credits, se.enrollment_date, 
                           se.status, u2.name as instructor_name
                    FROM "user" u1
                    JOIN student_enrollment se ON u1.id = se.student_id
                    JOIN course c ON se.course_id = c.id
                    LEFT JOIN course_instructor ci ON c.id = ci.course_id
                    LEFT JOIN faculty f ON ci.faculty_id = f.id
                    LEFT JOIN "user" u2 ON f.user_id = u2.id
                    WHERE u1.student_id = %s AND se.status = 'enrolled'
                """
                params = [student_id]
                
                # Add semester filter if provided
                if semester:
                    query += " AND se.semester = %s"
                    params.append(semester)
                
                query += " ORDER BY c.course_code"
                
                cursor.execute(query, params)
                
                results = cursor.fetchall()
                cursor.close()
                conn.close()
                return results
            
            results = await asyncio.to_thread(run_query)
            
            enrollments = []
            total_credits = 0
            
            for row in results:
                enrollment = {
                    "course_id": row["course_id"],
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
        """Get schedule for a specific course - real database implementation.

        Joins class_schedule -> course, LEFT JOINs course_instructor -> faculty -> user
        to include faculty name per schedule entry.
        """
        ctx = await self._get_student_context(student_id)
        if not ctx:
            return {"error": "Student context not found. Please log in again."}

        is_enrolled = await self._verify_student_enrollment(student_id, course_code)
        if not is_enrolled:
            return {"error": "You are not enrolled in this course this semester"}

        conn = self.get_connection()
        if not conn:
            return {"error": "Database connection failed"}

        try:
            def run_query():
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT cs.day_of_week, cs.start_time, cs.end_time,
                           cs.room_location, cs.building_name, cs.class_type,
                           c.course_code, c.title AS course_name,
                           u.name AS faculty_name
                    FROM class_schedule cs
                    JOIN course c ON cs.course_id = c.id
                    LEFT JOIN course_instructor ci ON c.id = ci.course_id AND ci.role = 'primary'
                    LEFT JOIN faculty f ON ci.faculty_id = f.id
                    LEFT JOIN "user" u ON f.user_id = u.id
                    WHERE c.course_code = %s
                    ORDER BY
                        CASE cs.day_of_week
                            WHEN 'monday' THEN 1 WHEN 'tuesday' THEN 2
                            WHEN 'wednesday' THEN 3 WHEN 'thursday' THEN 4
                            WHEN 'friday' THEN 5 WHEN 'saturday' THEN 6
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
                room_display = row["room_location"]
                if row["building_name"]:
                    room_display = f"{row['room_location']}, {row['building_name']}"

                schedule.append({
                    "day": row["day_of_week"].title(),
                    "time": f"{row['start_time']} - {row['end_time']}",
                    "room": room_display or "TBA",
                    "type": row["class_type"],
                    "faculty_name": row["faculty_name"] or "TBA",
                })

            return {
                "course_code": course_code,
                "course_name": results[0]["course_name"] if results else course_code,
                "schedule": schedule,
                "total_sessions": len(schedule),
            }

        except Exception as e:
            print(f"Error getting course schedule: {e}")
            return {"error": f"Failed to retrieve course schedule: {str(e)}"}

    async def get_course_announcements(
        self, course_code: Optional[str], student_id: str, limit: int = 10
    ) -> Dict[str, Any]:
        """Get announcements for a specific course or all enrolled courses.

        If course_code is provided, verify enrollment and return that course's announcements.
        If omitted, return announcements across all enrolled courses + global announcements.
        Filters: is_active = true, not expired, target_audience in ('all','students','course_specific').
        """
        ctx = await self._get_student_context(student_id)
        if not ctx:
            return {"error": "Student context not found. Please log in again."}

        if course_code:
            is_enrolled = await self._verify_student_enrollment(student_id, course_code)
            if not is_enrolled:
                return {"error": "You are not enrolled in this course this semester"}

        conn = self.get_connection()
        if not conn:
            return {"error": "Database connection failed"}

        try:
            def run_query():
                cursor = conn.cursor()

                if course_code:
                    cursor.execute("""
                        SELECT a.id, a.title, a.content, a.priority,
                               a.created_at, c.course_code, u.name AS author_name
                        FROM announcement a
                        JOIN course c ON a.course_id = c.id
                        LEFT JOIN "user" u ON a.created_by_id = u.id
                        WHERE c.course_code = %s
                              AND a.is_active = true
                              AND (a.expires_at IS NULL OR a.expires_at > CURRENT_TIMESTAMP)
                              AND a.target_audience IN ('all', 'students', 'course_specific')
                        ORDER BY a.created_at DESC
                        LIMIT %s
                    """, (course_code.upper(), limit))
                else:
                    # All announcements for student's enrolled courses + global
                    cursor.execute("""
                        SELECT a.id, a.title, a.content, a.priority,
                               a.created_at, c.course_code, u.name AS author_name
                        FROM announcement a
                        LEFT JOIN course c ON a.course_id = c.id
                        LEFT JOIN "user" u ON a.created_by_id = u.id
                        WHERE a.is_active = true
                              AND (a.expires_at IS NULL OR a.expires_at > CURRENT_TIMESTAMP)
                              AND a.target_audience IN ('all', 'students', 'course_specific')
                              AND (
                                  a.course_id IS NULL
                                  OR a.course_id IN (
                                      SELECT se.course_id FROM student_enrollment se
                                      WHERE se.student_id = %s AND se.status = 'enrolled'
                                  )
                              )
                        ORDER BY a.created_at DESC
                        LIMIT %s
                    """, (ctx["user_uuid"], limit))

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
                    "priority": row["priority"],
                    "posted_date": row["created_at"].isoformat() if row["created_at"] else None,
                    "course_code": row["course_code"],
                    "author": row["author_name"] or "System",
                })

            return {
                "course_code": course_code or "all",
                "announcements": announcements,
                "total_count": len(announcements),
            }

        except Exception as e:
            print(f"Error getting course announcements: {e}")
            return {"error": f"Failed to retrieve announcements: {str(e)}"}

    async def get_course_syllabus(self, course_code: str, student_id: str) -> Dict[str, Any]:
        """Get syllabus for a specific course.

        Primary: course_week records (week-by-week structure).
        Fallback: course_material WHERE material_type = 'syllabus'.
        Always includes course metadata.
        """
        ctx = await self._get_student_context(student_id)
        if not ctx:
            return {"error": "Student context not found. Please log in again."}

        is_enrolled = await self._verify_student_enrollment(student_id, course_code)
        if not is_enrolled:
            return {"error": "You are not enrolled in this course this semester"}

        conn = self.get_connection()
        if not conn:
            return {"error": "Database connection failed"}

        try:
            def run_query():
                cursor = conn.cursor()

                # Course metadata
                cursor.execute("""
                    SELECT c.id, c.course_code, c.title, c.description,
                           c.credits, c.total_weeks, c.level
                    FROM course c
                    WHERE c.course_code = %s AND c.is_active = true
                    LIMIT 1
                """, (course_code.upper(),))
                course_row = cursor.fetchone()
                if not course_row:
                    cursor.close()
                    conn.close()
                    return None, None, None

                course_id = course_row["id"]

                # Week-by-week structure
                cursor.execute("""
                    SELECT week_number, title, description,
                           learning_objectives, topics
                    FROM course_week
                    WHERE course_id = %s
                    ORDER BY week_number
                """, (course_id,))
                weeks = cursor.fetchall()

                # Fallback syllabus documents
                syllabus_docs = []
                if not weeks:
                    cursor.execute("""
                        SELECT id, title, description, content_url, week_number
                        FROM course_material
                        WHERE course_id = %s AND material_type = 'syllabus'
                              AND is_public = true
                        ORDER BY created_at
                    """, (course_id,))
                    syllabus_docs = cursor.fetchall()

                cursor.close()
                conn.close()
                return course_row, weeks, syllabus_docs

            course_row, weeks, syllabus_docs = await asyncio.to_thread(run_query)

            if not course_row:
                return {"error": f"Course {course_code} not found"}

            result = {
                "course_code": course_row["course_code"],
                "course_name": course_row["title"],
                "description": course_row["description"],
                "credits": course_row["credits"],
                "level": course_row["level"],
                "total_weeks": course_row["total_weeks"],
            }

            if weeks:
                result["weekly_structure"] = [
                    {
                        "week_number": w["week_number"],
                        "title": w["title"],
                        "learning_objectives": w["learning_objectives"],
                        "topics": w["topics"],
                    }
                    for w in weeks
                ]
            elif syllabus_docs:
                result["syllabus_documents"] = [
                    {
                        "id": d["id"],
                        "title": d["title"],
                        "description": d["description"],
                        "content_url": d["content_url"],
                        "week_number": d["week_number"],
                    }
                    for d in syllabus_docs
                ]
            else:
                result["note"] = "No syllabus or weekly structure has been published yet."

            return result

        except Exception as e:
            print(f"Error getting course syllabus: {e}")
            return {"error": f"Failed to retrieve course syllabus: {str(e)}"}

    async def get_faculty_info(self, course_code: str, student_id: str) -> Dict[str, Any]:
        """Get faculty information for a course.

        Joins course_instructor -> faculty -> user to return all instructors
        assigned to the course. Sorted by role priority (primary first).
        """
        ctx = await self._get_student_context(student_id)
        if not ctx:
            return {"error": "Student context not found. Please log in again."}

        is_enrolled = await self._verify_student_enrollment(student_id, course_code)
        if not is_enrolled:
            return {"error": "You are not enrolled in this course this semester"}

        conn = self.get_connection()
        if not conn:
            return {"error": "Database connection failed"}

        try:
            def run_query():
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT u.name, u.email, f.position, f.office_location,
                           f.office_hours, f.contact_phone, ci.role
                    FROM course_instructor ci
                    JOIN faculty f ON ci.faculty_id = f.id
                    JOIN "user" u ON f.user_id = u.id
                    JOIN course c ON ci.course_id = c.id
                    WHERE c.course_code = %s
                    ORDER BY
                        CASE ci.role
                            WHEN 'primary' THEN 1
                            WHEN 'assistant' THEN 2
                            WHEN 'lab_instructor' THEN 3
                            WHEN 'grader' THEN 4
                        END
                """, (course_code.upper(),))
                results = cursor.fetchall()
                cursor.close()
                conn.close()
                return results

            results = await asyncio.to_thread(run_query)

            faculty_list = []
            for row in results:
                # office_hours is stored as JSON array
                office_hours = row["office_hours"]
                if isinstance(office_hours, list):
                    office_hours_str = ", ".join(str(oh) for oh in office_hours) if office_hours else "By appointment"
                else:
                    office_hours_str = str(office_hours) if office_hours else "By appointment"

                faculty_list.append({
                    "name": row["name"],
                    "email": row["email"],
                    "title": row["position"],
                    "office": row["office_location"] or "TBA",
                    "office_hours": office_hours_str,
                    "phone": row["contact_phone"],
                    "role": row["role"],
                })

            return {
                "course_code": course_code,
                "faculty": faculty_list,
                "total_count": len(faculty_list),
            }

        except Exception as e:
            print(f"Error getting faculty info: {e}")
            return {"error": f"Failed to retrieve faculty info: {str(e)}"}
    
    async def get_course_videos(
        self, course_code: str, student_id: str,
        week_number: Optional[int] = None
    ) -> Dict[str, Any]:
        """Get video materials for a course.

        Queries course_material WHERE material_type = 'video' OR mime_type starts
        with 'video/'. Includes external URLs (YouTube, Coursera, etc.).
        """
        ctx = await self._get_student_context(student_id)
        if not ctx:
            return {"error": "Student context not found. Please log in again."}

        is_enrolled = await self._verify_student_enrollment(student_id, course_code)
        if not is_enrolled:
            return {"error": "You are not enrolled in this course this semester"}

        conn = self.get_connection()
        if not conn:
            return {"error": "Database connection failed"}

        try:
            def run_query():
                cursor = conn.cursor()
                query = """
                    SELECT cm.id, cm.title, cm.description, cm.content_url,
                           cm.public_url, cm.week_number, cm.material_type,
                           cm.mime_type, cm.file_size, cm.created_at
                    FROM course_material cm
                    JOIN course c ON cm.course_id = c.id
                    WHERE c.course_code = %s AND cm.is_public = true
                          AND (cm.material_type = 'lecture'
                               OR (cm.mime_type IS NOT NULL AND cm.mime_type LIKE 'video/%%'))
                """
                params: list = [course_code.upper()]

                if week_number is not None:
                    query += " AND cm.week_number = %s"
                    params.append(week_number)

                query += " ORDER BY cm.week_number NULLS LAST, cm.created_at"
                cursor.execute(query, params)
                results = cursor.fetchall()
                cursor.close()
                conn.close()
                return results

            results = await asyncio.to_thread(run_query)

            videos = []
            for row in results:
                # Prefer public_url (external), fall back to content_url (S3)
                url = row["public_url"] or row["content_url"]
                videos.append({
                    "id": row["id"],
                    "title": row["title"],
                    "description": row["description"],
                    "content_url": url,
                    "week_number": row["week_number"],
                    "material_type": row["material_type"],
                    "file_size": row["file_size"],
                    "upload_date": row["created_at"].isoformat() if row["created_at"] else None,
                })

            return {
                "course_code": course_code,
                "videos": videos,
                "total_count": len(videos),
            }

        except Exception as e:
            print(f"Error getting course videos: {e}")
            return {"error": f"Failed to retrieve course videos: {str(e)}"}

    async def get_reading_materials(
        self, course_code: str, student_id: str,
        week_number: Optional[int] = None
    ) -> Dict[str, Any]:
        """Get reading / document materials for a course.

        Includes material_type IN ('reading','syllabus','resource') and PDFs.
        Excludes videos and audio.
        """
        ctx = await self._get_student_context(student_id)
        if not ctx:
            return {"error": "Student context not found. Please log in again."}

        is_enrolled = await self._verify_student_enrollment(student_id, course_code)
        if not is_enrolled:
            return {"error": "You are not enrolled in this course this semester"}

        conn = self.get_connection()
        if not conn:
            return {"error": "Database connection failed"}

        try:
            def run_query():
                cursor = conn.cursor()
                query = """
                    SELECT cm.id, cm.title, cm.description, cm.content_url,
                           cm.public_url, cm.week_number, cm.material_type,
                           cm.mime_type, cm.file_size, cm.created_at
                    FROM course_material cm
                    JOIN course c ON cm.course_id = c.id
                    WHERE c.course_code = %s AND cm.is_public = true
                          AND (
                              cm.material_type IN ('reading', 'syllabus', 'resource')
                              OR cm.mime_type IN ('application/pdf', 'text/html')
                          )
                          AND (cm.mime_type IS NULL
                               OR cm.mime_type NOT LIKE 'video/%%')
                """
                params: list = [course_code.upper()]

                if week_number is not None:
                    query += " AND cm.week_number = %s"
                    params.append(week_number)

                query += " ORDER BY cm.week_number NULLS LAST, cm.created_at"
                cursor.execute(query, params)
                results = cursor.fetchall()
                cursor.close()
                conn.close()
                return results

            results = await asyncio.to_thread(run_query)

            materials = []
            for row in results:
                url = row["public_url"] or row["content_url"]
                materials.append({
                    "id": row["id"],
                    "title": row["title"],
                    "description": row["description"],
                    "content_url": url,
                    "week_number": row["week_number"],
                    "material_type": row["material_type"],
                    "file_size": row["file_size"],
                    "upload_date": row["created_at"].isoformat() if row["created_at"] else None,
                })

            return {
                "course_code": course_code,
                "materials": materials,
                "total_count": len(materials),
            }

        except Exception as e:
            print(f"Error getting reading materials: {e}")
            return {"error": f"Failed to retrieve reading materials: {str(e)}"}

    async def get_assignment_info(
        self, course_code: str, student_id: str
    ) -> Dict[str, Any]:
        """Get published assignments for a course with submission status per student.

        Joins assignment -> course, LEFT JOINs assignment_submission to determine
        whether the student has submitted and their grade.
        """
        ctx = await self._get_student_context(student_id)
        if not ctx:
            return {"error": "Student context not found. Please log in again."}

        is_enrolled = await self._verify_student_enrollment(student_id, course_code)
        if not is_enrolled:
            return {"error": "You are not enrolled in this course this semester"}

        conn = self.get_connection()
        if not conn:
            return {"error": "Database connection failed"}

        try:
            def run_query():
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT a.id, a.title, a.description, a.instructions,
                           a.due_date, a.total_points, a.assignment_type,
                           a.allow_late_submission, a.late_submission_penalty,
                           a.week_number,
                           asub.id AS submission_id,
                           asub.grade, asub.feedback, asub.submitted_at,
                           CASE
                               WHEN asub.id IS NOT NULL THEN 'submitted'
                               WHEN a.due_date < CURRENT_TIMESTAMP THEN 'overdue'
                               ELSE 'pending'
                           END AS submission_status
                    FROM assignment a
                    JOIN course c ON a.course_id = c.id
                    LEFT JOIN assignment_submission asub
                        ON a.id = asub.assignment_id AND asub.student_id = %s
                    WHERE c.course_code = %s AND a.is_published = true
                    ORDER BY a.due_date ASC
                """, (ctx["user_uuid"], course_code.upper()))
                results = cursor.fetchall()
                cursor.close()
                conn.close()
                return results

            results = await asyncio.to_thread(run_query)

            assignments = []
            for row in results:
                entry = {
                    "id": row["id"],
                    "title": row["title"],
                    "description": row["description"],
                    "instructions": row["instructions"],
                    "due_date": row["due_date"].isoformat() if row["due_date"] else None,
                    "total_points": float(row["total_points"]) if row["total_points"] else 0,
                    "assignment_type": row["assignment_type"],
                    "allow_late_submission": row["allow_late_submission"],
                    "late_submission_penalty": float(row["late_submission_penalty"]) if row["late_submission_penalty"] else 0,
                    "week_number": row["week_number"],
                    "submission_status": row["submission_status"],
                }
                if row["submission_id"]:
                    entry["grade"] = float(row["grade"]) if row["grade"] else None
                    entry["feedback"] = row["feedback"]
                    entry["submitted_at"] = row["submitted_at"].isoformat() if row["submitted_at"] else None

                assignments.append(entry)

            return {
                "course_code": course_code,
                "assignments": assignments,
                "total_count": len(assignments),
            }

        except Exception as e:
            print(f"Error getting assignment info: {e}")
            return {"error": f"Failed to retrieve assignment info: {str(e)}"}

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

    async def search_course_materials(
        self,
        query: str,
        course_ids: List[str],
        limit: int = 10,
        material_type: Optional[str] = None,
        week_number: Optional[int] = None
    ) -> Dict[str, Any]:
        """Search across course materials using full-text search."""
        conn = self.get_connection()
        if not conn:
            return {"error": "Database connection failed"}
        
        try:
            cursor = conn.cursor()
            
            # Build full-text search query
            search_query = """
                SELECT cm.id, cm.title, cm.material_type, cm.week_number,
                       cm.description, cm.content_url as file_url, cm.created_at as upload_date,
                       c.course_code, c.title as course_name,
                       apc.ai_summary,
                       ts_rank(
                           to_tsvector('english', cm.title || ' ' || COALESCE(cm.description, '') || ' ' || COALESCE(apc.ai_summary, '')),
                           plainto_tsquery('english', %s)
                       ) AS relevance_score
                FROM course_material cm
                JOIN course c ON cm.course_id = c.id
                LEFT JOIN ai_processed_content apc ON cm.id = apc.course_material_id
                WHERE cm.course_id::text = ANY(%s::text[])
                AND to_tsvector('english', cm.title || ' ' || COALESCE(cm.description, '') || ' ' || COALESCE(apc.ai_summary, ''))
                    @@ plainto_tsquery('english', %s)
            """
            
            params = [query, course_ids, query]
            
            if material_type:
                search_query += " AND cm.material_type = %s"
                params.append(material_type)
            
            if week_number:
                search_query += " AND cm.week_number = %s"
                params.append(week_number)
            
            search_query += " ORDER BY relevance_score DESC LIMIT %s"
            params.append(limit)
            
            cursor.execute(search_query, params)
            results = cursor.fetchall()
            
            materials = []
            for row in results:
                material = dict(row)
                # Convert datetime to string for JSON serialization
                if 'upload_date' in material and material['upload_date']:
                    material['upload_date'] = material['upload_date'].isoformat()
                # Extract excerpt from summary
                if material.get('ai_summary'):
                    summary = material['ai_summary']
                    if query.lower() in summary.lower():
                        idx = summary.lower().index(query.lower())
                        start = max(0, idx - 50)
                        end = min(len(summary), idx + 150)
                        material['excerpt'] = '...' + summary[start:end] + '...'
                materials.append(material)
            
            cursor.close()
            conn.close()
            
            return {
                "total_results": len(materials),
                "materials": materials
            }
            
        except Exception as e:
            print(f"Error searching course materials: {e}")
            conn.close()
            return {"error": f"Search failed: {str(e)}"}
    
    async def get_material_by_id(self, material_id: str) -> Dict[str, Any]:
        """Get a single material by ID with full details."""
        conn = self.get_connection()
        if not conn:
            return {"error": "Database connection failed"}
        
        try:
            cursor = conn.cursor()
            
            query = """
                SELECT cm.id, cm.title, cm.material_type, cm.week_number,
                       cm.description, cm.content_url, cm.created_at,
                       c.course_code, c.title as course_name,
                       apc.ai_summary, apc.key_concepts
                FROM course_material cm
                JOIN course c ON cm.course_id = c.id
                LEFT JOIN ai_processed_content apc ON cm.id = apc.course_material_id
                WHERE cm.id = %s
            """
            
            cursor.execute(query, [material_id])
            result = cursor.fetchone()
            
            cursor.close()
            conn.close()
            
            if not result:
                return {"error": "Material not found"}
            
            material = dict(result)
            # Map content_url to file_url for API consistency
            if 'content_url' in material:
                material['file_url'] = material['content_url']
            # Map created_at to upload_date for API consistency  
            if 'created_at' in material:
                material['upload_date'] = material['created_at']
            
            return material
            
        except Exception as e:
            print(f"Error getting material by ID: {e}")
            conn.close()
            return {"error": f"Failed to retrieve material: {str(e)}"}
    
    async def close(self):
        """Close database connections."""
        if self._connection:
            # TODO: Implement connection cleanup
            pass


# Global repository instance
db_config = DatabaseConfig()
academic_repo = AcademicRepository(db_config)