# MCP Server Usage Tracking Implementation

## Overview

This document describes the implementation of usage tracking in the MIVA Academic MCP Server. The system enforces subscription plan limits directly within MCP tools, ensuring users cannot exceed their plan allowances.

## Architecture

### Core Components

1. **Usage Tracker Service** (`src/core/usage_tracker.py`)
   - Connects to the same PostgreSQL database as the frontend
   - Implements usage checking and recording functions
   - Provides error response formatting

2. **Tool Integration**
   - Each usage-limited tool checks limits before execution
   - Records usage after successful completion
   - Returns formatted error messages when limits exceeded

3. **Database Integration**
   - Uses existing subscription and usage tracking tables
   - Leverages PostgreSQL stored procedures for consistency
   - Maintains data integrity with the frontend system

## Usage Type Mappings

| Tool Category | Usage Type | Period | Limit (Free/Pro/Max) |
|---------------|------------|--------|---------------------|
| AI Messages | `ai_messages_per_day` | Daily | 10/30/Unlimited |
| Quizzes | `quizzes_per_week` | Weekly | 1/3/Unlimited |
| Exams | `exams_per_month` | Monthly | 1/2/Unlimited |
| Flashcard Sets | `flashcard_sets_per_week` | Weekly | 1/2/Unlimited |
| Study Guides | `study_guides_per_week` | Weekly | 1/2/Unlimited |
| Material Searches | `material_searches_per_day` | Daily | 5/20/Unlimited |

## Implementation Details

### Usage Tracking Flow

```
1. User calls MCP tool
2. Tool checks usage limit via UsageTracker.check_and_enforce_usage()
3. If limit exceeded → Return error response with upgrade suggestion
4. If allowed → Execute tool functionality
5. On success → Record usage via UsageTracker.record_usage_after_success()
6. Return tool result
```

### Code Example

```python
@mcp.tool()
async def ask_study_question(
    question: str,
    course_id: Optional[int] = None,
    difficulty_level: str = "medium",
    student_id: Optional[str] = None
) -> str:
    # Check usage limit before processing
    if student_id:
        allowed, usage_info = await usage_tracker.check_and_enforce_usage(
            student_id, "ai_messages_per_day", "daily"
        )
        if not allowed:
            return create_usage_error_response(usage_info, "ask_study_question")
    
    try:
        # Execute tool functionality
        result = await process_study_question(question, course_id, difficulty_level)
        
        # Record usage after successful execution
        if student_id:
            await usage_tracker.record_usage_after_success(
                student_id, "ai_messages_per_day", "daily"
            )
        
        return result
    except Exception as e:
        # Don't record usage on error
        raise
```

## Modified Tools

### Study Buddy Tools (`tools/study_buddy_tools.py`)
- ✅ `ask_study_question` - AI messages (daily)
- ✅ `generate_study_guide` - Study guides (weekly)  
- ✅ `create_flashcards` - Flashcard sets (weekly)
- ✅ `generate_quiz` - Quizzes (weekly)

### Exam Tools (`tools/exam_tools.py`)
- ✅ `generate_exam_simulator` - Exams (monthly)
- ✅ `submit_exam_answers` - Exams (monthly)

### Notes Conversion Tools (`tools/notes_conversion_tools.py`)
- ✅ `convert_notes_to_flashcards` - Flashcard sets (weekly)

### Unlimited Tools (No Usage Tracking)
- `get_course_materials`
- `list_enrolled_courses`
- `get_upcoming_assignments`
- `get_academic_schedule`
- `get_course_info`

## Error Response Format

When usage limits are exceeded, tools return a structured JSON response:

```json
{
  "error": "Usage limit exceeded",
  "message": "You have reached your ask_study_question limit for this period.",
  "details": {
    "current_usage": 30,
    "limit": 30,
    "plan": "PRO",
    "tool": "ask_study_question"
  },
  "suggestion": "Upgrade your plan to get more usage or wait for the next billing period.",
  "upgrade_url": "/pricing",
  "support_email": "support@miva.edu.ng"
}
```

## Database Schema Integration

The usage tracking system uses the existing database tables:

- `subscription_plan` - Plan definitions with limits
- `user_subscription` - User subscription records
- `usage_tracking` - Current usage counts
- `user` - Student ID mappings

## Configuration

### Environment Variables
```bash
POSTGRES_URL=postgresql://user:password@host:port/database
# Or individual components:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=better_chatbot
DB_USER=postgres
DB_PASSWORD=password
```

### Usage Type Constants
```python
USAGE_TYPE_MAPPINGS = {
    "ask_study_question": ("ai_messages_per_day", "daily"),
    "generate_quiz": ("quizzes_per_week", "weekly"),
    "generate_exam_simulator": ("exams_per_month", "monthly"),
    # ... more mappings
}
```

## Testing

Run the test script to verify functionality:

```bash
cd mcp-server
python test_usage_tracking.py
```

The test script validates:
- Database connectivity
- Usage limit checking
- Usage recording
- Error response formatting

## Integration with Frontend

The MCP server usage tracking integrates seamlessly with the frontend:

1. **Shared Database**: Both systems use the same PostgreSQL database
2. **Consistent Logic**: Same stored procedures for usage operations
3. **Real-time Sync**: Usage updates are immediately reflected in both systems
4. **Student ID Mapping**: Automatic conversion from student ID to user ID

## Security Considerations

1. **Input Validation**: Student IDs are validated against the database
2. **Database Security**: Uses parameterized queries to prevent SQL injection
3. **Error Handling**: Graceful degradation when database is unavailable
4. **Permission Isolation**: MCP server has read/write access only to necessary tables

## Monitoring and Logging

The system logs:
- Usage check attempts and results
- Usage recording successes/failures
- Database connection issues
- Plan limit enforcement actions

## Future Enhancements

1. **Caching**: Add Redis caching for frequently checked usage data
2. **Rate Limiting**: Implement per-minute rate limits for additional protection
3. **Analytics**: Enhanced usage analytics and reporting
4. **Soft Limits**: Warning messages before hard limits are reached
5. **Burst Allowances**: Temporary limit increases for special events

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify POSTGRES_URL environment variable
   - Check database server availability
   - Validate credentials and permissions

2. **Student ID Not Found**
   - Ensure student has account in the system
   - Check student_id field in user table
   - Verify ID format matches expectations

3. **Usage Not Recording**
   - Check stored procedure execution
   - Verify usage_tracking table structure
   - Review transaction isolation levels

### Debug Mode

Enable debug logging:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Conclusion

The usage tracking implementation provides robust enforcement of subscription plan limits directly within the MCP server tools. This ensures that users cannot bypass frontend restrictions by calling tools directly, maintaining the integrity of the subscription system while providing clear feedback when limits are reached.