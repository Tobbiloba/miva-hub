"""Notes Conversion Tools for MIVA Academic MCP Server"""

import json
import sys
import os
from typing import Optional
import httpx
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from core.database import academic_repo

STUDY_BUDDY_API_BASE = "http://localhost:8083"


def register_notes_conversion_tools(mcp):
    @mcp.tool()
    async def convert_notes_to_flashcards(
        notes_text: str,
        student_id: str,
        course_code: str,
        title: str = "My Notes",
        card_count: int = 20,
        focus_areas: str = "all"
    ) -> str:
        try:
            course_info = await academic_repo.get_course_info(course_code.upper())
            if course_info.get('error'):
                return json.dumps({"error": f"Course {course_code} not found"})
            
            course_id = course_info['id']
            
            card_count = max(5, min(50, card_count))
            
            async with httpx.AsyncClient() as client:
                payload = {
                    "notes_text": notes_text,
                    "student_id": student_id,
                    "course_id": str(course_id),
                    "title": title,
                    "card_count": card_count,
                    "focus_areas": focus_areas
                }
                
                response = await client.post(
                    f"{STUDY_BUDDY_API_BASE}/flashcards/from_notes",
                    json=payload,
                    timeout=90.0
                )
                
                if response.status_code != 200:
                    return json.dumps({"error": f"Failed to convert notes: {response.status_code}"})
                
                result = response.json()
            
            flashcards_output = {
                'flashcards_id': result['flashcards_id'],
                'course_code': course_code.upper(),
                'course_name': course_info.get('title', 'N/A'),
                'title': title,
                'total_cards': result['total_cards'],
                'cards': result['cards'],
                'focus_areas': focus_areas,
                'export_formats': result.get('export_formats', ["json", "csv", "anki", "quizlet"]),
                'created_at': result['created_at']
            }
            
            return json.dumps(flashcards_output, indent=2)
            
        except httpx.TimeoutException:
            return json.dumps({"error": "Note conversion timed out. Try with shorter notes."})
        except Exception as e:
            return json.dumps({"error": f"Failed to convert notes: {str(e)}"})
    
    
    @mcp.tool()
    async def export_flashcards(
        flashcards_id: str,
        format: str = "json"
    ) -> str:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{STUDY_BUDDY_API_BASE}/flashcards/export/{flashcards_id}",
                    params={"format": format},
                    timeout=15.0
                )
                
                if response.status_code != 200:
                    return json.dumps({"error": f"Failed to export flashcards: {response.status_code}"})
                
                if format == "json":
                    return json.dumps(response.json(), indent=2)
                else:
                    return response.text
                
        except Exception as e:
            return json.dumps({"error": f"Failed to export flashcards: {str(e)}"})
