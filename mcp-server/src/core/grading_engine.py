#!/usr/bin/env python3
"""
MIVA University Grading Engine
Orchestrates different grading strategies based on question type and confidence levels
"""

import logging
from typing import Dict, Any, List, Optional
from enum import Enum

from grading_strategies import (
    BaseGrader,
    ExactMatchGrader,
    FuzzyMatchGrader,
    SemanticGrader,
    RubricGrader,
    GradingResult
)

logger = logging.getLogger(__name__)


class QuestionType(Enum):
    """Supported question types"""
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    SHORT_ANSWER = "short_answer"
    ESSAY = "essay"
    FILL_IN_BLANK = "fill_in_blank"


class GradingConfig:
    """Configuration for grading thresholds and behavior"""
    
    # Confidence thresholds
    HIGH_CONFIDENCE_THRESHOLD = 0.75
    LOW_CONFIDENCE_THRESHOLD = 0.50
    
    # Grading thresholds
    FUZZY_MATCH_THRESHOLD = 0.85  # 85% similarity for typos
    SEMANTIC_THRESHOLD = 0.70     # 70% semantic similarity
    ESSAY_PASSING_THRESHOLD = 0.60  # 60% for essays
    
    # Strategy selection
    USE_SEMANTIC_FOR_BORDERLINE = True  # Use AI for borderline fuzzy matches
    BORDERLINE_LOWER = 0.40  # Below this, don't bother with semantic check
    BORDERLINE_UPPER = 0.70  # Above this, trust fuzzy match
    
    # Keyword extraction
    FUZZY_KEYWORD_WEIGHT = 0.6  # 60% weight to keywords, 40% to string similarity


class GradingOrchestrator:
    """
    Main grading orchestrator that routes questions to appropriate grading strategies
    and combines results when needed
    """
    
    def __init__(self, ai_stack=None):
        """
        Initialize grading orchestrator with AI stack
        
        Args:
            ai_stack: MIVA AI Stack instance for semantic grading
        """
        self.ai_stack = ai_stack
        self.config = GradingConfig()
        
        # Initialize graders
        self.exact_grader = ExactMatchGrader(case_sensitive=False)
        self.fuzzy_grader = FuzzyMatchGrader(
            typo_threshold=self.config.FUZZY_MATCH_THRESHOLD,
            keyword_weight=self.config.FUZZY_KEYWORD_WEIGHT
        )
        
        # AI-powered graders (only if AI stack available)
        if self.ai_stack:
            self.semantic_grader = SemanticGrader(
                self.ai_stack,
                similarity_threshold=self.config.SEMANTIC_THRESHOLD
            )
            self.rubric_grader = RubricGrader(self.ai_stack)
        else:
            self.semantic_grader = None
            self.rubric_grader = None
            logger.warning("AI stack not provided. Semantic and rubric grading unavailable.")
    
    async def grade_answer(
        self,
        student_answer: str,
        correct_answer: str,
        question_type: str,
        question_data: Optional[Dict[str, Any]] = None
    ) -> GradingResult:
        """
        Grade a single answer using the appropriate strategy
        
        Args:
            student_answer: Student's submitted answer
            correct_answer: Correct/expected answer
            question_type: Type of question (multiple_choice, short_answer, etc.)
            question_data: Additional question metadata (rubric, points, etc.)
        
        Returns:
            GradingResult with score, feedback, and metadata
        """
        if question_data is None:
            question_data = {}
        
        # Normalize question type
        try:
            q_type = QuestionType(question_type)
        except ValueError:
            logger.warning(f"Unknown question type: {question_type}. Defaulting to short_answer")
            q_type = QuestionType.SHORT_ANSWER
        
        # Route to appropriate grading strategy
        if q_type in [QuestionType.MULTIPLE_CHOICE, QuestionType.TRUE_FALSE]:
            return await self._grade_objective(student_answer, correct_answer, question_data)
        
        elif q_type == QuestionType.SHORT_ANSWER or q_type == QuestionType.FILL_IN_BLANK:
            return await self._grade_short_answer(student_answer, correct_answer, question_data)
        
        elif q_type == QuestionType.ESSAY:
            return await self._grade_essay(student_answer, correct_answer, question_data)
        
        else:
            # Fallback
            logger.warning(f"Unhandled question type: {q_type}. Using fuzzy match.")
            return await self.fuzzy_grader.grade(student_answer, correct_answer, question_data)
    
    async def _grade_objective(
        self,
        student_answer: str,
        correct_answer: str,
        question_data: Dict[str, Any]
    ) -> GradingResult:
        """Grade objective questions (multiple choice, true/false) using exact match"""
        logger.debug(f"Grading objective question with exact match")
        return await self.exact_grader.grade(student_answer, correct_answer, question_data)
    
    async def _grade_short_answer(
        self,
        student_answer: str,
        correct_answer: str,
        question_data: Dict[str, Any]
    ) -> GradingResult:
        """
        Grade short answer questions with hybrid approach:
        1. First try fuzzy matching (fast)
        2. If borderline confidence, verify with semantic AI (accurate)
        """
        logger.debug(f"Grading short answer question")
        
        # First pass: Fuzzy matching
        fuzzy_result = await self.fuzzy_grader.grade(
            student_answer,
            correct_answer,
            question_data
        )
        
        # Check if result is in borderline range
        is_borderline = (
            self.config.BORDERLINE_LOWER <= fuzzy_result.score <= self.config.BORDERLINE_UPPER
            and fuzzy_result.confidence < self.config.HIGH_CONFIDENCE_THRESHOLD
        )
        
        # If borderline and semantic grading available, verify with AI
        if is_borderline and self.semantic_grader and self.config.USE_SEMANTIC_FOR_BORDERLINE:
            logger.debug(f"Borderline fuzzy result (score={fuzzy_result.score:.2f}, confidence={fuzzy_result.confidence:.2f}). Verifying with semantic grading.")
            
            semantic_result = await self.semantic_grader.grade(
                student_answer,
                correct_answer,
                question_data
            )
            
            # Combine results: Average scores, use semantic confidence
            combined_score = (fuzzy_result.score * 0.4 + semantic_result.score * 0.6)
            
            # Use semantic result as primary, but note fuzzy agreement
            return GradingResult(
                score=combined_score,
                is_correct=combined_score >= self.config.SEMANTIC_THRESHOLD,
                confidence=semantic_result.confidence,
                feedback=semantic_result.feedback + f" (Fuzzy match score: {fuzzy_result.score:.0%})",
                strategy_used="hybrid_fuzzy_semantic",
                metadata={
                    "fuzzy_result": {
                        "score": fuzzy_result.score,
                        "confidence": fuzzy_result.confidence
                    },
                    "semantic_result": {
                        "score": semantic_result.score,
                        "confidence": semantic_result.confidence
                    },
                    "combined_score": combined_score
                }
            )
        
        # If not borderline or semantic unavailable, use fuzzy result
        return fuzzy_result
    
    async def _grade_essay(
        self,
        student_answer: str,
        correct_answer: str,
        question_data: Dict[str, Any]
    ) -> GradingResult:
        """Grade essay questions using AI rubric grading"""
        logger.debug(f"Grading essay question")
        
        if not self.rubric_grader:
            logger.warning("Rubric grader unavailable. Falling back to fuzzy match for essay.")
            return await self.fuzzy_grader.grade(student_answer, correct_answer, question_data)
        
        return await self.rubric_grader.grade(student_answer, correct_answer, question_data)
    
    async def grade_exam(
        self,
        student_answers: Dict[int, str],
        exam_questions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Grade an entire exam
        
        Args:
            student_answers: Map of question_number -> student_answer
            exam_questions: List of question data with correct answers
        
        Returns:
            Comprehensive grading results including per-question scores and statistics
        """
        logger.info(f"Grading exam with {len(exam_questions)} questions")
        
        results = []
        correct_count = 0
        total_score = 0.0
        requires_review = False
        weak_topics = []
        
        for question in exam_questions:
            q_num = question.get('question_number', 0)
            question_type = question.get('type', 'short_answer')
            correct_answer = question.get('correct_answer') or question.get('sample_answer', '')
            student_answer = student_answers.get(q_num, '')
            
            # Grade the question
            result = await self.grade_answer(
                student_answer,
                correct_answer,
                question_type,
                question_data=question
            )
            
            # Track statistics
            if result.is_correct:
                correct_count += 1
            
            total_score += result.score
            
            # Flag for review if low confidence
            if result.confidence < self.config.LOW_CONFIDENCE_THRESHOLD:
                requires_review = True
            
            # Track weak topics
            if not result.is_correct and 'topic' in question:
                weak_topics.append(question['topic'])
            
            # Store result
            results.append({
                'question_number': q_num,
                'question_type': question_type,
                'student_answer': student_answer,
                'correct_answer': correct_answer,
                'score': result.score,
                'is_correct': result.is_correct,
                'confidence': result.confidence,
                'feedback': result.feedback,
                'strategy_used': result.strategy_used,
                'metadata': result.metadata
            })
        
        # Calculate final statistics
        total_questions = len(exam_questions)
        percentage_score = (total_score / total_questions * 100) if total_questions > 0 else 0
        
        # Determine letter grade
        if percentage_score >= 90:
            grade = 'A'
        elif percentage_score >= 80:
            grade = 'B'
        elif percentage_score >= 70:
            grade = 'C'
        elif percentage_score >= 60:
            grade = 'D'
        else:
            grade = 'F'
        
        return {
            'per_question_results': results,
            'statistics': {
                'total_questions': total_questions,
                'correct_answers': correct_count,
                'total_score': total_score,
                'percentage_score': round(percentage_score, 2),
                'grade': grade,
                'requires_faculty_review': requires_review,
                'weak_topics': list(set(weak_topics))  # Unique topics
            }
        }
    
    async def grade_quiz(
        self,
        student_answers: Dict[int, str],
        quiz_questions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Grade a quiz (similar to exam but simpler)
        
        Args:
            student_answers: Map of question_number -> student_answer
            quiz_questions: List of question data with correct answers
        
        Returns:
            Grading results with scores and feedback
        """
        # Quiz grading is same as exam grading for now
        return await self.grade_exam(student_answers, quiz_questions)
