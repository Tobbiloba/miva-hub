"""
Verification script for MIVA Academic MCP tools.

Imports the tool handlers directly and calls them with test parameters.
Requires a running PostgreSQL database with the MIVA schema.

Usage:
    cd mcp-server
    python -m scripts.verify_tools

Without seed data, tools will return expected error responses (e.g.,
"Student context not found"). The script validates response shape and
error handling rather than data correctness.
"""

import asyncio
import json
import sys
import os

# Add src to path so we can import modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from core.database import academic_repo

# Test parameters — replace with real seeded student when available
TEST_STUDENT_ID = "TEST-STU-001"
TEST_COURSE_CODE = "COS201"

# Expected errors when no seed data exists
NO_CONTEXT_ERROR = "Student context not found"
NOT_ENROLLED_ERROR = "not enrolled"
EXPECTED_ERRORS = {NO_CONTEXT_ERROR, NOT_ENROLLED_ERROR}


def is_expected_error(result: dict) -> bool:
    """Check if the error is an expected one (no seed data)."""
    err = result.get("error", "")
    return any(exp in err for exp in EXPECTED_ERRORS)


def check_no_db_leak(result: dict) -> bool:
    """Verify no database internals leaked in error messages."""
    err = str(result.get("error", ""))
    leak_indicators = [
        "psycopg2", "column", "relation", "syntax error",
        "does not exist", "permission denied", "DETAIL:",
        "port 5432", "connection refused",
    ]
    for indicator in leak_indicators:
        if indicator.lower() in err.lower():
            return False
    return True


async def verify_tool(name: str, coro, expected_keys: list[str]) -> dict:
    """Run a single tool verification.

    Returns:
        dict with: tool, status (PASS/FAIL/SKIP), reason
    """
    try:
        result = await coro
        if isinstance(result, str):
            result = json.loads(result)

        # Check for DB internal leaks
        if not check_no_db_leak(result):
            return {"tool": name, "status": "FAIL", "reason": f"DB internals leaked: {result.get('error', '')[:80]}"}

        # If error, check if expected
        if "error" in result:
            if is_expected_error(result):
                return {"tool": name, "status": "SKIP", "reason": f"Expected error (no seed data): {result['error'][:60]}"}
            # Could be DB connection issue
            err = result["error"]
            if "Service temporarily unavailable" in err or "Database connection" in err:
                return {"tool": name, "status": "SKIP", "reason": "Database not available"}
            return {"tool": name, "status": "FAIL", "reason": f"Unexpected error: {err[:80]}"}

        # Check expected keys are present
        missing = [k for k in expected_keys if k not in result]
        if missing:
            return {"tool": name, "status": "FAIL", "reason": f"Missing keys: {missing}"}

        return {"tool": name, "status": "PASS", "reason": f"OK — {len(result)} top-level keys"}

    except Exception as e:
        return {"tool": name, "status": "FAIL", "reason": f"Exception: {str(e)[:80]}"}


async def main():
    print("=" * 60)
    print("MIVA Academic MCP — Tool Verification")
    print("=" * 60)
    print(f"Test student_id: {TEST_STUDENT_ID}")
    print(f"Test course_code: {TEST_COURSE_CODE}")
    print()

    tests = [
        ("get_course_materials", academic_repo.get_course_materials(TEST_COURSE_CODE, TEST_STUDENT_ID), ["course_code", "materials"]),
        ("get_upcoming_assignments", academic_repo.get_upcoming_assignments(TEST_STUDENT_ID), ["student_id", "assignments"]),
        ("get_course_info", academic_repo.get_course_info(TEST_COURSE_CODE), ["course_code", "course_name"]),
        ("list_enrolled_courses", academic_repo.get_student_enrollments(TEST_STUDENT_ID), ["student_id", "enrollments"]),
        ("get_course_schedule", academic_repo.get_course_schedule(TEST_COURSE_CODE, TEST_STUDENT_ID), ["course_code", "schedule"]),
        ("get_course_videos", academic_repo.get_course_videos(TEST_COURSE_CODE, TEST_STUDENT_ID), ["course_code", "videos"]),
        ("get_reading_materials", academic_repo.get_reading_materials(TEST_COURSE_CODE, TEST_STUDENT_ID), ["course_code", "materials"]),
        ("view_course_announcements", academic_repo.get_course_announcements(TEST_COURSE_CODE, TEST_STUDENT_ID), ["course_code", "announcements"]),
        ("get_course_syllabus", academic_repo.get_course_syllabus(TEST_COURSE_CODE, TEST_STUDENT_ID), ["course_code", "course_name"]),
        ("get_faculty_contact", academic_repo.get_faculty_info(TEST_COURSE_CODE, TEST_STUDENT_ID), ["course_code", "faculty"]),
        ("view_assignment_info", academic_repo.get_assignment_info(TEST_COURSE_CODE, TEST_STUDENT_ID), ["course_code", "assignments"]),
        ("get_curriculum_guidance", academic_repo.get_curriculum_guidance(TEST_STUDENT_ID), ["program_name", "compulsory_courses"]),
        ("get_academic_standing", academic_repo.get_academic_standing(TEST_STUDENT_ID), ["student_name", "cgpa"]),
    ]

    results = []
    for name, coro, expected_keys in tests:
        result = await verify_tool(name, coro, expected_keys)
        results.append(result)

    # Print results
    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")
    skipped = sum(1 for r in results if r["status"] == "SKIP")

    for r in results:
        icon = {"PASS": "✓", "FAIL": "✗", "SKIP": "○"}[r["status"]]
        print(f"  {icon} {r['tool']:30s} {r['status']:6s}  {r['reason']}")

    print()
    print(f"Total: {len(results)} tools | PASS: {passed} | FAIL: {failed} | SKIP: {skipped}")
    print()

    if failed > 0:
        print("⚠  Some tools failed — check output above.")
        sys.exit(1)
    elif skipped == len(results):
        print("All tools skipped (no seed data or DB unavailable).")
        print("Re-run after seeding test data for full verification.")
    else:
        print("All tools verified successfully.")


if __name__ == "__main__":
    asyncio.run(main())
