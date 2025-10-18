"""Content Navigation Tools for MIVA Academic MCP Server"""

import json
import sys
import os
from typing import Optional
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from core.database import academic_repo


def register_content_navigation_tools(mcp):
    """Register all content navigation tools with the MCP server"""
    
    @mcp.tool()
    async def summarize_material(
        material_id: str,
        summary_length: str = "medium",
        focus_topics: str = ""
    ) -> str:
        """Get a condensed summary of a specific course material.
        
        Summarizes lecture notes, readings, or videos into key points. Perfect for
        quick review or understanding main concepts without reading everything.
        
        Args:
            material_id: ID of the material to summarize
            summary_length: Length of summary - "brief" (3-5 bullets), "medium" (1-2 paragraphs), "detailed" (full breakdown)
            focus_topics: Optional comma-separated topics to focus on (e.g., "loops, functions")
            
        Returns:
            Formatted summary with key points, main concepts, and examples
        """
        try:
            # Fetch material
            material = await academic_repo.get_material_by_id(material_id)
            
            if material.get('error'):
                return json.dumps({"error": f"Material not found: {material.get('error')}"})
            
            # Check if AI summary exists
            ai_summary = material.get('ai_summary', '')
            if not ai_summary:
                return json.dumps({
                    "error": "No summary available for this material yet. Try again after processing completes."
                })
            
            # Adjust summary based on length
            summary_result = {
                'material_id': material_id,
                'title': material.get('title', 'Untitled'),
                'course_name': material.get('course_name', 'N/A'),
                'material_type': material.get('material_type', 'N/A'),
                'week_number': material.get('week_number', 'N/A'),
                'summary_length': summary_length
            }
            
            # Parse focus topics if provided
            focus_list = [t.strip() for t in focus_topics.split(',') if t.strip()] if focus_topics else []
            
            if summary_length == "brief":
                # Extract key bullet points (first 5 sentences)
                sentences = ai_summary.split('. ')[:5]
                summary_result['summary'] = '\n'.join(f"• {s.strip()}." for s in sentences if s.strip())
                
            elif summary_length == "detailed":
                # Full AI summary
                summary_result['summary'] = ai_summary
                
                # Add structured content if available
                if material.get('structured_content'):
                    summary_result['structured_content'] = material['structured_content']
                    
            else:  # medium (default)
                # 1-2 paragraph summary
                paragraphs = ai_summary.split('\n\n')[:2]
                summary_result['summary'] = '\n\n'.join(paragraphs)
            
            # If focus topics specified, extract relevant sections
            if focus_list:
                filtered_summary = []
                for topic in focus_list:
                    # Find sentences mentioning the topic
                    relevant_sentences = [
                        s for s in ai_summary.split('. ') 
                        if topic.lower() in s.lower()
                    ]
                    if relevant_sentences:
                        filtered_summary.append(f"**{topic}:**\n" + '\n'.join(f"• {s.strip()}." for s in relevant_sentences[:3]))
                
                if filtered_summary:
                    summary_result['focused_summary'] = '\n\n'.join(filtered_summary)
            
            # Add metadata
            summary_result['file_url'] = material.get('file_url', '')
            summary_result['public_url'] = material.get('public_url', '')
            
            return json.dumps(summary_result, indent=2)
            
        except Exception as e:
            return json.dumps({"error": f"Failed to summarize material: {str(e)}"})
