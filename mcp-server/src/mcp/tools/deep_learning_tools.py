"""Deep Learning Tools for MIVA Academic MCP Server"""

import json
import sys
import os
import httpx
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from core.database import academic_repo

STUDY_BUDDY_API_BASE = "http://localhost:8083"


def register_deep_learning_tools(mcp):
    """Register all deep learning tools with the MCP server"""
    
    @mcp.tool()
    async def explain_concept_deeply(
        concept: str,
        course_code: str,
        student_id: str,
        explanation_style: str = "simple",
        include_examples: bool = True
    ) -> str:
        """Get a deep, multi-layered explanation of a concept from course materials.
        
        Provides comprehensive understanding through multiple explanation styles:
        - Simple: ELI5 (Explain Like I'm 5) explanation
        - Technical: Formal, precise definition with terminology
        - Visual: Description of diagrams, visual representations
        - Analogy: Real-world comparisons and metaphors
        
        Args:
            concept: The concept to explain (e.g., "recursion", "photosynthesis", "supply and demand")
            course_code: Course code (e.g., "CSC301", "BIO101")
            student_id: Student ID for enrollment verification
            explanation_style: Preferred style - "simple", "technical", "visual", "analogy", "all" (default: simple)
            include_examples: Include examples from course materials (default: True)
            
        Returns:
            Multi-perspective explanation with examples and related concepts
        """
        try:
            # Verify enrollment
            enrollments = await academic_repo.get_student_enrollments(student_id=student_id)
            if enrollments.get('error'):
                return json.dumps({"error": "Unable to verify enrollment"})
            
            # Get course info
            course_info = await academic_repo.get_course_info(course_code.upper())
            if course_info.get('error'):
                return json.dumps({"error": f"Course {course_code} not found"})
            
            course_id = course_info['id']
            
            # Check if student is enrolled
            enrolled_course_ids = [e['course_id'] for e in enrollments.get('enrollments', [])]
            if course_id not in enrolled_course_ids:
                return json.dumps({"error": f"You are not enrolled in {course_code}"})
            
            # Search for materials about this concept
            materials_result = await academic_repo.search_course_materials(
                query=concept,
                course_ids=[course_id],
                limit=5
            )
            
            # Build explanation prompt based on style
            style_prompts = {
                "simple": f"Explain '{concept}' in simple terms, as if teaching a beginner. Use everyday language.",
                "technical": f"Provide a precise, technical explanation of '{concept}' with formal definitions and terminology.",
                "visual": f"Describe '{concept}' visually. How would you draw or visualize this? What diagrams help understand it?",
                "analogy": f"Explain '{concept}' using real-world analogies and metaphors. Compare it to something familiar.",
                "all": f"Explain '{concept}' from multiple perspectives: simple explanation, technical definition, visual description, and real-world analogy."
            }
            
            selected_style = explanation_style.lower() if explanation_style.lower() in style_prompts else "simple"
            prompt = style_prompts[selected_style]
            
            # Call Study Buddy API
            async with httpx.AsyncClient() as client:
                payload = {
                    "question": prompt,
                    "course_id": str(course_id),
                    "difficulty_preference": "medium"
                }
                
                response = await client.post(
                    f"{STUDY_BUDDY_API_BASE}/chat/ask",
                    json=payload,
                    timeout=60.0
                )
                
                if response.status_code != 200:
                    return json.dumps({"error": f"Failed to generate explanation: {response.status_code}"})
                
                result = response.json()
            
            # Format response
            explanation = {
                'concept': concept,
                'course_code': course_code.upper(),
                'course_name': course_info.get('course_name', 'N/A'),
                'explanation_style': selected_style,
                'explanation': result['answer']
            }
            
            # Add examples from course materials if requested
            if include_examples and materials_result.get('materials'):
                explanation['examples_from_materials'] = []
                for material in materials_result['materials'][:3]:
                    explanation['examples_from_materials'].append({
                        'title': material['title'],
                        'type': material['material_type'],
                        'week': material.get('week_number', 'N/A'),
                        'excerpt': material.get('excerpt', material.get('ai_summary', '')[:150] + '...'),
                        'file_url': material.get('file_url', '')
                    })
            
            # Add related concepts if available from sources
            if result.get('sources'):
                explanation['related_materials'] = [
                    {
                        'title': s['title'],
                        'type': s['material_type'],
                        'relevance': f"{int((1 - s['similarity_score']) * 100)}%"
                    }
                    for s in result['sources'][:3]
                ]
            
            return json.dumps(explanation, indent=2)
            
        except httpx.TimeoutException:
            return json.dumps({"error": "Request timed out. Please try again."})
        except Exception as e:
            return json.dumps({"error": f"Failed to explain concept: {str(e)}"})
