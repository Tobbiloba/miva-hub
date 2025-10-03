"""
MIVA University Academic MCP Server
Structured, organized server with modular tools
"""

from typing import Any
import asyncio
import json
from mcp.server.fastmcp import FastMCP
from starlette.applications import Starlette
from mcp.server.sse import SseServerTransport
from starlette.requests import Request
from starlette.routing import Mount, Route
from mcp.server import Server
import uvicorn
import sys
import os

# Add parent directories to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import tool modules
from tools.course_tools import register_course_tools
from tools.assignment_tools import register_assignment_tools
from tools.schedule_tools import register_schedule_tools
from tools.study_buddy_tools import register_study_buddy_tools

# Initialize FastMCP server for MIVA Academic tools
mcp = FastMCP("miva-academic")

# Register all tool modules
register_course_tools(mcp)
register_assignment_tools(mcp)
register_schedule_tools(mcp)
register_study_buddy_tools(mcp)

def create_starlette_app(mcp_server, *, debug: bool = False):
    """Create a Starlette application that can serve the provided MCP server with SSE."""
    # Create an SSE transport with a base path for messages
    sse = SseServerTransport("/messages/")

    async def handle_sse(request: Request):
        """Handler for SSE connections."""
        # Connect the SSE transport to the request
        async with sse.connect_sse(
                request.scope,
                request.receive,
                request._send,
        ) as (read_stream, write_stream):
            # Run the MCP server with the SSE streams
            await mcp_server.run(
                read_stream,
                write_stream,
                mcp_server.create_initialization_options(),
            )

    # Create and return the Starlette application with routes
    return Starlette(
        debug=debug,
        routes=[
            Route("/sse", endpoint=handle_sse),  # Endpoint for SSE connections
            Mount("/messages/", app=sse.handle_post_message),  # Endpoint for posting messages
        ],
    )

if __name__ == "__main__":
    # Get the underlying MCP server from the FastMCP instance
    mcp_server = mcp._mcp_server
    
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
    print("📚 Complete Academic Toolkit:")
    print("   📖 Course Management (5 tools)")
    print("   📝 Assignment Management (1 tool)")  
    print("   📅 Schedule Management (1 tool)")
    print("   🧠 Study Buddy (4 tools)")
    print("🎯 Total: 11 essential tools - full AI study capabilities")
    print(f"🚀 Server mode: {args.transport}")

    # Launch the server with the selected transport mode
    if args.transport == 'stdio':
        # Run with stdio transport
        mcp.run(transport='stdio')
    else:
        # Run with SSE transport (web-based)
        starlette_app = create_starlette_app(mcp_server, debug=True)
        print(f"🌐 Server starting on http://{args.host}:{args.port}")
        uvicorn.run(starlette_app, host=args.host, port=args.port)