"""Exam Simulator Tools for MIVA Academic MCP Server"""

import json
import sys
import os
from typing import Optional
import httpx
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from core.database import academic_repo
from tools.exam_config import get_exam_template, get_exam_instructions, generate_grading_rubric

# Import usage tracking
from core.usage_tracker import usage_tracker, create_usage_error_response

STUDY_BUDDY_API_BASE = "http://localhost:8083"


def register_exam_tools(mcp):
    @mcp.tool()
    async def generate_exam_simulator(
        course_code: str,
        student_id: str,
        exam_type: str = "midterm",
        weeks_covered: Optional[str] = None,
        include_answer_key: bool = False
    ) -> str:
        # Check usage limit before processing
        if student_id:
            allowed, usage_info = await usage_tracker.check_and_enforce_usage(
                student_id, "exams_per_month", "monthly"
            )
            if not allowed:
                return create_usage_error_response(usage_info, "generate_exam_simulator")
        
        try:
            enrollments = await academic_repo.get_student_enrollments(student_id=student_id)
            if enrollments.get('error'):
                return json.dumps({"error": "Unable to verify enrollment"})
            
            course_info = await academic_repo.get_course_info(course_code.upper())
            if course_info.get('error'):
                return json.dumps({"error": f"Course {course_code} not found"})
            
            course_id = course_info['id']
            
            enrolled_course_ids = [e['course_id'] for e in enrollments.get('enrollments', [])]
            if course_id not in enrolled_course_ids:
                return json.dumps({"error": f"You are not enrolled in {course_code}"})
            
            template = get_exam_template(exam_type)
            
            async with httpx.AsyncClient() as client:
                payload = {
                    "course_id": str(course_id),
                    "exam_type": exam_type,
                    "weeks_covered": weeks_covered,
                    "question_count": template["question_count"],
                    "difficulty_mix": template["difficulty_mix"],
                    "question_types": template["question_types"]
                }
                
                response = await client.post(
                    f"{STUDY_BUDDY_API_BASE}/exam/generate",
                    json=payload,
                    timeout=120.0
                )
                
                if response.status_code != 200:
                    return json.dumps({"error": f"Failed to generate exam: {response.status_code}"})
                
                result = response.json()
            
            exam_output = {
                'exam_id': result['exam_id'],
                'course_code': course_code.upper(),
                'course_name': course_info.get('title', 'N/A'),
                'exam_type': exam_type,
                'time_limit_minutes': template['duration_minutes'],
                'total_questions': len(result['questions']),
                'instructions': get_exam_instructions(exam_type, template),
                'questions': result['questions'] if not include_answer_key else result['questions_with_answers'],
                'grading_rubric': result['grading_rubric']
            }
            
            if not include_answer_key:
                for q in exam_output['questions']:
                    if 'correct_answer' in q:
                        del q['correct_answer']
                    if 'explanation' in q:
                        del q['explanation']
            
            # Record usage after successful execution
            if student_id:
                await usage_tracker.record_usage_after_success(
                    student_id, "exams_per_month", "monthly"
                )
            
            return json.dumps(exam_output, indent=2)
            
        except httpx.TimeoutException:
            return json.dumps({"error": "Exam generation timed out. Please try again."})
        except Exception as e:
            return json.dumps({"error": f"Failed to generate exam: {str(e)}"})
    
    
    @mcp.tool()
    async def submit_exam_answers(
        exam_id: str,
        student_id: str,
        answers: str,
        time_taken_minutes: int
    ) -> str:
        # Check usage limit before processing (also counts towards exam usage)
        if student_id:
            allowed, usage_info = await usage_tracker.check_and_enforce_usage(
                student_id, "exams_per_month", "monthly"
            )
            if not allowed:
                return create_usage_error_response(usage_info, "submit_exam_answers")
        
        try:
            async with httpx.AsyncClient() as client:
                payload = {
                    "exam_id": exam_id,
                    "student_id": student_id,
                    "answers": json.loads(answers),
                    "time_taken_minutes": time_taken_minutes
                }
                
                response = await client.post(
                    f"{STUDY_BUDDY_API_BASE}/exam/submit",
                    json=payload,
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    return json.dumps({"error": f"Failed to submit exam: {response.status_code}"})
                
                result = response.json()
            
            performance = {
                'exam_id': exam_id,
                'student_id': student_id,
                'score_percentage': result['score_percentage'],
                'correct_answers': result['correct_answers'],
                'total_questions': result['total_questions'],
                'time_taken_minutes': time_taken_minutes,
                'grade': result['grade'],
                'per_question_results': result['per_question_results'],
                'weak_areas': result.get('weak_areas', []),
                'recommendations': result.get('recommendations', [])
            }
            
            # Record usage after successful submission
            if student_id:
                await usage_tracker.record_usage_after_success(
                    student_id, "exams_per_month", "monthly"
                )
            
            return json.dumps(performance, indent=2)
            
        except Exception as e:
            return json.dumps({"error": f"Failed to submit exam: {str(e)}"})
