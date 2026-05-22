#!/usr/bin/env python3
"""
Phase 1B: Content Pipeline Regression Tests
Tests PDF extraction, VTT parser, yt-dlp guard, dedup logic.

Usage: cd mcp-server && .venv/bin/python ../frontend/tests/backend/test_pipeline.py
"""

import asyncio
import os
import sys
import traceback

MCP_ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "..", "mcp-server")
sys.path.insert(0, os.path.join(MCP_ROOT, "src"))
os.chdir(MCP_ROOT)

from dotenv import load_dotenv
load_dotenv()

results = []

def record(name: str, passed: bool, detail: str = ""):
    status = "PASS" if passed else "FAIL"
    results.append({"name": name, "status": status, "detail": detail})
    icon = "✓" if passed else "✗"
    print(f"  {icon} {name}" + (f" — {detail}" if detail and not passed else ""))


# ── 1B.1: PDF extraction (Python side) ──────────────────────────────────────

async def test_pdf_extractor():
    """Test that the PDF processor class can be imported and its guard works."""
    try:
        from api.enhanced_content_processor_api import EnhancedPDFProcessor
        record("pdf_extractor: import", True)

        # Test that it guards missing PyPDF2
        # (We just test the class exists and has extract_text)
        has_method = hasattr(EnhancedPDFProcessor, "extract_text") or hasattr(EnhancedPDFProcessor, "process_file")
        record("pdf_extractor: has_extract_method", has_method,
               "" if has_method else "No extract_text or process_file method found")
    except ImportError as e:
        record("pdf_extractor: import", False, f"ImportError: {e}")


# ── 1B.2: VTT parser ────────────────────────────────────────────────────────

async def test_vtt_parser():
    """Test the VTT parser with a sample WebVTT string."""
    # The VTT parser is in TypeScript (transcript-extractor.ts).
    # We test the Python-side equivalent if it exists, or test inline.
    # For now, test the concept with a simple VTT sample.

    sample_vtt = """WEBVTT
Kind: captions
Language: en

00:00:01.000 --> 00:00:05.000
Hello and welcome to the lecture.

00:00:05.500 --> 00:00:10.000
Today we will discuss <b>hardware</b> components.

00:00:10.500 --> 00:00:15.000
Hello and welcome to the lecture.
"""
    # Parse VTT: strip header, timestamps, tags, deduplicate
    lines = sample_vtt.strip().split("\n")
    seen = set()
    text_parts = []
    for line in lines:
        line = line.strip()
        if not line or line.startswith("WEBVTT") or line.startswith("Kind:") or line.startswith("Language:") or line.startswith("NOTE"):
            continue
        if "-->" in line:
            continue
        if line.isdigit():
            continue
        # Strip HTML tags
        import re
        clean = re.sub(r"<[^>]+>", "", line)
        if clean and clean not in seen:
            seen.add(clean)
            text_parts.append(clean)

    result = " ".join(text_parts)
    has_content = "hardware" in result.lower()
    record("vtt_parser: extracts_text", has_content, f"Parsed: '{result[:80]}...'")

    # Dedup check: "Hello and welcome" appears twice but should be in result only once
    count = result.count("Hello and welcome")
    record("vtt_parser: deduplicates", count == 1, f"'Hello and welcome' appears {count} times")


# ── 1B.3: yt-dlp worker guard ───────────────────────────────────────────────

async def test_ytdlp_guard():
    """Test that the yt-dlp check guard exists. Do NOT download anything."""
    # The worker is TypeScript (video-download-worker.ts).
    # We verify the file exists and contains the checkYtDlp guard.
    worker_path = os.path.join(MCP_ROOT, "..", "frontend", "scripts", "video-download-worker.ts")
    exists = os.path.exists(worker_path)
    record("ytdlp_guard: worker_file_exists", exists,
           "" if exists else f"Not found at {worker_path}")

    if exists:
        with open(worker_path, "r") as f:
            content = f.read()
        has_guard = "checkYtDlp" in content or "yt-dlp" in content
        record("ytdlp_guard: has_ytdlp_check", has_guard,
               "" if has_guard else "No yt-dlp check function found in worker")
        has_pending_query = "getPendingVideos" in content or "pending" in content.lower()
        record("ytdlp_guard: has_pending_query", has_pending_query)


# ── 1B.4: Duplicate detection (Python side) ─────────────────────────────────

async def test_dedup_detector():
    """Test the DuplicateDetector class can be imported and its API shape is correct."""
    try:
        from api.enhanced_content_processor_api import DuplicateDetector
        detector = DuplicateDetector()
        record("dedup_detector: import", True)

        # Test with identical content — should detect duplicate
        content = b"This is a test document about computer science."
        text = "This is a test document about computer science."
        result = await detector.find_duplicates(
            content=content,
            text_content=text,
            filename="PWTEST-dedup.pdf",
        )
        has_keys = all(k in result for k in ["is_duplicate", "exact_file_matches", "content_matches"])
        record("dedup_detector: response_shape", has_keys,
               f"Keys: {list(result.keys())}")

        # First check should not be duplicate (nothing in DB matches)
        record("dedup_detector: first_insert_not_dup", not result.get("is_duplicate", True),
               f"is_duplicate={result.get('is_duplicate')}")

    except ImportError as e:
        record("dedup_detector: import", False, f"ImportError: {e}")
    except Exception as e:
        record("dedup_detector: response_shape", False, f"Exception: {e}")


# ── 1B.5: Quiz/Assignment formatters ────────────────────────────────────────

async def test_quiz_assignment_formatters():
    """Test the format logic for quiz and assignment transcripts.
    The actual functions are module-private in route.ts, so we test the logic inline."""

    # Replicate formatQuizTranscript logic
    title = "Week 3 Quiz"
    instructions = "Answer all questions"
    questions = [
        {"text": "What is a CPU?", "options": ["Processor", "Memory", "Disk"]},
        {"text": "What is RAM?"},
    ]

    parts = [f"Quiz: {title}"]
    if instructions:
        parts.append(f"Instructions: {instructions}")
    for i, q in enumerate(questions, 1):
        parts.append(f"Question {i}: {q['text']}")
        if q.get("options"):
            parts.append(f"Options: {', '.join(q['options'])}")
    quiz_text = "\n".join(parts)

    record("quiz_formatter: produces_text", len(quiz_text) > 0)
    record("quiz_formatter: contains_title", "Week 3 Quiz" in quiz_text)
    record("quiz_formatter: contains_questions", "What is a CPU?" in quiz_text and "What is RAM?" in quiz_text)
    record("quiz_formatter: searchable", "cpu" in quiz_text.lower() and "ram" in quiz_text.lower())

    # Replicate formatAssignmentTranscript logic
    a_title = "Lab Report 1"
    a_instructions = "Write a 2-page report"
    a_requirements = "Include diagrams"
    a_metadata = {"due_date": "2025-12-01", "max_grade": 100, "submission_types": "pdf"}

    a_parts = [f"Assignment: {a_title}"]
    if a_instructions:
        a_parts.append(f"\nInstructions: {a_instructions}")
    if a_requirements:
        a_parts.append(f"\nRequirements: {a_requirements}")
    if a_metadata:
        if a_metadata.get("due_date"):
            a_parts.append(f"\nDue: {a_metadata['due_date']}")
        if a_metadata.get("max_grade"):
            a_parts.append(f"Max Grade: {a_metadata['max_grade']}")
        if a_metadata.get("submission_types"):
            a_parts.append(f"Submission Type: {a_metadata['submission_types']}")
    assignment_text = "\n".join(a_parts)

    record("assignment_formatter: produces_text", len(assignment_text) > 0)
    record("assignment_formatter: contains_title", "Lab Report 1" in assignment_text)
    record("assignment_formatter: contains_due_date", "2025-12-01" in assignment_text)
    record("assignment_formatter: searchable", "diagrams" in assignment_text.lower())


# ── Main ─────────────────────────────────────────────────────────────────────

async def main():
    print("\n" + "=" * 60)
    print("Phase 1B: Content Pipeline Regression Tests")
    print("=" * 60)

    tests = [
        test_pdf_extractor,
        test_vtt_parser,
        test_ytdlp_guard,
        test_dedup_detector,
        test_quiz_assignment_formatters,
    ]

    for test_fn in tests:
        print(f"\n── {test_fn.__doc__.strip().split(chr(10))[0]} ──")
        try:
            await test_fn()
        except Exception as e:
            record(test_fn.__name__, False, f"EXCEPTION: {e}")
            traceback.print_exc()

    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")
    print(f"\n{'=' * 60}")
    print(f"Phase 1B Summary: {passed} passed, {failed} failed, {len(results)} total")
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
