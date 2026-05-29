"""Progress Tracking Tools for MIVA Academic MCP Server"""

import json
import sys
import os
import logging

logger = logging.getLogger(__name__)

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from core.database import academic_repo


def register_progress_tools(mcp):
    """Register progress tracking tools with the MCP server"""

    @mcp.tool()
    async def get_my_progress(
        student_id: str,
        course_code: str | None = None,
    ) -> str:
        """Show the student their study progress — streak, activities, course coverage, week-by-week breakdown.

        Use when the student asks "how am I doing", "show my progress",
        "what have I studied this week", "am I behind in X", "my study streak",
        or similar phrasing about their own study activity.

        Args:
            student_id: Student ID (e.g., MIVA/CS/2024/001)
            course_code: Optional course filter (e.g., COS201). If omitted, returns overview across all enrolled courses.

        Returns:
            JSON with streak_days, activities_today, activities_this_week, and per-course coverage (coverage_pct, weeks_touched, weeks_untouched)
        """
        try:
            result = await academic_repo.get_my_progress(
                student_id=student_id,
                course_code=course_code.upper() if course_code else None,
            )
            return json.dumps(result, indent=2, default=str)
        except Exception as e:
            logger.error("Tool get_my_progress failed: %s", e, exc_info=True)
            return json.dumps({"error": "Could not retrieve progress data. Please try again."})
