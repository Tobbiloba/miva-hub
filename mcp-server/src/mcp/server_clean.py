"""
MIVA University Academic MCP Server
Structured, organized server with modular tools
"""

import sys
import os

# Add parent directories to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mcp.server.fastmcp import FastMCP

# Import tool modules
from tools.course_tools import register_course_tools
from tools.assignment_tools import register_assignment_tools
from tools.schedule_tools import register_schedule_tools
from tools.study_buddy_tools import register_study_buddy_tools
from tools.content_navigation_tools import register_content_navigation_tools
from tools.deep_learning_tools import register_deep_learning_tools
from tools.exam_tools import register_exam_tools
from tools.notes_conversion_tools import register_notes_conversion_tools
from tools.progress_tools import register_progress_tools

# Initialize FastMCP server for MIVA Academic tools
mcp = FastMCP("miva-academic")

# Register all tool modules
register_course_tools(mcp)
register_assignment_tools(mcp)
register_schedule_tools(mcp)
register_study_buddy_tools(mcp)
register_content_navigation_tools(mcp)
register_deep_learning_tools(mcp)
register_exam_tools(mcp)
register_notes_conversion_tools(mcp)
register_progress_tools(mcp)

if __name__ == "__main__":
    import argparse
    
    # Set up command-line argument parsing
    parser = argparse.ArgumentParser(description='Run MIVA Academic MCP server with configurable transport')
    parser.add_argument('--transport', choices=['stdio', 'sse'], default='sse', 
                        help='Transport mode (stdio or sse)')
    parser.add_argument('--host', default='0.0.0.0', 
                        help='Host to bind to (for SSE mode)')
    parser.add_argument('--port', type=int, default=8080, 
                        help='Port to listen on (for SSE mode)')
    args = parser.parse_args()

    print("🎓 Starting MIVA Academic MCP Server...")
    print("📚 Complete Learning-Focused Toolkit:")
    print("   📖 Course Management (1 tool)")
    print("   📝 Assignment Management (1 tool)")  
    print("   📅 Schedule Management (1 tool)")
    print("   🧠 Study Buddy (4 tools)")
    print("   🔍 Content Navigation (1 tool)")
    print("   🎓 Deep Learning (1 tool)")
    print("   📝 Exam Simulator (2 tools)")
    print("   ✏️ Notes Conversion (2 tools)")
    print("🎯 Total: 13 learning-optimized tools")
    print(f"🚀 Server mode: {args.transport}")

    if args.transport == 'sse':
        # Serve FastMCP's SSE app ourselves so the shared-secret check wraps
        # both /sse and /messages/ (mcp.run() would serve it unauthenticated).
        import uvicorn
        from core.shared_secret import SharedSecretMiddleware

        app = SharedSecretMiddleware(
            mcp.sse_app(),
            secret=os.environ.get("MCP_SHARED_SECRET"),
            header_name="X-MCP-Secret",
            env_var_name="MCP_SHARED_SECRET",
            service_name="MCP server",
        )
        print(f"🌐 Server starting on http://{args.host}:{args.port}")
        uvicorn.run(app, host=args.host, port=args.port)
    else:
        mcp.run(transport=args.transport)