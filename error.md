2025-10-17 15:15:36,804 - study_buddy_api - INFO - 🎉 MIVA Study Buddy API ready for intelligent conversations!
INFO:     Application startup complete.
2025-10-17 15:17:17,739 - study_buddy_api - INFO - 🤔 Received question: What are data structures?...
2025-10-17 15:17:18,391 - study_buddy_api.StudyBuddyEngine - ERROR - Content search failed: operator does not exist: text <=> vector
LINE 13:                     (ce.embedding <=> ARRAY[0.13322061300277...
                                           ^
HINT:  No operator matches the given name and argument types. You might need to add explicit type casts.

2025-10-17 15:17:18,391 - study_buddy_api - WARNING - No content found: Failed to search course content
INFO:     127.0.0.1:49638 - "POST /chat/ask HTTP/1.1" 404 Not Found
Processing request of type CallToolRequest
🔍 [ask_study_question] Called with:
   - Question: 'What are data structures?'
   - Course ID: None
   - Difficulty: beginner
   - Target API: http://localhost:8083
💬 Sending question to Study Buddy API...
   - POST http://localhost:8083/chat/ask
   - Payload: {
  "question": "What are data structures?",
  "difficulty_preference": "beginner"
}
   - Timeout: 60.0s
HTTP Request: POST http://localhost:8083/chat/ask "HTTP/1.1 404 Not Found"
   - Response status: 404
   - Response headers: {'date': 'Fri, 17 Oct 2025 14:17:16 GMT', 'server': 'uvicorn', 'content-length': '44', 'content-type': 'application/json'}
   - Response body: {"detail":"Failed to search course content"}
   ❌ Error asking question: 404 {"detail":"Failed to search course content"}






