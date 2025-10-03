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
                SELECT cm.id, cm.title, cm."materialType", cm."weekNumber", 
                       cm.description, cm."contentUrl", cm."createdAt",
                       apc."aiSummary", apc."keyConcepts"
                FROM course_material cm
                LEFT JOIN ai_processed_content apc ON cm.id = apc."courseMaterialId"
                JOIN course c ON cm."courseId" = c.id
                WHERE c."courseCode" = %s AND cm."isPublic" = true
            """
            params = [course_code.upper()]
            
            if week_number:
                query += " AND cm.\"weekNumber\" = %s"
                params.append(week_number)
            
            if material_type:
                query += " AND cm.\"materialType\" = %s"
                params.append(material_type)
            
            query += " ORDER BY cm.\"weekNumber\", cm.\"createdAt\""
            
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
                    "week_number": row["weekNumber"],
                    "material_type": row["materialType"],
                    "title": row["title"],
                    "description": row["description"],
                    "file_url": row["contentUrl"],
                    "upload_date": row["createdAt"].isoformat() if row["createdAt"] else None,
                    "ai_summary": row["aiSummary"],
                    "key_concepts": row["keyConcepts"]
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
        """Get upcoming assignments for a student."""
        # TODO: Implement actual database query
        
        # Sample assignment data
        assignments = [
            {
                "id": "1",
                "course_code": "CS101",
                "title": "Programming Assignment 1",
                "description": "Implement basic algorithms",
                "due_date": "2024-02-01",
                "due_time": "23:59",
                "points_possible": 100,
                "urgency": "soon",
                "days_until_due": 2,
                "status": "pending"
            },
            {
                "id": "2", 
                "course_code": "MATH201",
                "title": "Calculus Problem Set 3",
                "description": "Solve integration problems",
                "due_date": "2024-02-05",
                "due_time": "23:59", 
                "points_possible": 75,
                "urgency": "later",
                "days_until_due": 6,
                "status": "pending"
            }
        ]
        
        # Apply filters
        if course_code:
            assignments = [a for a in assignments if a["course_code"] == course_code.upper()]
        if not include_completed:
            assignments = [a for a in assignments if a["status"] != "completed"]
        
        # Filter by days ahead
        assignments = [a for a in assignments if a["days_until_due"] <= days_ahead]
        
        return {
            "student_id": student_id,
            "assignments": assignments,
            "total_count": len(assignments)
        }
    
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
                    SELECT c.id, c."courseCode", c.title, c.description, c.credits,
                           d.name as department_name, u.name as faculty_name
                    FROM course c
                    LEFT JOIN department d ON c."departmentId" = d.id
                    LEFT JOIN course_instructor ci ON c.id = ci."courseId" AND ci.role = 'primary'
                    LEFT JOIN faculty f ON ci."facultyId" = f.id
                    LEFT JOIN "user" u ON f."userId" = u.id
                    WHERE c."courseCode" = %s AND c."isActive" = true
                    LIMIT 1
                """, (course_code.upper(),))
                
                result = cursor.fetchone()
                
                if not result:
                    cursor.close()
                    conn.close()
                    return None, None
                
                course_info = {
                    "course_code": result["courseCode"],
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
                        WHERE cm."courseId" = %s AND cm."isPublic" = true
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
                    SELECT 1 FROM student_enrollment se
                    JOIN course c ON se."courseId" = c.id
                    WHERE se."studentId" = %s AND c."courseCode" = %s AND se.status = 'enrolled'
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
                    SELECT c."courseCode", c.title, c.credits, se."enrollmentDate", 
                           se.status, f.name as instructor_name, u.name as faculty_name
                    FROM student_enrollment se
                    JOIN course c ON se."courseId" = c.id
                    LEFT JOIN course_instructor ci ON c.id = ci."courseId"
                    LEFT JOIN faculty f ON ci."facultyId" = f.id
                    LEFT JOIN "user" u ON f."userId" = u.id
                    WHERE se."studentId" = %s AND se.status = 'enrolled'
                    ORDER BY c."courseCode"
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
                    "course_code": row["courseCode"],
                    "course_name": row["title"],
                    "credits": row["credits"],
                    "enrollment_date": row["enrollmentDate"].isoformat() if row["enrollmentDate"] else None,
                    "status": row["status"],
                    "instructor": row["faculty_name"] or "TBA"
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
        """Get details for a specific assignment."""
        return {
            "assignment_id": assignment_id,
            "title": f"Assignment {assignment_id}",
            "description": "Complete the programming exercise",
            "due_date": "2024-02-01",
            "course_code": "CS101",
            "points_possible": 100,
            "submission_status": "pending"
        }

    async def get_course_schedule(self, course_code: str, student_id: str) -> Dict[str, Any]:
        """Get schedule for a specific course."""
        await self._check_enrollment(student_id, course_code)
        return {
            "course_code": course_code,
            "schedule": [
                {
                    "day": "Monday",
                    "time": "10:00 AM - 11:30 AM",
                    "room": "Room 101",
                    "type": "lecture"
                },
                {
                    "day": "Wednesday", 
                    "time": "10:00 AM - 11:30 AM",
                    "room": "Room 101",
                    "type": "lecture"
                },
                {
                    "day": "Friday",
                    "time": "2:00 PM - 4:00 PM", 
                    "room": "Lab 202",
                    "type": "lab"
                }
            ]
        }

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
                    SELECT a.id, a.title, a.content, a."createdAt", u.name as author_name
                    FROM announcement a
                    JOIN course c ON a."courseId" = c.id
                    JOIN "user" u ON a."createdById" = u.id
                    WHERE c."courseCode" = %s AND a."isActive" = true
                    ORDER BY a."createdAt" DESC
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
                    "posted_date": row["createdAt"].isoformat() if row["createdAt"] else None,
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
    
    async def close(self):
        """Close database connections."""
        if self._connection:
            # TODO: Implement connection cleanup
            pass


# Global repository instance
db_config = DatabaseConfig()
academic_repo = AcademicRepository(db_config)