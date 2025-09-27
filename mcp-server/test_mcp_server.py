#!/usr/bin/env python3
"""Comprehensive testing script for MIVA Academic MCP Server."""

import os
import json
import asyncio
import subprocess
import signal
import time
from typing import Dict, Any, List

def print_header(text: str):
    """Print a formatted header."""
    print(f"\n{'=' * 60}")
    print(f"  {text}")
    print(f"{'=' * 60}")

def print_section(text: str):
    """Print a formatted section."""
    print(f"\n--- {text} ---")

def print_success(text: str):
    """Print success message."""
    print(f"✅ {text}")

def print_warning(text: str):
    """Print warning message."""
    print(f"⚠️  {text}")

def print_error(text: str):
    """Print error message."""
    print(f"❌ {text}")

def test_dependencies():
    """Test if required dependencies are available."""
    print_section("Testing Dependencies")
    
    # Test Python version
    import sys
    python_version = sys.version_info
    if python_version >= (3, 12):
        print_success(f"Python {python_version.major}.{python_version.minor}.{python_version.micro}")
    else:
        print_warning(f"Python {python_version.major}.{python_version.minor}.{python_version.micro} (3.12+ recommended)")
    
    # Test required modules
    modules = [
        ('json', 'JSON support'),
        ('asyncio', 'Async support'),
        ('typing', 'Type hints'),
        ('os', 'Operating system interface'),
        ('dotenv', 'Environment variables (.env support)')
    ]
    
    missing_modules = []
    for module, description in modules:
        try:
            __import__(module)
            print_success(f"{module} - {description}")
        except ImportError:
            print_error(f"{module} - {description} (MISSING)")
            missing_modules.append(module)
    
    # Test optional modules
    optional_modules = [
        ('psycopg2', 'PostgreSQL database support'),
        ('mcp', 'Model Context Protocol'),
        ('starlette', 'Web framework for SSE transport'),
        ('uvicorn', 'ASGI server'),
        ('httpx', 'HTTP client')
    ]
    
    for module, description in optional_modules:
        try:
            __import__(module)
            print_success(f"{module} - {description}")
        except ImportError:
            print_warning(f"{module} - {description} (optional, install with: pip install {module})")
    
    return len(missing_modules) == 0

def test_database_connection():
    """Test database connection and setup."""
    print_section("Testing Database Connection")
    
    # Check for .env file
    if os.path.exists('.env'):
        print_success(".env file found")
        
        # Try to load environment variables
        try:
            from dotenv import load_dotenv
            load_dotenv()
            
            db_host = os.getenv('DB_HOST', 'localhost')
            db_port = os.getenv('DB_PORT', '5432')
            db_name = os.getenv('DB_NAME', 'miva_academic')
            db_user = os.getenv('DB_USER', 'postgres')
            
            print_success(f"Database config: {db_user}@{db_host}:{db_port}/{db_name}")
            
        except ImportError:
            print_warning("python-dotenv not installed, using default values")
    else:
        print_warning(".env file not found, using default database settings")
        print("  Create .env file with your database credentials:")
        print("  DB_HOST=localhost")
        print("  DB_PORT=5432") 
        print("  DB_NAME=miva_academic")
        print("  DB_USER=your_username")
        print("  DB_PASSWORD=your_password")
    
    # Test PostgreSQL availability
    try:
        import psycopg2
        print_success("psycopg2 available - can connect to PostgreSQL")
        
        # Try actual connection (if credentials provided)
        try:
            conn = psycopg2.connect(
                host=os.getenv('DB_HOST', 'localhost'),
                port=os.getenv('DB_PORT', '5432'),
                database=os.getenv('DB_NAME', 'miva_academic'),
                user=os.getenv('DB_USER', 'postgres'),
                password=os.getenv('DB_PASSWORD', '')
            )
            conn.close()
            print_success("Database connection successful")
            return True
        except Exception as e:
            print_warning(f"Database connection failed: {e}")
            print("  Server will use placeholder data")
            return False
            
    except ImportError:
        print_warning("psycopg2 not installed - will use placeholder data")
        print("  Install with: pip install psycopg2-binary")
        return False

def test_server_syntax():
    """Test server file syntax."""
    print_section("Testing Server Syntax")
    
    files_to_check = ['server.py', 'database.py']
    all_valid = True
    
    for filename in files_to_check:
        if os.path.exists(filename):
            try:
                result = subprocess.run(
                    ['python3', '-m', 'py_compile', filename],
                    capture_output=True,
                    text=True
                )
                if result.returncode == 0:
                    print_success(f"{filename} syntax valid")
                else:
                    print_error(f"{filename} syntax error: {result.stderr}")
                    all_valid = False
            except Exception as e:
                print_error(f"Failed to check {filename}: {e}")
                all_valid = False
        else:
            print_error(f"{filename} not found")
            all_valid = False
    
    return all_valid

def test_server_imports():
    """Test server module imports."""
    print_section("Testing Server Imports")
    
    try:
        # Test database module
        from database import academic_repo
        print_success("database.py imports successfully")
        
        # Test if server tools are defined
        with open('server.py', 'r') as f:
            content = f.read()
        
        expected_tools = [
            'get_course_materials',
            'get_course_videos', 
            'get_reading_materials',
            'view_course_announcements',
            'get_course_syllabus',
            'get_faculty_contact',
            'view_assignment_info',
            'get_course_info',
            'list_enrolled_courses',
            'get_course_schedule'
        ]
        
        missing_tools = []
        for tool in expected_tools:
            if f'def {tool}(' in content:
                print_success(f"Tool defined: {tool}")
            else:
                print_error(f"Tool missing: {tool}")
                missing_tools.append(tool)
        
        if not missing_tools:
            print_success(f"All {len(expected_tools)} tools defined correctly")
            return True
        else:
            print_error(f"{len(missing_tools)} tools missing")
            return False
            
    except Exception as e:
        print_error(f"Server import failed: {e}")
        return False

def test_stdio_transport():
    """Test MCP server with stdio transport."""
    print_section("Testing STDIO Transport")
    
    try:
        print("Testing if server starts with stdio transport...")
        print("(This test will start and immediately stop the server)")
        
        # Start server process
        process = subprocess.Popen(
            ['python3', 'server.py', '--transport', 'stdio'],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Give it a moment to start
        time.sleep(2)
        
        # Send initialization message
        init_message = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "test-client", "version": "1.0.0"}
            }
        }
        
        try:
            process.stdin.write(json.dumps(init_message) + '\n')
            process.stdin.flush()
            
            # Wait for response
            process.wait(timeout=5)
            
            if process.returncode == 0:
                print_success("STDIO transport test passed")
                return True
            else:
                stderr_output = process.stderr.read()
                print_warning(f"STDIO transport test completed with code {process.returncode}")
                if stderr_output:
                    print(f"  Server output: {stderr_output}")
                return False
                
        except subprocess.TimeoutExpired:
            print_success("STDIO transport started successfully (server running)")
            process.terminate()
            process.wait()
            return True
            
    except Exception as e:
        print_error(f"STDIO transport test failed: {e}")
        return False

def test_sse_transport():
    """Test MCP server with SSE transport."""
    print_section("Testing SSE Transport")
    
    try:
        print("Testing if server starts with SSE transport...")
        print("Server will start on http://localhost:8080")
        
        # Start server process
        process = subprocess.Popen(
            ['python3', 'server.py', '--transport', 'sse', '--port', '8080'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Give server time to start
        time.sleep(3)
        
        # Check if process is still running
        if process.poll() is None:
            print_success("SSE transport started successfully")
            print("  Server running at: http://localhost:8080/sse")
            print("  Message endpoint: http://localhost:8080/messages/")
            
            # Terminate the server
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
            
            return True
        else:
            stderr_output = process.stderr.read()
            print_error(f"SSE transport failed to start: {stderr_output}")
            return False
            
    except Exception as e:
        print_error(f"SSE transport test failed: {e}")
        return False

def run_comprehensive_test():
    """Run all tests."""
    print_header("MIVA Academic MCP Server - Comprehensive Test Suite")
    
    test_results = {
        'dependencies': test_dependencies(),
        'database': test_database_connection(),
        'syntax': test_server_syntax(),
        'imports': test_server_imports(),
        'stdio': test_stdio_transport(),
        'sse': test_sse_transport()
    }
    
    print_header("Test Results Summary")
    
    passed = sum(test_results.values())
    total = len(test_results)
    
    for test_name, result in test_results.items():
        status = "PASS" if result else "FAIL"
        icon = "✅" if result else "❌"
        print(f"{icon} {test_name.upper()}: {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print_success("All tests passed! MCP Server is ready for use.")
        print("\n🚀 Next Steps:")
        print("1. Configure your LLM client (Claude Desktop, LM Studio, etc.)")
        print("2. Add server to your MCP configuration")
        print("3. Start using academic tools!")
    else:
        print_warning(f"{total - passed} tests failed. Check the issues above.")
        print("\n🔧 Common Solutions:")
        print("1. Install missing dependencies: pip install -r requirements.txt")
        print("2. Set up PostgreSQL database and configure .env")
        print("3. Check file permissions and Python path")
    
    return passed == total

if __name__ == "__main__":
    try:
        success = run_comprehensive_test()
        exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        exit(1)
    except Exception as e:
        print(f"\n\nUnexpected error: {e}")
        exit(1)