#!/usr/bin/env node

/**
 * MCP Tools Testing Script
 * Tests all 17 MIVA Academic MCP tools systematically
 */

const { execSync } = require('child_process');

const TEST_CASES = [
  // Course Management Tools (7)
  {
    tool: 'list_enrolled_courses',
    query: 'fetch all my courses',
    expectedTool: 'list_enrolled_courses'
  },
  {
    tool: 'get_course_materials', 
    query: 'get CS101 course materials for week 1',
    expectedTool: 'get_course_materials'
  },
  {
    tool: 'get_course_info',
    query: 'tell me about CS101 course information', 
    expectedTool: 'get_course_info'
  },
  {
    tool: 'get_course_videos',
    query: 'show me CS101 video lectures for week 1',
    expectedTool: 'get_course_videos'
  },
  {
    tool: 'get_reading_materials',
    query: 'get CS101 reading materials for week 1',
    expectedTool: 'get_reading_materials'
  },
  {
    tool: 'view_course_announcements', 
    query: 'show me recent CS101 announcements',
    expectedTool: 'view_course_announcements'
  },
  {
    tool: 'get_course_syllabus',
    query: 'get CS101 syllabus',
    expectedTool: 'get_course_syllabus'
  },

  // Assignment Management Tools (2)
  {
    tool: 'get_upcoming_assignments',
    query: 'show me my upcoming assignments',
    expectedTool: 'get_upcoming_assignments'
  },
  {
    tool: 'view_assignment_info',
    query: 'get details for assignment 1',
    expectedTool: 'view_assignment_info'
  },

  // Schedule Management Tools (1)
  {
    tool: 'get_course_schedule',
    query: 'show me CS101 class schedule',
    expectedTool: 'get_course_schedule'
  },

  // Faculty Information Tools (1)
  {
    tool: 'get_faculty_contact',
    query: 'get CS101 faculty contact information',
    expectedTool: 'get_faculty_contact'
  },

  // Study Buddy Tools (6)
  {
    tool: 'ask_study_question',
    query: 'help me understand data structures in CS101',
    expectedTool: 'ask_study_question'
  },
  {
    tool: 'start_study_session',
    query: 'start a study session for CS101',
    expectedTool: 'start_study_session'
  },
  {
    tool: 'view_study_history',
    query: 'show my study history',
    expectedTool: 'view_study_history'
  },
  {
    tool: 'generate_study_guide',
    query: 'create a study guide for CS101 midterm',
    expectedTool: 'generate_study_guide'
  },
  {
    tool: 'create_flashcards',
    query: 'create flashcards for CS101 concepts',
    expectedTool: 'create_flashcards'
  },
  {
    tool: 'generate_practice_quiz',
    query: 'generate a practice quiz for CS101',
    expectedTool: 'generate_practice_quiz'
  }
];

async function testMCPTool(testCase) {
  console.log(`\n🧪 Testing: ${testCase.tool}`);
  console.log(`📝 Query: "${testCase.query}"`);
  
  try {
    // Create a test request to the chat API
    const payload = {
      id: `test-${Date.now()}`,
      message: {
        id: `msg-${Date.now()}`,
        role: 'user',
        parts: [{ type: 'text', text: testCase.query }]
      },
      chatModel: { provider: 'anthropic', model: 'claude-3-7-sonnet' },
      toolChoice: 'auto',
      allowedAppDefaultToolkit: ['get-academic-schedule', 'get-upcoming-assignments', 'academic-course-finder'],
      allowedMcpServers: {},
      mentions: []
    };

    const curlCommand = `curl -s -X POST http://localhost:3001/api/chat \\
      -H 'Content-Type: application/json' \\
      -H 'Cookie: better-auth.session_token=mock_session' \\
      -d '${JSON.stringify(payload).replace(/'/g, '"')}'`;

    const response = execSync(curlCommand, { encoding: 'utf8' });
    
    if (response.includes(`"name":"${testCase.expectedTool}"`)) {
      console.log(`✅ SUCCESS: ${testCase.tool} was called correctly`);
      return { tool: testCase.tool, status: 'SUCCESS', response: response.slice(0, 200) };
    } else if (response.includes('error')) {
      console.log(`❌ ERROR: ${testCase.tool} returned error`);
      return { tool: testCase.tool, status: 'ERROR', response: response.slice(0, 200) };
    } else {
      console.log(`⚠️  WARNING: ${testCase.tool} may not have been called`);
      return { tool: testCase.tool, status: 'WARNING', response: response.slice(0, 200) };
    }
  } catch (error) {
    console.log(`💥 FAILED: ${testCase.tool} - ${error.message}`);
    return { tool: testCase.tool, status: 'FAILED', error: error.message };
  }
}

async function runAllTests() {
  console.log('🎯 Starting MCP Tools Testing Suite...');
  console.log(`📊 Testing ${TEST_CASES.length} tools\n`);
  
  const results = [];
  
  for (const testCase of TEST_CASES) {
    const result = await testMCPTool(testCase);
    results.push(result);
    
    // Wait between tests to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  
  const summary = results.reduce((acc, result) => {
    acc[result.status] = (acc[result.status] || 0) + 1;
    return acc;
  }, {});
  
  console.log(`✅ SUCCESS: ${summary.SUCCESS || 0}`);
  console.log(`❌ ERROR: ${summary.ERROR || 0}`);
  console.log(`⚠️  WARNING: ${summary.WARNING || 0}`);
  console.log(`💥 FAILED: ${summary.FAILED || 0}`);
  
  // List failed/error tools
  const problematicTools = results.filter(r => ['ERROR', 'FAILED'].includes(r.status));
  if (problematicTools.length > 0) {
    console.log('\n🔧 TOOLS NEEDING FIXES:');
    problematicTools.forEach(tool => {
      console.log(`   - ${tool.tool}: ${tool.status}`);
    });
  }
  
  return results;
}

// Run the tests
runAllTests().catch(console.error);