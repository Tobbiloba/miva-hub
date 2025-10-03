MAC@Tobbie frontend % clear
MAC@Tobbie frontend % npm run dev

> better-chatbot@1.21.0 dev
> next dev --turbopack

   ▲ Next.js 15.3.2 (Turbopack)
   - Local:        http://localhost:3000
   - Network:      http://10.68.14.33:3000
   - Environments: .env

 ✓ Starting...
 ✓ Compiled instrumentation Node.js in 448ms
 ✓ Compiled instrumentation Edge in 21ms
 ✓ Compiled middleware in 104ms
⏳ Running PostgreSQL migrations...
✅ PostgreSQL migrations completed in 190 ms
ℹ [81b1] MCP Manager:  Initializing MCP clients manager                                                                          better-chatbot 10:22:34 PM

[better-chatbot 10:22:34 PM]  WARN  [6694] MCP Client miva-academic:  Streamable HTTP connection failed, Because Error POSTing to endpoint (HTTP 405): Method Not Allowed, falling back to SSE transport

ℹ [6694] MCP Client miva-academic:  Connected to MCP server in 0.09s                                                             better-chatbot 10:22:34 PM
ℹ [6694] MCP Client miva-academic:  Updating tool info                                                                           better-chatbot 10:22:34 PM
 ✓ Ready in 2.1s
 ○ Compiling / ...
 ✓ Compiled / in 10.2s
ℹ Using MemoryCache for development                                                                                              better-chatbot 10:22:59 PM
 GET / 200 in 11083ms
 ○ Compiling /api/auth/[...all] ...
 GET /favicon.ico 200 in 1688ms
 GET /favicon.ico?favicon.5e5ed972.ico 200 in 1561ms
 GET /api/thread 200 in 3247ms
 GET /api/archive 200 in 3256ms
 GET /api/agent?filters=all&limit=50 200 in 3262ms
 GET /api/workflow/tools 200 in 1794ms
 GET /api/mcp/list 200 in 1905ms
 ✓ Compiled /api/auth/[...all] in 3.9s
 GET /api/auth/get-session 200 in 4020ms
 GET /api/auth/get-session 200 in 35ms
 GET /api/chat/models 200 in 621ms
 ○ Compiling /api/chat ...
 ✓ Compiled /api/chat in 1142ms
ℹ Chat API:  create chat thread: eb2c69b1-72ae-41c6-8996-1b6aeb85fa91                                                            better-chatbot 10:23:25 PM
ℹ Chat API:  mcp-server count: 1, mcp-tools count :11                                                                            better-chatbot 10:23:25 PM
[UserContext] Failed to get academic context for oluwatobi.salau@miva.edu.ng: error: relation "users" does not exist
    at async UserContextService.queryAcademicDatabase (src/lib/user/user-context.ts:95:21)
    at async UserContextService.getUserAcademicContext (src/lib/user/user-context.ts:41:21)
  93 |       `;
  94 |       
> 95 |       const result = await pool.query(query, [email]);
     |                     ^
  96 |       
  97 |       if (result.rows.length === 0) {
  98 |         console.log(`[UserContext] No user found with email: ${email}`); {
  length: 105,
  severity: 'ERROR',
  code: '42P01',
  detail: undefined,
  hint: undefined,
  position: '138',
  internalPosition: undefined,
  internalQuery: undefined,
  where: undefined,
  schema: undefined,
  table: undefined,
  column: undefined,
  dataType: undefined,
  constraint: undefined,
  file: 'parse_relation.c',
  line: '1384',
  routine: 'parserOpenTable'
}
ℹ Chat API:  [DEBUG] User context: email=oluwatobi.salau@miva.edu.ng, studentId=undefined                                        better-chatbot 10:23:25 PM
ℹ Chat API:  MCP auto-enable conditions not met: studentId=undefined, email=oluwatobi.salau@miva.edu.ng                          better-chatbot 10:23:25 PM
ℹ Chat API:  tool mode: auto, mentions: 0                                                                                        better-chatbot 10:23:25 PM
ℹ Chat API:  allowedMcpTools: 14, allowedAppDefaultToolkit: 1                                                                    better-chatbot 10:23:25 PM
ℹ Chat API:  binding tool count APP_DEFAULT: 4, MCP: 8, Workflow: 0                                                              better-chatbot 10:23:25 PM
ℹ Chat API:  model: anthropic/claude-3-7-sonnet                                                                                  better-chatbot 10:23:25 PM
[MCP Context] Tool: list_enrolled_courses, Original input: { student_id: 'oluwatobi.salau@miva.edu.ng' }
[MCP Context] User context: undefined
[MCP Context] No user context available
ℹ [6694] MCP Client miva-academic:  tool call list_enrolled_courses                                                              better-chatbot 10:23:29 PM
 ⨯ [Error: failed to pipe response] {
  [cause]: ReferenceError: userAcademicContext is not defined
      at onFinish (src/app/api/chat/route.ts:331:8)
    329 |
    330 |         // Record academic conversation for memory and context building
  > 331 |         if (userAcademicContext?.studentId && session?.user?.email?.endsWith('@miva.edu.ng')) {
        |        ^
    332 |           try {
    333 |             // Extract conversation details for memory
    334 |             const userText = message.parts.find(p => p.type === 'text')?.text || '';
}
 ⨯ [Error: failed to pipe response] {
  [cause]: ReferenceError: userAcademicContext is not defined
      at onFinish (src/app/api/chat/route.ts:331:8)
    329 |
    330 |         // Record academic conversation for memory and context building
  > 331 |         if (userAcademicContext?.studentId && session?.user?.email?.endsWith('@miva.edu.ng')) {
        |        ^
    332 |           try {
    333 |             // Extract conversation details for memory
    334 |             const userText = message.parts.find(p => p.type === 'text')?.text || '';
}
 POST /api/chat 500 in 8331ms
 ○ Compiling /api/chat/title ...
 ✓ Compiled /api/chat/title in 891ms
ℹ Title API:  chatModel: anthropic/claude-3-7-sonnet, threadId: eb2c69b1-72ae-41c6-8996-1b6aeb85fa91                             better-chatbot 10:23:33 PM
 POST /api/chat/title 200 in 3340ms
 GET /api/thread 200 in 37ms
ℹ Chat API:  mcp-server count: 1, mcp-tools count :11                                                                            better-chatbot 10:23:45 PM
ℹ Chat API:  [DEBUG] User context: email=oluwatobi.salau@miva.edu.ng, studentId=undefined                                        better-chatbot 10:23:45 PM
ℹ Chat API:  MCP auto-enable conditions not met: studentId=undefined, email=oluwatobi.salau@miva.edu.ng                          better-chatbot 10:23:45 PM
ℹ Chat API:  tool mode: auto, mentions: 0                                                                                        better-chatbot 10:23:45 PM
ℹ Chat API:  allowedMcpTools: 14, allowedAppDefaultToolkit: 1                                                                    better-chatbot 10:23:45 PM
ℹ Chat API:  binding tool count APP_DEFAULT: 4, MCP: 8, Workflow: 0                                                              better-chatbot 10:23:45 PM
ℹ Chat API:  model: anthropic/claude-3-7-sonnet                                                                                  better-chatbot 10:23:45 PM
[MCP Context] Tool: get_course_info, Original input: { course_code: 'CS101', include_materials: true }
[MCP Context] User context: undefined
[MCP Context] No user context available
ℹ [6694] MCP Client miva-academic:  tool call get_course_info                                                                    better-chatbot 10:23:48 PM
[MCP Context] Tool: get_course_info, Original input: { course_code: 'CS101' }
[MCP Context] User context: undefined
[MCP Context] No user context available
ℹ [6694] MCP Client miva-academic:  tool call get_course_info                                                                    better-chatbot 10:23:52 PM
[MCP Context] Tool: get_course_syllabus, Original input: { course_code: 'CS101', student_id: 'oluwatobi.salau@miva.edu.ng' }
[MCP Context] User context: undefined
[MCP Context] No user context available
ℹ [6694] MCP Client miva-academic:  tool call get_course_syllabus                                                                better-chatbot 10:23:56 PM
[MCP Context] Tool: get_course_materials, Original input: { course_code: 'CS101', student_id: 'oluwatobi.salau@miva.edu.ng' }
[MCP Context] User context: undefined
[MCP Context] No user context available
ℹ [6694] MCP Client miva-academic:  tool call get_course_materials                                                               better-chatbot 10:24:00 PM
[MCP Context] Tool: view_course_announcements, Original input: {
  course_code: 'CS101',
  student_id: 'oluwatobi.salau@miva.edu.ng',
  limit: 3
}
[MCP Context] User context: undefined
[MCP Context] No user context available
ℹ [6694] MCP Client miva-academic:  tool call view_course_announcements                                                          better-chatbot 10:24:03 PM
 ⨯ [Error: failed to pipe response] {
  [cause]: ReferenceError: userAcademicContext is not defined
      at onFinish (src/app/api/chat/route.ts:331:8)
    329 |
    330 |         // Record academic conversation for memory and context building
  > 331 |         if (userAcademicContext?.studentId && session?.user?.email?.endsWith('@miva.edu.ng')) {
        |        ^
    332 |           try {
    333 |             // Extract conversation details for memory
    334 |             const userText = message.parts.find(p => p.type === 'text')?.text || '';
}
 ⨯ [Error: failed to pipe response] {
  [cause]: ReferenceError: userAcademicContext is not defined
      at onFinish (src/app/api/chat/route.ts:331:8)
    329 |
    330 |         // Record academic conversation for memory and context building
  > 331 |         if (userAcademicContext?.studentId && session?.user?.email?.endsWith('@miva.edu.ng')) {
        |        ^
    332 |           try {
    333 |             // Extract conversation details for memory
    334 |             const userText = message.parts.find(p => p.type === 'text')?.text || '';
}
 POST /api/chat 500 in 24877ms
 GET /api/thread 200 in 47ms
^Cℹ [6694] MCP Client miva-academic:  Disconnecting from MCP server                                                                better-chatbot 10:24:38 PM

MAC@Tobbie frontend % 