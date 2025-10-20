MAC@Tobbie frontend % cd /Users/MAC/Documents/projects/Startups/better-chatbot-main/frontend
npm run dev

> better-chatbot@1.21.0 dev
> next dev --turbopack

   ▲ Next.js 15.3.2 (Turbopack)
   - Local:        http://localhost:3000
   - Network:      http://10.127.187.33:3000
   - Environments: .env.local, .env

 ✓ Starting...
 ✓ Compiled instrumentation Node.js in 429ms
 ✓ Compiled instrumentation Edge in 19ms
 ✓ Compiled middleware in 112ms
🔧 Migrations disabled - using db:push for schema sync
ℹ [c0f8] MCP Manager:  Initializing MCP clients manager                  better-chatbot 11:12:48 AM

[better-chatbot 11:12:48 AM]  WARN  [5885] MCP Client miva-academic:  Streamable HTTP connection failed, Because fetch failed, falling back to SSE transport


[better-chatbot 11:12:48 AM]  ERROR  [5885] MCP Client miva-academic:  SSE error: TypeError: fetch failed: connect ECONNREFUSED ::1:8080, connect ECONNREFUSED 127.0.0.1:8080

    at _eventSource.onerror (.next/server/chunks/e0135_@modelcontextprotocol_sdk_dist_esm_22e8b613._.js:3016:31)
    at EventSource.scheduleReconnect_fn (.next/server/chunks/node_modules__pnpm_f234ae0e._.js:5743:55)
    at eval (.next/server/chunks/node_modules__pnpm_f234ae0e._.js:5597:180)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)

 ✓ Ready in 1726ms
^Cℹ [5885] MCP Client miva-academic:  Disconnecting from MCP server        better-chatbot 11:13:05 AM

MAC@Tobbie frontend % cd /Users/MAC/Documents/projects/Startups/better-chatbot-main/frontend
npm run dev

> better-chatbot@1.21.0 dev
> next dev --turbopack

   ▲ Next.js 15.3.2 (Turbopack)
   - Local:        http://localhost:3000
   - Network:      http://10.127.187.33:3000
   - Environments: .env.local, .env

 ✓ Starting...
 ✓ Compiled instrumentation Node.js in 419ms
 ✓ Compiled instrumentation Edge in 19ms
 ✓ Compiled middleware in 104ms
🔧 Migrations disabled - using db:push for schema sync
ℹ [3aca] MCP Manager:  Initializing MCP clients manager                  better-chatbot 11:13:15 AM

[better-chatbot 11:13:15 AM]  WARN  [5885] MCP Client miva-academic:  Streamable HTTP connection failed, Because Error POSTing to endpoint (HTTP 405): Method Not Allowed, falling back to SSE transport

ℹ [5885] MCP Client miva-academic:  Connected to MCP server in 0.03s     better-chatbot 11:13:15 AM
ℹ [5885] MCP Client miva-academic:  Updating tool info                   better-chatbot 11:13:15 AM
 ✓ Ready in 1646ms
 ○ Compiling /api/thread ...
 ✓ Compiled /api/thread in 995ms
 GET /api/thread 200 in 1318ms
 ○ Compiling / ...
ℹ Using MemoryCache for development                                      better-chatbot 11:13:31 AM
 ✓ Compiled / in 11.1s
 GET / 200 in 11135ms
 GET / 200 in 65ms
 GET /api/thread 200 in 191ms
 ○ Compiling /api/auth/[...all] ...
[better-chatbot] ℹ Using MemoryCache for development
 GET /chat/67067ac5-8b1a-4889-a107-01c5a426ac95 200 in 8692ms
 GET /api/thread 200 in 187ms
 GET /api/mcp/list 200 in 819ms
 GET /favicon.ico 200 in 1584ms
 GET /favicon.ico?favicon.5e5ed972.ico 200 in 280ms
 GET /api/agent?filters=all&limit=50 200 in 1718ms
 ✓ Compiled /api/auth/[...all] in 3.7s
 GET /api/archive 200 in 1807ms
 GET /api/workflow/tools 200 in 1344ms
 GET /api/chat/models 200 in 871ms
 GET /api/auth/get-session 200 in 2536ms
 GET /api/auth/get-session 200 in 29ms
 GET / 200 in 39ms
 GET / 200 in 51ms
 GET /api/thread 200 in 61ms
 ○ Compiling /api/chat ...
 ✓ Compiled /api/chat in 880ms
ℹ Chat API:  create chat thread: 23f7b763-1092-4adc-9efb-25ddaeba693d    better-chatbot 11:13:40 AM
[UserContext] Successfully mapped oluwatobi.salau@miva.edu.ng to studentId: 30012976
ℹ Chat API:  mcp-server count: 1, mcp-tools count :14                    better-chatbot 11:13:40 AM
[better-chatbot 11:13:40 AM] ℹ Chat API:  [DEBUG] User context: email=oluwatobi.salau@miva.edu.ng, studentId=30012976
ℹ Chat API:  Auto-enabling MIVA Academic MCP server for student 30012976 better-chatbot 11:13:40 AM
[better-chatbot 11:13:40 AM] ℹ Chat API:  Found MIVA Academic server with 14 tools: list_enrolled_courses, get_course_materials, get_upcoming_assignments, get_academic_schedule, ask_study_question, generate_study_guide, create_flashcards, generate_quiz, summarize_material, explain_concept_deeply, generate_exam_simulator, submit_exam_answers, convert_notes_to_flashcards, export_flashcards
ℹ Chat API:  tool mode: auto, mentions: 0                                better-chatbot 11:13:40 AM
ℹ Chat API:  allowedMcpTools: 10, allowedAppDefaultToolkit: 2            better-chatbot 11:13:40 AM
ℹ Chat API:  binding tool count APP_DEFAULT: 14, MCP: 14, Workflow: 0    better-chatbot 11:13:40 AM
ℹ Chat API:  model: anthropic/claude-3-7-sonnet                          better-chatbot 11:13:40 AM
🔧 [MCP DEBUG] Starting toolCall: {
  clientId: '5885dfa2-d466-4679-a29b-7d6f0aa26c71',
  toolName: 'list_enrolled_courses',
  originalInput: { student_id: '30012976' },
  userContext: {
    studentId: '30012976',
    email: 'oluwatobi.salau@miva.edu.ng',
    firstName: 'Oluwatobiloba',
    lastName: 'Abayomi Salau',
    role: 'student',
    year: '400',
    major: 'Computer Science'
  },
  inputType: 'object',
  inputKeys: [ 'student_id' ]
}
🔧 [MCP DEBUG] Client found: {
  clientId: '5885dfa2-d466-4679-a29b-7d6f0aa26c71',
  clientStatus: undefined,
  toolInfo: 0
}
🔧 [MCP Context] Starting enrichment: {
  toolName: 'list_enrolled_courses',
  serverId: '5885dfa2-d466-4679-a29b-7d6f0aa26c71',
  originalInput: '{\n  "student_id": "30012976"\n}',
  originalInputType: 'object',
  originalInputKeys: [ 'student_id' ],
  userContext: '{\n' +
    '  "studentId": "30012976",\n' +
    '  "email": "oluwatobi.salau@miva.edu.ng",\n' +
    '  "firstName": "Oluwatobiloba",\n' +
    '  "lastName": "Abayomi Salau",\n' +
    '  "role": "student",\n' +
    '  "year": "400",\n' +
    '  "major": "Computer Science"\n' +
    '}',
  userContextType: 'object',
  hasStudentId: true,
  studentIdValue: '30012976',
  studentIdType: 'string'
}
🔧 [MCP Context] Student ID override: {
  toolName: 'list_enrolled_courses',
  oldStudentId: '30012976',
  oldStudentIdType: 'string',
  newStudentId: '30012976',
  newStudentIdType: 'string',
  changed: false
}
🔧 [MCP Context] Final enriched input: {
  toolName: 'list_enrolled_courses',
  finalInput: '{\n  "student_id": "30012976"\n}',
  finalInputType: 'object',
  finalInputKeys: [ 'student_id' ],
  inputChanged: false
}
🔧 [MCP DEBUG] About to call tool: {
  clientId: '5885dfa2-d466-4679-a29b-7d6f0aa26c71',
  toolName: 'list_enrolled_courses',
  originalInput: '{\n  "student_id": "30012976"\n}',
  enrichedInput: '{\n  "student_id": "30012976"\n}',
  inputChanged: false,
  userContext: '{\n' +
    '  "studentId": "30012976",\n' +
    '  "email": "oluwatobi.salau@miva.edu.ng",\n' +
    '  "firstName": "Oluwatobiloba",\n' +
    '  "lastName": "Abayomi Salau",\n' +
    '  "role": "student",\n' +
    '  "year": "400",\n' +
    '  "major": "Computer Science"\n' +
    '}'
}
ℹ [5885] MCP Client miva-academic:  tool call list_enrolled_courses      better-chatbot 11:13:44 AM
🔧 [MCP DEBUG] Starting toolCall: {
  clientId: '5885dfa2-d466-4679-a29b-7d6f0aa26c71',
  toolName: 'generate_quiz',
  originalInput: {
    course_id: '5077d0d9-4ea2-49b4-a1c0-a6e89bcecc03',
    topics: '',
    question_count: 10,
    question_types: 'multiple_choice',
    difficulty_level: 'medium'
  },
  userContext: {
    studentId: '30012976',
    email: 'oluwatobi.salau@miva.edu.ng',
    firstName: 'Oluwatobiloba',
    lastName: 'Abayomi Salau',
    role: 'student',
    year: '400',
    major: 'Computer Science'
  },
  inputType: 'object',
  inputKeys: [
    'course_id',
    'topics',
    'question_count',
    'question_types',
    'difficulty_level'
  ]
}
🔧 [MCP DEBUG] Client found: {
  clientId: '5885dfa2-d466-4679-a29b-7d6f0aa26c71',
  clientStatus: undefined,
  toolInfo: 0
}
🔧 [MCP Context] Starting enrichment: {
  toolName: 'generate_quiz',
  serverId: '5885dfa2-d466-4679-a29b-7d6f0aa26c71',
  originalInput: '{\n' +
    '  "course_id": "5077d0d9-4ea2-49b4-a1c0-a6e89bcecc03",\n' +
    '  "topics": "",\n' +
    '  "question_count": 10,\n' +
    '  "question_types": "multiple_choice",\n' +
    '  "difficulty_level": "medium"\n' +
    '}',
  originalInputType: 'object',
  originalInputKeys: [
    'course_id',
    'topics',
    'question_count',
    'question_types',
    'difficulty_level'
  ],
  userContext: '{\n' +
    '  "studentId": "30012976",\n' +
    '  "email": "oluwatobi.salau@miva.edu.ng",\n' +
    '  "firstName": "Oluwatobiloba",\n' +
    '  "lastName": "Abayomi Salau",\n' +
    '  "role": "student",\n' +
    '  "year": "400",\n' +
    '  "major": "Computer Science"\n' +
    '}',
  userContextType: 'object',
  hasStudentId: true,
  studentIdValue: '30012976',
  studentIdType: 'string'
}
🔧 [MCP Context] Student ID override: {
  toolName: 'generate_quiz',
  oldStudentId: undefined,
  oldStudentIdType: 'undefined',
  newStudentId: '30012976',
  newStudentIdType: 'string',
  changed: true
}
🔧 [MCP Context] Final enriched input: {
  toolName: 'generate_quiz',
  finalInput: '{\n' +
    '  "course_id": "5077d0d9-4ea2-49b4-a1c0-a6e89bcecc03",\n' +
    '  "topics": "",\n' +
    '  "question_count": 10,\n' +
    '  "question_types": "multiple_choice",\n' +
    '  "difficulty_level": "medium",\n' +
    '  "student_id": "30012976"\n' +
    '}',
  finalInputType: 'object',
  finalInputKeys: [
    'course_id',
    'topics',
    'question_count',
    'question_types',
    'difficulty_level',
    'student_id'
  ],
  inputChanged: true
}
🔧 [MCP DEBUG] About to call tool: {
  clientId: '5885dfa2-d466-4679-a29b-7d6f0aa26c71',
  toolName: 'generate_quiz',
  originalInput: '{\n' +
    '  "course_id": "5077d0d9-4ea2-49b4-a1c0-a6e89bcecc03",\n' +
    '  "topics": "",\n' +
    '  "question_count": 10,\n' +
    '  "question_types": "multiple_choice",\n' +
    '  "difficulty_level": "medium"\n' +
    '}',
  enrichedInput: '{\n' +
    '  "course_id": "5077d0d9-4ea2-49b4-a1c0-a6e89bcecc03",\n' +
    '  "topics": "",\n' +
    '  "question_count": 10,\n' +
    '  "question_types": "multiple_choice",\n' +
    '  "difficulty_level": "medium",\n' +
    '  "student_id": "30012976"\n' +
    '}',
  inputChanged: true,
  userContext: '{\n' +
    '  "studentId": "30012976",\n' +
    '  "email": "oluwatobi.salau@miva.edu.ng",\n' +
    '  "firstName": "Oluwatobiloba",\n' +
    '  "lastName": "Abayomi Salau",\n' +
    '  "role": "student",\n' +
    '  "year": "400",\n' +
    '  "major": "Computer Science"\n' +
    '}'
}
ℹ [5885] MCP Client miva-academic:  tool call generate_quiz              better-chatbot 11:13:51 AM
🔧 [MCP DEBUG] Starting toolCall: {
  clientId: '5885dfa2-d466-4679-a29b-7d6f0aa26c71',
  toolName: 'generate_quiz',
  originalInput: {
    course_id: '5077d0d9-4ea2-49b4-a1c0-a6e89bcecc03',
    topics: '',
    question_count: 10,
    question_types: 'multiple_choice',
    difficulty_level: 'medium',
    student_id: 30012976
  },
  userContext: {
    studentId: '30012976',
    email: 'oluwatobi.salau@miva.edu.ng',
    firstName: 'Oluwatobiloba',
    lastName: 'Abayomi Salau',
    role: 'student',
    year: '400',
    major: 'Computer Science'
  },
  inputType: 'object',
  inputKeys: [
    'course_id',
    'topics',
    'question_count',
    'question_types',
    'difficulty_level',
    'student_id'
  ]
}
🔧 [MCP DEBUG] Client found: {
  clientId: '5885dfa2-d466-4679-a29b-7d6f0aa26c71',
  clientStatus: undefined,
  toolInfo: 0
}
🔧 [MCP Context] Starting enrichment: {
  toolName: 'generate_quiz',
  serverId: '5885dfa2-d466-4679-a29b-7d6f0aa26c71',
  originalInput: '{\n' +
    '  "course_id": "5077d0d9-4ea2-49b4-a1c0-a6e89bcecc03",\n' +
    '  "topics": "",\n' +
    '  "question_count": 10,\n' +
    '  "question_types": "multiple_choice",\n' +
    '  "difficulty_level": "medium",\n' +
    '  "student_id": 30012976\n' +
    '}',
  originalInputType: 'object',
  originalInputKeys: [
    'course_id',
    'topics',
    'question_count',
    'question_types',
    'difficulty_level',
    'student_id'
  ],
  userContext: '{\n' +
    '  "studentId": "30012976",\n' +
    '  "email": "oluwatobi.salau@miva.edu.ng",\n' +
    '  "firstName": "Oluwatobiloba",\n' +
    '  "lastName": "Abayomi Salau",\n' +
    '  "role": "student",\n' +
    '  "year": "400",\n' +
    '  "major": "Computer Science"\n' +
    '}',
  userContextType: 'object',
  hasStudentId: true,
  studentIdValue: '30012976',
  studentIdType: 'string'
}
🔧 [MCP Context] Student ID override: {
  toolName: 'generate_quiz',
  oldStudentId: 30012976,
  oldStudentIdType: 'number',
  newStudentId: '30012976',
  newStudentIdType: 'string',
  changed: true
}
🔧 [MCP Context] Final enriched input: {
  toolName: 'generate_quiz',
  finalInput: '{\n' +
    '  "course_id": "5077d0d9-4ea2-49b4-a1c0-a6e89bcecc03",\n' +
    '  "topics": "",\n' +
    '  "question_count": 10,\n' +
    '  "question_types": "multiple_choice",\n' +
    '  "difficulty_level": "medium",\n' +
    '  "student_id": "30012976"\n' +
    '}',
  finalInputType: 'object',
  finalInputKeys: [
    'course_id',
    'topics',
    'question_count',
    'question_types',
    'difficulty_level',
    'student_id'
  ],
  inputChanged: true
}
🔧 [MCP DEBUG] About to call tool: {
  clientId: '5885dfa2-d466-4679-a29b-7d6f0aa26c71',
  toolName: 'generate_quiz',
  originalInput: '{\n' +
    '  "course_id": "5077d0d9-4ea2-49b4-a1c0-a6e89bcecc03",\n' +
    '  "topics": "",\n' +
    '  "question_count": 10,\n' +
    '  "question_types": "multiple_choice",\n' +
    '  "difficulty_level": "medium",\n' +
    '  "student_id": 30012976\n' +
    '}',
  enrichedInput: '{\n' +
    '  "course_id": "5077d0d9-4ea2-49b4-a1c0-a6e89bcecc03",\n' +
    '  "topics": "",\n' +
    '  "question_count": 10,\n' +
    '  "question_types": "multiple_choice",\n' +
    '  "difficulty_level": "medium",\n' +
    '  "student_id": "30012976"\n' +
    '}',
  inputChanged: true,
  userContext: '{\n' +
    '  "studentId": "30012976",\n' +
    '  "email": "oluwatobi.salau@miva.edu.ng",\n' +
    '  "firstName": "Oluwatobiloba",\n' +
    '  "lastName": "Abayomi Salau",\n' +
    '  "role": "student",\n' +
    '  "year": "400",\n' +
    '  "major": "Computer Science"\n' +
    '}'
}
ℹ [5885] MCP Client miva-academic:  tool call generate_quiz              better-chatbot 11:13:56 AM
 GET /api/thread 200 in 55ms
 POST /api/chat 200 in 38240ms
 ○ Compiling /api/chat/title ...
 ✓ Compiled /api/chat/title in 863ms
[better-chatbot 11:14:18 AM] ℹ Title API:  chatModel: anthropic/claude-3-7-sonnet, threadId: 23f7b763-1092-4adc-9efb-25ddaeba693d
 POST /api/chat/title 200 in 6138ms
 GET /api/thread 200 in 28ms
 GET /api/thread 200 in 71ms
 GET /api/thread 200 in 143ms
