#!/usr/bin/env python3
"""Direct testing of MCP tools without transport layer."""

import asyncio
import json
import sys
import os

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def test_tools_directly():
    """Test all tools by calling them directly."""
    print("=== Testing MCP Tools Directly ===\n")
    
    # Import server functions
    try:
        from server import (
            get_course_videos,
            get_reading_materials,
            view_course_announcements,
            get_course_syllabus,
            get_faculty_contact,
            view_assignment_info,
            get_course_materials,
            get_course_info,
            list_enrolled_courses,
            get_course_schedule
        )
        print("✅ All tool functions imported successfully")
    except Exception as e:
        print(f"❌ Import failed: {e}")
        return False
    
    # Test data
    test_student_id = "MIVA2024001"
    test_course_code = "COS202"
    
    tools_to_test = [
        {
            "name": "get_course_videos",
            "function": get_course_videos,
            "args": (test_course_code, test_student_id, 1),
            "description": "Course videos for Week 1"
        },
        {
            "name": "get_reading_materials", 
            "function": get_reading_materials,
            "args": (test_course_code, test_student_id, 2),
            "description": "Reading materials for Week 2"
        },
        {
            "name": "view_course_announcements",
            "function": view_course_announcements,
            "args": (test_course_code, test_student_id, 5),
            "description": "Latest 5 course announcements"
        },
        {
            "name": "get_course_syllabus",
            "function": get_course_syllabus,
            "args": (test_course_code, test_student_id),
            "description": "Complete course syllabus"
        },
        {
            "name": "get_faculty_contact",
            "function": get_faculty_contact,
            "args": (test_course_code, test_student_id),
            "description": "Faculty contact information"
        },
        {
            "name": "view_assignment_info",
            "function": view_assignment_info,
            "args": (test_course_code, test_student_id, 1),
            "description": "Assignment info for Week 1"
        },
        {
            "name": "get_course_materials",
            "function": get_course_materials,
            "args": (test_course_code, test_student_id, 3),
            "description": "General course materials for Week 3"
        },
        {
            "name": "get_course_info",
            "function": get_course_info,
            "args": (test_course_code,),
            "description": "Basic course information"
        },
        {
            "name": "list_enrolled_courses",
            "function": list_enrolled_courses,
            "args": (test_student_id,),
            "description": "Student's enrolled courses"
        },
        {
            "name": "get_course_schedule",
            "function": get_course_schedule,
            "args": (test_student_id, test_course_code),
            "description": "Course schedule and times"
        }
    ]
    
    successful_tests = 0
    failed_tests = 0
    
    for tool in tools_to_test:
        print(f"\n--- Testing {tool['name']} ---")
        print(f"Description: {tool['description']}")
        
        try:
            # Call the function
            result = await tool['function'](*tool['args'])
            
            # Parse JSON response
            try:
                data = json.loads(result)
                
                # Check if it's an error
                if "error" in data:
                    print(f"⚠️  Tool returned error: {data['error']}")
                else:
                    print(f"✅ Tool executed successfully")
                    
                    # Print some summary info
                    if "videos" in data:
                        print(f"   Found {len(data['videos'])} videos")
                    elif "materials" in data:
                        print(f"   Found {len(data['materials'])} materials")
                    elif "announcements" in data:
                        print(f"   Found {len(data['announcements'])} announcements")
                    elif "faculty" in data:
                        print(f"   Found {len(data['faculty'])} faculty members")
                    elif "assignments" in data:
                        print(f"   Found {len(data['assignments'])} assignments")
                    elif "courses" in data:
                        print(f"   Found {len(data['courses'])} courses")
                    elif "schedule" in data:
                        print(f"   Found {len(data['schedule'])} schedule entries")
                    elif "course_name" in data:
                        print(f"   Course: {data['course_name']}")
                    elif "syllabus" in data:
                        print(f"   Syllabus for: {data['syllabus'].get('course_name', 'Course')}")
                
                successful_tests += 1
                
            except json.JSONDecodeError as e:
                print(f"❌ JSON decode error: {e}")
                print(f"   Raw response: {result[:200]}...")
                failed_tests += 1
                
        except Exception as e:
            print(f"❌ Tool execution failed: {e}")
            failed_tests += 1
    
    print(f"\n=== Test Results ===")
    print(f"✅ Successful: {successful_tests}")
    print(f"❌ Failed: {failed_tests}")
    print(f"📊 Success Rate: {successful_tests}/{successful_tests + failed_tests} ({successful_tests/(successful_tests + failed_tests)*100:.1f}%)")
    
    if successful_tests == len(tools_to_test):
        print("\n🎉 All tools working perfectly!")
        print("Ready for MCP integration!")
    elif successful_tests > failed_tests:
        print(f"\n✅ Most tools working ({successful_tests}/{len(tools_to_test)})")
        print("Ready for testing with minor fixes needed")
    else:
        print(f"\n⚠️  Several tools need attention ({failed_tests} failures)")
        print("Check tool implementations")
    
    return successful_tests > failed_tests

async def test_specific_tool():
    """Test a specific tool with detailed output."""
    print("=== Testing get_course_videos in Detail ===\n")
    
    try:
        from server import get_course_videos
        
        # Test with different parameters
        test_cases = [
            {"course_code": "COS202", "student_id": "MIVA2024001", "week_number": 1, "video_type": None},
            {"course_code": "COS202", "student_id": "MIVA2024001", "week_number": None, "video_type": "introduction"},
            {"course_code": "COS202", "student_id": "MIVA2024001", "week_number": 7, "video_type": None},
        ]
        
        for i, test_case in enumerate(test_cases, 1):
            print(f"Test Case {i}: {test_case}")
            
            result = await get_course_videos(**test_case)
            data = json.loads(result)
            
            print(f"Result: {len(data.get('videos', []))} videos found")
            
            for video in data.get('videos', [])[:2]:  # Show first 2 videos
                print(f"  - Week {video['week_number']}: {video['title']}")
                print(f"    Type: {video['video_type']}, Duration: {video['duration']}")
            
            print()
            
    except Exception as e:
        print(f"❌ Detailed test failed: {e}")

if __name__ == "__main__":
    try:
        print("🚀 Starting direct tool testing...")
        success = asyncio.run(test_tools_directly())
        
        if success:
            print("\n📋 Running detailed test...")
            asyncio.run(test_specific_tool())
        
        exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        exit(1)
    except Exception as e:
        print(f"\n\nUnexpected error: {e}")
        exit(1)