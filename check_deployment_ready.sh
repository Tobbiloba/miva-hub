#!/bin/bash

# MIVA AI Assistant - Deployment Readiness Check
# Run this before deploying to verify everything is configured

echo "🔍 MIVA AI Assistant - Deployment Readiness Check"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

CHECKS_PASSED=0
CHECKS_FAILED=0

# Function to check
check() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}❌ $2${NC}"
        ((CHECKS_FAILED++))
    fi
}

# Check 1: Required files exist
echo "📂 Checking deployment files..."
[ -f "mcp-server/Dockerfile.mcp-server" ]; check $? "MCP Server Dockerfile exists"
[ -f "mcp-server/Dockerfile.study-buddy" ]; check $? "Study Buddy Dockerfile exists"
[ -f "mcp-server/Dockerfile.content-processor" ]; check $? "Content Processor Dockerfile exists"
[ -f "docker-compose.production.yml" ]; check $? "Docker Compose production config exists"
echo ""

# Check 2: Python services exist
echo "🐍 Checking Python services..."
[ -f "mcp-server/src/mcp/server_clean.py" ]; check $? "MCP Server script exists"
[ -f "mcp-server/src/api/study_buddy_api.py" ]; check $? "Study Buddy API exists"
[ -f "mcp-server/src/api/enhanced_content_processor_api.py" ]; check $? "Content Processor API exists"
echo ""

# Check 3: Usage tracker fix
echo "🔧 Checking usage tracking fix..."
if grep -q "conn.commit()" "mcp-server/src/core/usage_tracker.py"; then
    check 0 "Usage tracker has conn.commit() fix"
else
    check 1 "Usage tracker missing conn.commit() - CRITICAL FIX NEEDED"
fi
echo ""

# Check 4: Frontend exists
echo "🌐 Checking frontend..."
[ -f "frontend/package.json" ]; check $? "Frontend package.json exists"
[ -d "frontend/src" ]; check $? "Frontend source directory exists"
echo ""

# Check 5: Documentation
echo "📚 Checking documentation..."
[ -f "DEPLOYMENT_GUIDE.md" ]; check $? "Deployment guide exists"
[ -f "QUICK_DEPLOY.md" ]; check $? "Quick deploy guide exists"
[ -f "DEPLOYMENT_CHECKLIST.md" ]; check $? "Deployment checklist exists"
echo ""

# Check 6: Python dependencies
echo "📦 Checking dependencies..."
if [ -f "mcp-server/requirements.txt" ]; then
    check 0 "Python requirements.txt exists"
    
    # Check for key dependencies
    if grep -q "fastapi" "mcp-server/requirements.txt"; then
        check 0 "FastAPI dependency listed"
    else
        check 1 "FastAPI missing from requirements.txt"
    fi
    
    if grep -q "psycopg2" "mcp-server/requirements.txt"; then
        check 0 "PostgreSQL driver listed"
    else
        check 1 "psycopg2 missing from requirements.txt"
    fi
else
    check 1 "requirements.txt not found"
fi
echo ""

# Check 7: Git status
echo "📝 Checking Git status..."
if git rev-parse --git-dir > /dev/null 2>&1; then
    check 0 "Git repository initialized"
    
    # Check for uncommitted changes
    if [ -z "$(git status --porcelain)" ]; then
        check 0 "No uncommitted changes"
    else
        check 1 "Uncommitted changes detected - commit before deploying"
    fi
else
    check 1 "Not a git repository"
fi
echo ""

# Final Summary
echo "=================================================="
echo "📊 Deployment Readiness Summary"
echo "=================================================="
echo -e "${GREEN}Checks Passed: $CHECKS_PASSED${NC}"
echo -e "${RED}Checks Failed: $CHECKS_FAILED${NC}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed! You're ready to deploy!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Choose your deployment platform (Railway/Vercel recommended)"
    echo "  2. Follow QUICK_DEPLOY.md for 15-minute setup"
    echo "  3. Or follow DEPLOYMENT_CHECKLIST.md for detailed steps"
    echo ""
    exit 0
else
    echo -e "${YELLOW}⚠️  Some checks failed. Please fix the issues above before deploying.${NC}"
    echo ""
    exit 1
fi

