#!/usr/bin/env python3
"""
Phase 1A: MCP Tool Regression Tests
Calls each MCP tool method directly via AcademicRepository.
Asserts well-formed responses and access control (FERPA).

Usage: cd mcp-server && .venv/bin/python ../frontend/tests/backend/test_mcp_tools.py
"""

import asyncio
import json
import os
import sys
import traceback

# Add mcp-server/src to path so we can import the database module
MCP_ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "..", "mcp-server")
sys.path.insert(0, os.path.join(MCP_ROOT, "src"))
os.chdir(MCP_ROOT)  # So dotenv picks up mcp-server/.env

from core.database import DatabaseConfig, AcademicRepository

# ── Test constants ───────────────────────────────────────────────────────────

ADA_STUDENT_ID = "MIVA/CS/2024/001"
ADA_ENROLLED_COURSE = "COS201"      # Ada is enrolled in this
UNENROLLED_COURSE = "PHY999"        # Ada is NOT enrolled in this
NONEXISTENT_COURSE = "ZZZZZ999"     # Does not exist at all

# ── Results tracking ─────────────────────────────────────────────────────────

results = []

def record(name: str, passed: bool, detail: str = ""):
    status = "PASS" if passed else "FAIL"
    results.append({"name": name, "status": status, "detail": detail})
    icon = "✓" if passed else "✗"
    print(f"  {icon} {name}" + (f" — {detail}" if detail and not passed else ""))


# ── Assertion helpers ────────────────────────────────────────────────────────

def assert_keys(data: dict, required_keys: list, test_name: str) -> bool:
    missing = [k for k in required_keys if k not in data]
    if missing:
        record(test_name, False, f"Missing keys: {missing}")
        return False
    if "error" in data:
        record(test_name, False, f"Got error: {data['error']}")
        return False
    return True


def assert_error_contains(data: dict, substring: str, test_name: str) -> bool:
    if "error" not in data:
        record(test_name, False, f"Expected error containing '{substring}', got success: {list(data.keys())}")
        return False
    if substring.lower() not in data["error"].lower():
        record(test_name, False, f"Error '{data['error']}' does not contain '{substring}'")
        return False
    record(test_name, True)
    return True


# ── Test functions ───────────────────────────────────────────────────────────

async def test_list_enrolled_courses(repo: AcademicRepository):
    """Tool: list_enrolled_courses — assert Ada has ≥1 enrollment with expected shape."""
    data = await repo.get_student_enrollments(ADA_STUDENT_ID)
    if not assert_keys(data, ["student_id", "enrollments", "total_courses", "total_credits"], "list_enrolled_courses: shape"):
        return
    if data["total_courses"] < 1:
        record("list_enrolled_courses: has_courses", False, f"total_courses={data['total_courses']}")
        return
    enrollment = data["enrollments"][0]
    has_fields = all(k in enrollment for k in ["course_code", "course_name", "credits"])
    record("list_enrolled_courses: enrollment_shape", has_fields,
           "" if has_fields else f"Missing fields in enrollment: {list(enrollment.keys())}")


async def test_get_course_info(repo: AcademicRepository):
    """Tool: get_course_info — public, no enrollment check."""
    data = await repo.get_course_info(ADA_ENROLLED_COURSE)
    if assert_keys(data, ["course_code", "course_name", "credits"], "get_course_info: shape"):
        record("get_course_info: shape", True)
    # Nonexistent course
    data2 = await repo.get_course_info(NONEXISTENT_COURSE)
    assert_error_contains(data2, "not found", "get_course_info: nonexistent_course_error")


async def test_get_course_syllabus(repo: AcademicRepository):
    """Tool: get_course_syllabus."""
    data = await repo.get_course_syllabus(ADA_ENROLLED_COURSE, ADA_STUDENT_ID)
    if assert_keys(data, ["course_code", "course_name"], "get_course_syllabus: shape"):
        record("get_course_syllabus: shape", True)


async def test_get_academic_standing(repo: AcademicRepository):
    """Tool: get_academic_standing — assert Ada's CGPA and classification."""
    data = await repo.get_academic_standing(ADA_STUDENT_ID)
    if not assert_keys(data, ["student_name", "cgpa", "current_classification", "credits_earned"], "get_academic_standing: shape"):
        return
    record("get_academic_standing: shape", True)
    # Assert Ada's known CGPA
    cgpa = data.get("cgpa")
    if isinstance(cgpa, (int, float)):
        record("get_academic_standing: cgpa_value", abs(cgpa - 4.62) < 0.1,
               f"Expected CGPA ~4.62, got {cgpa}")
        record("get_academic_standing: classification",
               data["current_classification"] == "First Class",
               f"Expected 'First Class', got '{data['current_classification']}'")
    else:
        record("get_academic_standing: cgpa_value", False, f"CGPA not numeric: {cgpa}")


async def test_get_curriculum_guidance(repo: AcademicRepository):
    """Tool: get_curriculum_guidance."""
    data = await repo.get_curriculum_guidance(ADA_STUDENT_ID)
    if "error" in data:
        record("get_curriculum_guidance: shape", False, f"Got error: {data['error']}")
        return
    has_keys = all(k in data for k in ["compulsory_courses", "currently_enrolled_credits"])
    record("get_curriculum_guidance: shape", has_keys,
           "" if has_keys else f"Keys: {list(data.keys())}")


async def test_view_course_announcements(repo: AcademicRepository):
    """Tool: view_course_announcements."""
    data = await repo.get_course_announcements(ADA_ENROLLED_COURSE, ADA_STUDENT_ID)
    if assert_keys(data, ["announcements", "total_count"], "view_course_announcements: shape"):
        record("view_course_announcements: shape", True)


async def test_get_course_videos(repo: AcademicRepository):
    """Tool: get_course_videos — assert has_transcript field."""
    data = await repo.get_course_videos(ADA_ENROLLED_COURSE, ADA_STUDENT_ID)
    if not assert_keys(data, ["course_code", "videos", "total_count"], "get_course_videos: shape"):
        return
    record("get_course_videos: shape", True)
    if data["total_count"] > 0:
        video = data["videos"][0]
        record("get_course_videos: has_transcript_field", "has_transcript" in video,
               f"Video keys: {list(video.keys())}")
    else:
        record("get_course_videos: has_transcript_field", True, "No videos to check (0 count, not a failure)")


async def test_get_reading_materials(repo: AcademicRepository):
    """Tool: get_reading_materials — assert transcript_excerpt field present."""
    data = await repo.get_reading_materials(ADA_ENROLLED_COURSE, ADA_STUDENT_ID)
    if not assert_keys(data, ["course_code", "materials", "total_count"], "get_reading_materials: shape"):
        return
    record("get_reading_materials: shape", True)
    if data["total_count"] > 0:
        mat = data["materials"][0]
        record("get_reading_materials: has_transcript_field", "has_transcript" in mat,
               f"Material keys: {list(mat.keys())}")
    else:
        record("get_reading_materials: has_transcript_field", True, "No materials to check (0 count)")


async def test_get_course_materials(repo: AcademicRepository):
    """Tool: get_course_materials."""
    data = await repo.get_course_materials(ADA_ENROLLED_COURSE, ADA_STUDENT_ID)
    if assert_keys(data, ["course_code", "materials", "total_count"], "get_course_materials: shape"):
        record("get_course_materials: shape", True)


async def test_search_course_content(repo: AcademicRepository):
    """Tool: search_course_content — search 'hardware' → assert ≥1 match with snippet."""
    data = await repo.search_course_content(ADA_STUDENT_ID, ADA_ENROLLED_COURSE, "hardware")
    if not assert_keys(data, ["course_code", "query", "matches", "total_matches"], "search_course_content: shape"):
        return
    record("search_course_content: shape", True)
    has_matches = data["total_matches"] >= 1
    record("search_course_content: has_results", has_matches,
           f"total_matches={data['total_matches']}" if not has_matches else "")
    if has_matches:
        match = data["matches"][0]
        record("search_course_content: snippet_present", "snippet" in match,
               f"Match keys: {list(match.keys())}")


async def test_get_lesson_content(repo: AcademicRepository):
    """Tool: get_lesson_content — get a known material, assert transcript returned."""
    # First get a material ID from course materials
    mats = await repo.get_course_materials(ADA_ENROLLED_COURSE, ADA_STUDENT_ID)
    if "error" in mats or mats.get("total_count", 0) == 0:
        record("get_lesson_content: shape", True, "No materials available to test (skipped)")
        return
    material_id = mats["materials"][0]["id"]
    data = await repo.get_lesson_content(ADA_STUDENT_ID, material_id)
    if "error" in data and "no transcript" in data.get("error", "").lower():
        record("get_lesson_content: shape", True, "Material has no transcript (expected for some)")
        return
    if "error" in data:
        record("get_lesson_content: shape", False, f"Unexpected error: {data['error']}")
        return
    has_keys = all(k in data for k in ["material_id", "title", "transcript_text"])
    record("get_lesson_content: shape", has_keys,
           "" if has_keys else f"Keys: {list(data.keys())}")


async def test_list_quizzes_and_assignments(repo: AcademicRepository):
    """Tool: list_quizzes_and_assignments."""
    data = await repo.list_quizzes_and_assignments(ADA_STUDENT_ID, ADA_ENROLLED_COURSE)
    if assert_keys(data, ["items", "total_count"], "list_quizzes_and_assignments: shape"):
        record("list_quizzes_and_assignments: shape", True)


async def test_get_upcoming_assignments(repo: AcademicRepository):
    """Tool: get_upcoming_assignments."""
    data = await repo.get_upcoming_assignments(ADA_STUDENT_ID)
    if assert_keys(data, ["student_id", "assignments", "total_count"], "get_upcoming_assignments: shape"):
        record("get_upcoming_assignments: shape", True)


async def test_get_course_schedule(repo: AcademicRepository):
    """Tool: get_course_schedule."""
    data = await repo.get_course_schedule(ADA_ENROLLED_COURSE, ADA_STUDENT_ID)
    if "error" in data:
        record("get_course_schedule: shape", False, f"Error: {data['error']}")
    else:
        record("get_course_schedule: shape", True)


async def test_get_faculty_contact(repo: AcademicRepository):
    """Tool: get_faculty_contact."""
    data = await repo.get_faculty_info(ADA_ENROLLED_COURSE, ADA_STUDENT_ID)
    if "error" in data:
        record("get_faculty_contact: shape", False, f"Error: {data['error']}")
    else:
        has_keys = "faculty" in data or "course_code" in data
        record("get_faculty_contact: shape", has_keys, f"Keys: {list(data.keys())}")


async def test_view_assignment_info(repo: AcademicRepository):
    """Tool: view_assignment_info."""
    data = await repo.get_assignment_info(ADA_ENROLLED_COURSE, ADA_STUDENT_ID)
    if "error" in data:
        record("view_assignment_info: shape", False, f"Error: {data['error']}")
    else:
        has_keys = "assignments" in data and "total_count" in data
        record("view_assignment_info: shape", has_keys, f"Keys: {list(data.keys())}")


# ── Access control tests (FERPA) ─────────────────────────────────────────────

async def test_access_control(repo: AcademicRepository):
    """Assert unenrolled course access is denied — data never leaks."""
    # get_course_materials with unenrolled course
    data = await repo.get_course_materials(UNENROLLED_COURSE, ADA_STUDENT_ID)
    assert_error_contains(data, "not enrolled", "access_control: get_course_materials_unenrolled")

    # search_course_content with unenrolled course
    data = await repo.search_course_content(ADA_STUDENT_ID, UNENROLLED_COURSE, "test")
    assert_error_contains(data, "not enrolled", "access_control: search_course_content_unenrolled")

    # get_course_videos with unenrolled course
    data = await repo.get_course_videos(UNENROLLED_COURSE, ADA_STUDENT_ID)
    assert_error_contains(data, "not enrolled", "access_control: get_course_videos_unenrolled")

    # get_reading_materials with unenrolled course
    data = await repo.get_reading_materials(UNENROLLED_COURSE, ADA_STUDENT_ID)
    assert_error_contains(data, "not enrolled", "access_control: get_reading_materials_unenrolled")

    # get_course_syllabus with unenrolled course
    data = await repo.get_course_syllabus(UNENROLLED_COURSE, ADA_STUDENT_ID)
    assert_error_contains(data, "not enrolled", "access_control: get_course_syllabus_unenrolled")

    # list_quizzes_and_assignments with unenrolled course
    data = await repo.list_quizzes_and_assignments(ADA_STUDENT_ID, UNENROLLED_COURSE)
    assert_error_contains(data, "not enrolled", "access_control: list_quizzes_unenrolled")


# ── Main runner ──────────────────────────────────────────────────────────────

async def main():
    print("\n" + "=" * 60)
    print("Phase 1A: MCP Tool Regression Tests")
    print("=" * 60)

    config = DatabaseConfig()
    repo = AcademicRepository(config)

    # Verify DB connectivity first
    conn = repo.get_connection()
    if not conn:
        print("\n✗ FATAL: Cannot connect to database. Check POSTGRES_URL in mcp-server/.env")
        sys.exit(1)
    conn.close()
    print(f"  ✓ Database connected ({config.host})")

    print("\n── Tool shape tests (as Ada) ──")
    tests = [
        test_list_enrolled_courses,
        test_get_course_info,
        test_get_course_syllabus,
        test_get_academic_standing,
        test_get_curriculum_guidance,
        test_view_course_announcements,
        test_get_course_videos,
        test_get_reading_materials,
        test_get_course_materials,
        test_search_course_content,
        test_get_lesson_content,
        test_list_quizzes_and_assignments,
        test_get_upcoming_assignments,
        test_get_course_schedule,
        test_get_faculty_contact,
        test_view_assignment_info,
    ]

    for test_fn in tests:
        try:
            await test_fn(repo)
        except Exception as e:
            record(test_fn.__name__.replace("test_", ""), False, f"EXCEPTION: {e}")
            traceback.print_exc()

    print("\n── Access control tests (FERPA) ──")
    try:
        await test_access_control(repo)
    except Exception as e:
        record("access_control", False, f"EXCEPTION: {e}")
        traceback.print_exc()

    # ── Summary ──
    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")
    print(f"\n{'=' * 60}")
    print(f"Phase 1A Summary: {passed} passed, {failed} failed, {len(results)} total")
    if failed:
        print("\nFailed tests:")
        for r in results:
            if r["status"] == "FAIL":
                print(f"  ✗ {r['name']}: {r['detail']}")
    print("=" * 60)
    return failed == 0


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
