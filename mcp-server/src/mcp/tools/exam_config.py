EXAM_TEMPLATES = {
    "midterm": {
        "duration_minutes": 90,
        "question_count": 50,
        "difficulty_mix": {"easy": 0.3, "medium": 0.5, "hard": 0.2},
        "question_types": {"multiple_choice": 0.7, "short_answer": 0.3},
        "coverage_type": "weeks_1_to_8",
        "description": "Mid-semester comprehensive exam covering first half of course"
    },
    "final": {
        "duration_minutes": 180,
        "question_count": 100,
        "difficulty_mix": {"easy": 0.2, "medium": 0.5, "hard": 0.3},
        "question_types": {"multiple_choice": 0.6, "short_answer": 0.3, "essay": 0.1},
        "coverage_type": "all_course",
        "description": "Comprehensive final exam covering entire course"
    },
    "chapter_test": {
        "duration_minutes": 60,
        "question_count": 30,
        "difficulty_mix": {"easy": 0.4, "medium": 0.4, "hard": 0.2},
        "question_types": {"multiple_choice": 0.8, "short_answer": 0.2},
        "coverage_type": "specified_weeks",
        "description": "Chapter-focused test covering specific topics"
    }
}

def get_exam_template(exam_type: str) -> dict:
    return EXAM_TEMPLATES.get(exam_type, EXAM_TEMPLATES["midterm"])

def get_exam_instructions(exam_type: str, template: dict) -> str:
    return f"""
# EXAM INSTRUCTIONS

## Exam Type: {exam_type.upper()}
{template['description']}

### Time Limit
You have **{template['duration_minutes']} minutes** to complete this exam.

### Number of Questions
Total: **{template['question_count']} questions**

### Question Types
""" + "\n".join([f"- {qtype.replace('_', ' ').title()}: {int(ratio * 100)}%" 
                for qtype, ratio in template['question_types'].items()]) + """

### Instructions
1. Read each question carefully before answering
2. For multiple choice: Select the BEST answer
3. For short answer: Be concise but complete
4. For essay questions: Provide detailed, structured responses
5. You may skip questions and return to them later
6. Submit before time expires or answers will be auto-submitted

### Grading
- Each question is worth equal points unless otherwise specified
- Partial credit may be awarded for short answer and essay questions
- Final score will be calculated as: (Correct Answers / Total Questions) × 100

### Academic Integrity
- This is a closed-book exam unless specified otherwise
- Do not use external resources or AI assistance
- Your work should be entirely your own

**Good luck!**
"""

def generate_grading_rubric(questions: list) -> dict:
    total_questions = len(questions)
    points_per_question = 100 / total_questions if total_questions > 0 else 0
    
    rubric = {
        "total_points": 100,
        "total_questions": total_questions,
        "points_per_question": round(points_per_question, 2),
        "grading_scale": {
            "A": {"min": 90, "max": 100},
            "B": {"min": 80, "max": 89},
            "C": {"min": 70, "max": 79},
            "D": {"min": 60, "max": 69},
            "F": {"min": 0, "max": 59}
        },
        "question_breakdown": []
    }
    
    for i, question in enumerate(questions, 1):
        rubric["question_breakdown"].append({
            "question_number": i,
            "type": question.get("type", "multiple_choice"),
            "points": round(points_per_question, 2),
            "partial_credit": question.get("type") in ["short_answer", "essay"]
        })
    
    return rubric
