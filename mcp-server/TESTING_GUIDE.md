# MIVA Academic MCP Server - Testing Guide

## Quick Start Testing

### 1. Basic Server Test (No Database Required)
```bash
# Test with placeholder data (works immediately)
python3 test_mcp_server.py
```

### 2. Test Student Content Tools
```bash
# Test all student-focused tools
python3 test_student_tools.py
```

### 3. Test MCP Server Transports
```bash
# Test STDIO transport (for Claude Desktop, LM Studio)
python3 server.py --transport stdio

# Test SSE transport (for web integration)
python3 server.py --transport sse --port 8080
```

## Complete Database Setup (Optional)

### Option A: Quick PostgreSQL Setup with Docker
```bash
# Start PostgreSQL with Docker
docker run --name miva-postgres \
  -e POSTGRES_USER=miva_user \
  -e POSTGRES_PASSWORD=miva_pass \
  -e POSTGRES_DB=miva_academic \
  -p 5432:5432 \
  -d postgres:15

# Create .env file
cat > .env << EOF
DB_HOST=localhost
DB_PORT=5432
DB_NAME=miva_academic
DB_USER=miva_user
DB_PASSWORD=miva_pass
EOF

# Install PostgreSQL Python driver
pip install psycopg2-binary

# Set up database with dummy data
docker exec -i miva-postgres psql -U miva_user -d miva_academic < create_dummy_data.sql
```

### Option B: Local PostgreSQL Setup
```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Create database and user
createdb miva_academic
psql miva_academic -f create_dummy_data.sql

# Configure .env
echo "DB_HOST=localhost" > .env
echo "DB_PORT=5432" >> .env
echo "DB_NAME=miva_academic" >> .env
echo "DB_USER=$(whoami)" >> .env
echo "DB_PASSWORD=" >> .env
```

### Option C: Use Placeholder Data (Recommended for Testing)
No setup required! The server automatically uses realistic placeholder data when no database is configured.

## Testing Different Scenarios

### 1. Test with Placeholder Data
```bash
# Remove .env to use placeholder data
mv .env .env.backup 2>/dev/null || true

# Run tests
python3 test_mcp_server.py
python3 test_student_tools.py

# Test server functionality
python3 server.py --transport stdio
```

### 2. Test with Real Database
```bash
# Ensure .env is configured
cp .env.example .env
# Edit .env with your database credentials

# Test database connection
python3 -c "
from database_real import academic_repo
import asyncio
async def test():
    result = await academic_repo.get_course_info('COS202')
    print('Database test:', result.get('course_name', 'Failed'))
asyncio.run(test())
"

# Run comprehensive tests
python3 test_mcp_server.py
```

### 3. Test with Different LLM Clients

#### Claude Desktop Configuration
Add to `~/.config/claude-desktop/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "miva-academic": {
      "command": "python3",
      "args": ["/path/to/mcp-server/server.py", "--transport", "stdio"],
      "env": {
        "DB_HOST": "localhost",
        "DB_NAME": "miva_academic"
      }
    }
  }
}
```

#### LM Studio Integration
```bash
# Start server in SSE mode
python3 server.py --transport sse --port 8080

# Configure LM Studio to connect to:
# http://localhost:8080/sse
```

#### Continue.dev Integration
Add to your Continue configuration:
```json
{
  "mcp": {
    "servers": {
      "miva-academic": {
        "command": "python3",
        "args": ["/path/to/server.py", "--transport", "stdio"]
      }
    }
  }
}
```

## Testing Individual Tools

### Test Course Videos
```bash
python3 -c "
import asyncio
from server import get_course_videos

async def test():
    result = await get_course_videos('COS202', 'MIVA2024001', week_number=1)
    print(result)

asyncio.run(test())
"
```

### Test Reading Materials
```bash
python3 -c "
import asyncio
from server import get_reading_materials

async def test():
    result = await get_reading_materials('COS202', 'MIVA2024001', material_type='pdf')
    print(result)

asyncio.run(test())
"
```

### Test Faculty Contact
```bash
python3 -c "
import asyncio
from server import get_faculty_contact

async def test():
    result = await get_faculty_contact('COS202', 'MIVA2024001')
    print(result)

asyncio.run(test())
"
```

## Troubleshooting

### Common Issues

#### 1. "Module not found: mcp"
```bash
# Install MCP dependencies
pip install mcp>=1.4.1 starlette uvicorn httpx

# Or install all dependencies at once
pip install -e .
```

#### 2. "psycopg2 not available"
This is normal! The server will use placeholder data.

To enable real database:
```bash
pip install psycopg2-binary
```

#### 3. "Database connection failed"
Check your `.env` configuration:
```bash
# Test connection manually
psql -h localhost -U your_user -d miva_academic -c "SELECT 1;"
```

#### 4. "Port already in use"
```bash
# Find process using port 8080
lsof -i :8080

# Use different port
python3 server.py --transport sse --port 8081
```

#### 5. Server starts but tools don't work
```bash
# Check tool definitions
python3 -c "
with open('server.py') as f:
    content = f.read()
    tools = [line for line in content.split('\n') if 'def ' in line and '@mcp.tool()' in content[content.find(line)-50:content.find(line)]]
    print(f'Found {len(tools)} tools')
"
```

### Debug Mode

#### Enable Verbose Logging
```bash
# Add debug logging to server.py
import logging
logging.basicConfig(level=logging.DEBUG)

# Run with debug output
python3 server.py --transport stdio 2>&1 | tee debug.log
```

#### Test Individual Components
```bash
# Test database module only
python3 -c "from database import academic_repo; print('Database OK')"

# Test server imports only  
python3 -c "import server; print('Server OK')"

# Test MCP functionality
python3 -c "from mcp.server.fastmcp import FastMCP; print('MCP OK')"
```

## Performance Testing

### Load Testing (Advanced)
```bash
# Test multiple concurrent requests
python3 -c "
import asyncio
from server import get_course_videos

async def load_test():
    tasks = []
    for i in range(10):
        task = get_course_videos('COS202', f'MIVA2024{i:03d}')
        tasks.append(task)
    
    results = await asyncio.gather(*tasks)
    print(f'Completed {len(results)} requests')

asyncio.run(load_test())
"
```

### Memory Usage
```bash
# Monitor memory usage
python3 -c "
import psutil
import os
process = psutil.Process(os.getpid())
print(f'Memory usage: {process.memory_info().rss / 1024 / 1024:.1f} MB')
"
```

## Data Verification

### Verify Dummy Data
```bash
# Check if dummy data was loaded correctly
psql miva_academic -c "
SELECT 
    'Courses' as table_name, COUNT(*) as count FROM courses
UNION ALL
SELECT 'Materials', COUNT(*) FROM course_materials  
UNION ALL
SELECT 'Faculty', COUNT(*) FROM faculty
UNION ALL
SELECT 'Students', COUNT(*) FROM students;
"
```

### Sample Queries
```bash
# Test specific course data
psql miva_academic -c "
SELECT c.course_code, c.course_name, COUNT(cm.id) as material_count
FROM courses c
LEFT JOIN course_materials cm ON c.id = cm.course_id
WHERE c.course_code = 'COS202'
GROUP BY c.course_code, c.course_name;
"
```

## Success Indicators

✅ **Basic Setup Working:**
- Server starts without errors
- Tools return JSON responses
- Student content accessible

✅ **Database Integration Working:**
- Real course data from COS202
- 24+ course materials loaded
- 4 faculty members with contact info
- Proper enrollment verification

✅ **MCP Integration Working:**
- STDIO transport connects
- SSE transport serves on port 8080
- Tools respond to LLM queries

✅ **Production Ready:**
- All tests pass
- Database performs well
- Error handling works
- Logging configured

## Next Steps

1. **For Development**: Use placeholder data and focus on tool functionality
2. **For Production**: Set up PostgreSQL and configure real MIVA data
3. **For Integration**: Configure your preferred LLM client
4. **For Deployment**: Use Docker and proper environment variables

Happy testing! 🚀