"""Faculty Information Tools for MIVA Academic MCP Server"""

import json
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from core.database import academic_repo


def register_faculty_tools(mcp):
    """Register all faculty-related tools with the MCP server"""
    
