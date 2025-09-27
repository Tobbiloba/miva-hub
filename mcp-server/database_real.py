"""Database connection and configuration for MIVA Academic MCP Server."""

import os
import asyncio
from typing import Any, Dict, List, Optional
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from datetime import datetime, timedelta

# Load environment variables
load_dotenv()

# Try to import psycopg2, fall back to placeholder if not available
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    from psycopg2 import pool
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False
    print("⚠️  psycopg2 not available - using placeholder data")


class DatabaseConfig:
    """Database configuration class."""
    
    def __init__(self):
        self.database_url = os.getenv('DATABASE_URL')
        self.host = os.getenv('DB_HOST', 'localhost')
        self.port = int(os.getenv('DB_PORT', '5432'))
        self.database = os.getenv('DB_NAME', 'miva_academic')
        self.user = os.getenv('DB_USER', 'postgres')
        self.password = os.getenv('DB_PASSWORD', '')


class AcademicRepository:
    """Repository class for academic database operations."""
    
    def __init__(self, config: DatabaseConfig):
        self.config = config
        self._connection_pool = None
        self._initialize_connection()
    
    def _initialize_connection(self):
        """Initialize database connection pool."""
        if not PSYCOPG2_AVAILABLE:
            print("📝 Database: Using placeholder data (psycopg2 not installed)")
            return
            
        try:
            if self.config.database_url:
                # Use DATABASE_URL if provided
                self._connection_pool = psycopg2.pool.SimpleConnectionPool(
                    1, 20, self.config.database_url
                )
            else:
                # Use individual connection parameters
                self._connection_pool = psycopg2.pool.SimpleConnectionPool(
                    1, 20,
                    host=self.config.host,
                    port=self.config.port,
                    database=self.config.database,
                    user=self.config.user,
                    password=self.config.password
                )
            print("✅ Database: PostgreSQL connection pool initialized")
        except Exception as e:
            print(f"⚠️  Database: Connection failed, using placeholder data - {e}")
            self._connection_pool = None
    
    def _get_connection(self):
        """Get connection from pool."""
        if self._connection_pool:
            try:
                return self._connection_pool.getconn()
            except Exception as e:
                print(f"⚠️  Database: Failed to get connection - {e}")
                return None
        return None
    
    def _return_connection(self, conn):
        """Return connection to pool."""
        if self._connection_pool and conn:
            try:
                self._connection_pool.putconn(conn)
            except Exception as e:
                print(f"⚠️  Database: Failed to return connection - {e}")
    
    def _execute_query(self, query: str, params: tuple = None) -> List[Dict[str, Any]]:
        """Execute a query and return results."""
        if not self._connection_pool:
            return []
            
        conn = self._get_connection()
        if not conn:
            return []
            
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query, params or ())
                results = cursor.fetchall()
                return [dict(row) for row in results]
        except Exception as e:
            print(f"⚠️  Database query error: {e}")
            return []
        finally:
            self._return_connection(conn)
    
    async def get_course_materials(
        self,
        course_code: str,
        student_id: str,
        week_number: Optional[int] = None,
        material_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get course materials for a student."""
        # Check enrollment first
        is_enrolled = await self._check_enrollment(student_id, course_code)
        if not is_enrolled:
            return {
                "error": "Access denied: Student not enrolled in this course",
                "course_code": course_code,
                "student_id": student_id
            }
        
        # If database is available, query real data
        if self._connection_pool:
            query = """
                SELECT cm.id, cm.week_number, cm.title, cm.material_type, 
                       cm.description, cm.file_url, cm.file_size, cm.pages, 
                       cm.duration, cm.created_at
                FROM course_materials cm
                JOIN courses c ON cm.course_id = c.id
                WHERE c.course_code = %s
            """
            params = [course_code.upper()]
            
            if week_number:
                query += " AND cm.week_number = %s"
                params.append(week_number)
            
            if material_type:
                query += " AND cm.material_type = %s"
                params.append(material_type)
            
            query += " ORDER BY cm.week_number, cm.created_at"
            
            materials = self._execute_query(query, tuple(params))
            
            return {
                "course_code": course_code,
                "materials": materials,
                "total_count": len(materials)
            }
        
        # Fallback to placeholder data
        materials = [
            {
                "id": "1",
                "week_number": 1,
                "material_type": "video",
                "title": f"{course_code} Week 1 Introductory Video",
                "description": "Introduction to course concepts",
                "file_url": f"/videos/{course_code.lower()}_week1_intro.mp4",
                "duration": "45 minutes"
            }
        ]
        
        # Apply filters for placeholder data
        if week_number:
            materials = [m for m in materials if m["week_number"] == week_number]
        if material_type:
            materials = [m for m in materials if m["material_type"] == material_type]
        
        return {
            "course_code": course_code,
            "materials": materials,
            "total_count": len(materials)
        }
    
    async def get_upcoming_assignments(
        self,
        student_id: str,
        days_ahead: int = 7,
        course_code: Optional[str] = None,
        include_completed: bool = False
    ) -> Dict[str, Any]:
        """Get upcoming assignments for a student."""
        if self._connection_pool:
            query = """
                SELECT a.id, c.course_code, a.title, a.description, a.assignment_type,
                       a.due_date, a.attempts_allowed, a.time_limit, a.weight, a.status,
                       EXTRACT(DAYS FROM (a.due_date - NOW())) as days_until_due
                FROM assignments a
                JOIN courses c ON a.course_id = c.id
                JOIN enrollments e ON c.id = e.course_id
                JOIN students s ON e.student_id = s.id
                WHERE s.student_id = %s
                AND a.due_date >= NOW()
                AND a.due_date <= NOW() + INTERVAL '%s days'
            """
            params = [student_id, days_ahead]
            
            if course_code:
                query += " AND c.course_code = %s"
                params.append(course_code.upper())
            
            if not include_completed:
                query += " AND a.status != 'completed'"
            
            query += " ORDER BY a.due_date, a.created_at"
            
            assignments = self._execute_query(query, tuple(params))
            
            # Add urgency classification
            for assignment in assignments:
                days_until = assignment.get('days_until_due', 999)
                if days_until < 0:
                    assignment['urgency'] = 'overdue'
                elif days_until <= 1:
                    assignment['urgency'] = 'urgent'
                elif days_until <= 3:
                    assignment['urgency'] = 'soon'
                else:
                    assignment['urgency'] = 'later'
            
            return {
                "student_id": student_id,
                "assignments": assignments,
                "total_count": len(assignments)
            }
        
        # Fallback to placeholder data
        assignments = [
            {
                "id": "1",
                "course_code": "COS202",
                "title": "Week 1: Practice Assessment (Ungraded)",
                "description": "Practice quiz to review advanced OOP concepts",
                "assignment_type": "practice",
                "due_date": "2025-05-05T23:59:00Z",
                "attempts_allowed": 2,
                "time_limit": "60 minutes",
                "weight": "0%",
                "status": "available",
                "days_until_due": 2,
                "urgency": "soon"
            }
        ]
        
        return {
            "student_id": student_id,
            "assignments": assignments,
            "total_count": len(assignments)
        }
    
    async def get_course_info(self, course_code: str) -> Dict[str, Any]:
        """Get detailed course information."""
        if self._connection_pool:
            query = """
                SELECT c.course_code, c.course_name, c.description, c.credits,
                       c.level, c.semester, d.name as department_name,
                       CONCAT(f.title, ' ', f.first_name, ' ', f.last_name) as coordinator_name,
                       f.email as coordinator_email
                FROM courses c
                LEFT JOIN departments d ON c.department_id = d.id
                LEFT JOIN faculty f ON c.coordinator_id = f.id
                WHERE c.course_code = %s
            """
            results = self._execute_query(query, (course_code.upper(),))
            
            if results:
                course_info = results[0]
                return {
                    "course_code": course_info['course_code'],
                    "course_name": course_info['course_name'],
                    "description": course_info['description'],
                    "credits": course_info['credits'],
                    "level": course_info['level'],
                    "semester": course_info['semester'],
                    "department": course_info['department_name'],
                    "coordinator": course_info['coordinator_name'],
                    "coordinator_email": course_info['coordinator_email']
                }
        
        # Fallback to placeholder data
        return {
            "course_code": course_code,
            "course_name": f"Sample Course {course_code}",
            "description": "Course description placeholder",
            "credits": 3,
            "level": "200",
            "semester": "Fall 2024",
            "department": "School of Computing",
            "coordinator": "Dr. Sample Professor",
            "coordinator_email": "professor@miva.edu.ng"
        }
    
    async def get_course_announcements(
        self,
        course_code: str,
        student_id: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get course announcements."""
        if self._connection_pool:
            query = """
                SELECT a.id, a.title, a.content, a.posted_date, a.priority, a.category,
                       CONCAT(f.title, ' ', f.first_name, ' ', f.last_name) as posted_by
                FROM announcements a
                JOIN courses c ON a.course_id = c.id
                LEFT JOIN faculty f ON a.posted_by = f.id
                WHERE c.course_code = %s
                ORDER BY a.posted_date DESC
                LIMIT %s
            """
            return self._execute_query(query, (course_code.upper(), limit))
        
        # Fallback to placeholder data
        return [
            {
                "id": "1",
                "title": f"Welcome to {course_code}",
                "content": "Welcome to the new semester!",
                "posted_date": "2024-08-15T09:00:00Z",
                "posted_by": "Dr. Sample Professor",
                "priority": "high",
                "category": "general"
            }
        ]
    
    async def get_faculty_by_course(self, course_code: str) -> List[Dict[str, Any]]:
        """Get faculty information for a course."""
        if self._connection_pool:
            query = """
                SELECT DISTINCT f.staff_id, f.first_name, f.last_name, f.title,
                       f.email, f.office_location, f.office_hours, f.specialization,
                       CASE WHEN c.coordinator_id = f.id THEN 'Course Coordinator' ELSE 'Lecturer' END as role
                FROM faculty f
                JOIN courses c ON (c.coordinator_id = f.id OR c.department_id = f.department_id)
                WHERE c.course_code = %s
                ORDER BY (c.coordinator_id = f.id) DESC, f.last_name
            """
            return self._execute_query(query, (course_code.upper(),))
        
        # Fallback to placeholder data
        return [
            {
                "staff_id": "AI001",
                "first_name": "Augustus",
                "last_name": "Isichei",
                "title": "Dr.",
                "email": "a.isichei@miva.edu.ng",
                "office_location": "Computing Building, Room 301",
                "office_hours": "Monday/Wednesday 2:00-4:00 PM",
                "specialization": "Object-Oriented Programming, Software Engineering",
                "role": "Course Coordinator"
            }
        ]
    
    async def _check_enrollment(self, student_id: str, course_code: str) -> bool:
        """Check if student is enrolled in course."""
        if self._connection_pool:
            query = """
                SELECT 1 FROM enrollments e
                JOIN students s ON e.student_id = s.id
                JOIN courses c ON e.course_id = c.id
                WHERE s.student_id = %s AND c.course_code = %s AND e.status = 'active'
            """
            results = self._execute_query(query, (student_id, course_code.upper()))
            return len(results) > 0
        
        # For testing, always return True
        return True
    
    async def close(self):
        """Close database connections."""
        if self._connection_pool:
            try:
                self._connection_pool.closeall()
                print("✅ Database: Connection pool closed")
            except Exception as e:
                print(f"⚠️  Database: Error closing connections - {e}")


# Global repository instance
db_config = DatabaseConfig()
academic_repo = AcademicRepository(db_config)