#!/usr/bin/env python3
"""
Grading Strategies for MIVA University Assessment System
Implements multiple grading approaches optimized for different question types
"""

import re
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from difflib import SequenceMatcher


@dataclass
class GradingResult:
    """Result of grading a single answer"""
    score: float  # 0.0 to 1.0 (percentage)
    is_correct: bool
    confidence: float  # 0.0 to 1.0 (how confident is the grading)
    feedback: str
    strategy_used: str
    metadata: Dict[str, Any]


class BaseGrader(ABC):
    """Abstract base class for all grading strategies"""
    
    @abstractmethod
    async def grade(
        self,
        student_answer: str,
        correct_answer: str,
        question_data: Dict[str, Any]
    ) -> GradingResult:
        """Grade a student's answer and return detailed result"""
        pass
    
    @abstractmethod
    def get_strategy_name(self) -> str:
        """Return the name of this grading strategy"""
        pass


class ExactMatchGrader(BaseGrader):
    """Grader for objective questions requiring exact matches"""
    
    def __init__(self, case_sensitive: bool = False):
        self.case_sensitive = case_sensitive
    
    async def grade(
        self,
        student_answer: str,
        correct_answer: str,
        question_data: Dict[str, Any]
    ) -> GradingResult:
        """Grade using exact string matching"""
        
        # Normalize answers
        student_ans = student_answer.strip()
        correct_ans = correct_answer.strip()
        
        if not self.case_sensitive:
            student_ans = student_ans.upper()
            correct_ans = correct_ans.upper()
        
        is_correct = student_ans == correct_ans
        
        return GradingResult(
            score=1.0 if is_correct else 0.0,
            is_correct=is_correct,
            confidence=1.0,  # Deterministic grading = 100% confident
            feedback="Correct!" if is_correct else f"Incorrect. Expected: {correct_answer}",
            strategy_used=self.get_strategy_name(),
            metadata={
                "student_answer": student_answer,
                "correct_answer": correct_answer,
                "case_sensitive": self.case_sensitive
            }
        )
    
    def get_strategy_name(self) -> str:
        return "exact_match"


class FuzzyMatchGrader(BaseGrader):
    """Grader for short answers allowing typos and variations"""
    
    def __init__(
        self,
        typo_threshold: float = 0.85,  # 85% similarity for typos
        keyword_weight: float = 0.6,   # 60% weight to keywords, 40% to similarity
    ):
        self.typo_threshold = typo_threshold
        self.keyword_weight = keyword_weight
    
    def _calculate_similarity(self, str1: str, str2: str) -> float:
        """Calculate Levenshtein-based similarity ratio"""
        return SequenceMatcher(None, str1.lower(), str2.lower()).ratio()
    
    def _extract_keywords(self, text: str) -> set:
        """Extract important keywords from text"""
        # Remove common stop words
        stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
            'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
            'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that',
            'these', 'those', 'it', 'its'
        }
        
        # Extract words (alphanumeric only)
        words = re.findall(r'\b[a-zA-Z0-9]+\b', text.lower())
        
        # Filter out stop words and short words
        keywords = {w for w in words if len(w) > 2 and w not in stop_words}
        
        return keywords
    
    def _calculate_keyword_score(self, student_answer: str, correct_answer: str) -> float:
        """Calculate score based on keyword overlap"""
        student_keywords = self._extract_keywords(student_answer)
        correct_keywords = self._extract_keywords(correct_answer)
        
        if not correct_keywords:
            return 1.0  # If no keywords in correct answer, don't penalize
        
        # Calculate Jaccard similarity
        intersection = student_keywords & correct_keywords
        union = student_keywords | correct_keywords
        
        if not union:
            return 0.0
        
        return len(intersection) / len(correct_keywords)
    
    async def grade(
        self,
        student_answer: str,
        correct_answer: str,
        question_data: Dict[str, Any]
    ) -> GradingResult:
        """Grade using fuzzy matching and keyword extraction"""
        
        # Calculate string similarity (handles typos)
        similarity_score = self._calculate_similarity(student_answer, correct_answer)
        
        # Calculate keyword overlap (handles different phrasings)
        keyword_score = self._calculate_keyword_score(student_answer, correct_answer)
        
        # Weighted combination
        combined_score = (
            (1 - self.keyword_weight) * similarity_score +
            self.keyword_weight * keyword_score
        )
        
        # Determine confidence based on agreement between metrics
        score_agreement = 1.0 - abs(similarity_score - keyword_score)
        confidence = min(1.0, score_agreement + 0.3)  # Boost confidence slightly
        
        # Determine if correct
        is_correct = combined_score >= self.typo_threshold
        
        # Generate feedback
        if is_correct:
            if similarity_score > 0.95:
                feedback = "Correct!"
            else:
                feedback = "Correct! (Minor spelling variation accepted)"
        else:
            if keyword_score > 0.5:
                feedback = f"Partially correct. You included key concepts but missed some details. Expected: {correct_answer}"
            else:
                feedback = f"Incorrect. Expected: {correct_answer}"
        
        return GradingResult(
            score=combined_score,
            is_correct=is_correct,
            confidence=confidence,
            feedback=feedback,
            strategy_used=self.get_strategy_name(),
            metadata={
                "similarity_score": similarity_score,
                "keyword_score": keyword_score,
                "combined_score": combined_score,
                "student_keywords": list(self._extract_keywords(student_answer)),
                "expected_keywords": list(self._extract_keywords(correct_answer))
            }
        )
    
    def get_strategy_name(self) -> str:
        return "fuzzy_match"


class SemanticGrader(BaseGrader):
    """Grader using AI semantic similarity for conceptual answers"""
    
    def __init__(self, ai_stack, similarity_threshold: float = 0.70):
        self.ai_stack = ai_stack
        self.similarity_threshold = similarity_threshold
    
    async def grade(
        self,
        student_answer: str,
        correct_answer: str,
        question_data: Dict[str, Any]
    ) -> GradingResult:
        """Grade using semantic similarity via embeddings"""
        
        # Calculate semantic similarity using AI
        similarity_score = await self.ai_stack.semantic_similarity(
            student_answer,
            correct_answer
        )
        
        # Normalize to 0-1 range (cosine similarity is already -1 to 1, but typically 0-1)
        normalized_score = max(0.0, min(1.0, similarity_score))
        
        is_correct = normalized_score >= self.similarity_threshold
        
        # Confidence is based on how far from threshold
        if is_correct:
            confidence = min(1.0, 0.7 + (normalized_score - self.similarity_threshold) * 0.3)
        else:
            confidence = min(1.0, 0.7 + (self.similarity_threshold - normalized_score) * 0.3)
        
        # Generate feedback
        if normalized_score >= 0.9:
            feedback = "Excellent! Your answer demonstrates strong understanding of the concept."
        elif normalized_score >= self.similarity_threshold:
            feedback = "Correct! Your answer captures the key concept."
        elif normalized_score >= 0.5:
            feedback = f"Partially correct. Your answer is related but missing key details. Expected concept: {correct_answer}"
        else:
            feedback = f"Incorrect. Your answer doesn't match the expected concept. Expected: {correct_answer}"
        
        return GradingResult(
            score=normalized_score,
            is_correct=is_correct,
            confidence=confidence,
            feedback=feedback,
            strategy_used=self.get_strategy_name(),
            metadata={
                "semantic_similarity": float(similarity_score),
                "threshold": self.similarity_threshold,
                "ai_model": "nomic-embed-text"
            }
        )
    
    def get_strategy_name(self) -> str:
        return "semantic_similarity"


class RubricGrader(BaseGrader):
    """Grader for essay questions using AI with rubric criteria"""
    
    def __init__(self, ai_stack):
        self.ai_stack = ai_stack
    
    async def grade(
        self,
        student_answer: str,
        correct_answer: str,
        question_data: Dict[str, Any]
    ) -> GradingResult:
        """Grade essay using AI analysis against rubric"""
        
        # Get rubric if available
        rubric = question_data.get('rubric', None)
        question_text = question_data.get('question', '')
        max_points = question_data.get('points', 10)
        
        # Build grading prompt
        if rubric:
            prompt = f"""You are grading a student's essay answer. Evaluate the response against the rubric criteria.

Question: {question_text}

Student's Answer:
{student_answer}

Model Answer/Expected Response:
{correct_answer}

Grading Rubric:
{rubric}

Evaluate the student's answer and provide:
1. A score from 0 to {max_points} points
2. Specific feedback on what was done well and what was missing
3. Which rubric criteria were met and which were not

Format your response as:
SCORE: [number]
FEEDBACK: [detailed feedback]
CRITERIA_MET: [list of met criteria]
CRITERIA_MISSED: [list of missed criteria]"""
        else:
            prompt = f"""You are grading a student's essay answer. Evaluate the response for accuracy and completeness.

Question: {question_text}

Student's Answer:
{student_answer}

Model Answer/Expected Response:
{correct_answer}

Evaluate the student's answer and provide:
1. A score from 0 to {max_points} points based on:
   - Accuracy of content (40%)
   - Completeness of response (30%)
   - Clarity and organization (20%)
   - Use of examples or evidence (10%)
2. Specific feedback on strengths and areas for improvement

Format your response as:
SCORE: [number]
FEEDBACK: [detailed feedback]"""
        
        # Get AI grading
        ai_response = await self.ai_stack.generate_llm_response(prompt)
        
        if not ai_response.get('success'):
            # Fallback to semantic similarity if AI fails
            similarity = await self.ai_stack.semantic_similarity(student_answer, correct_answer)
            score = similarity * max_points / max_points  # Normalize to 0-1
            return GradingResult(
                score=score,
                is_correct=score >= 0.6,
                confidence=0.5,  # Low confidence on fallback
                feedback=f"AI grading unavailable. Semantic similarity score: {similarity:.2f}",
                strategy_used=self.get_strategy_name(),
                metadata={"fallback": True, "ai_error": ai_response.get('error')}
            )
        
        # Parse AI response
        ai_text = ai_response.get('response', '')
        
        # Extract score
        awarded_points = None
        score_match = re.search(r'SCORE:\s*([0-9.]+)', ai_text)
        if score_match:
            awarded_points = float(score_match.group(1))
            normalized_score = min(1.0, awarded_points / max_points)
        else:
            # Fallback: estimate from feedback sentiment
            normalized_score = 0.7  # Default to passing if can't parse
        
        # Extract feedback
        feedback_match = re.search(r'FEEDBACK:\s*(.+?)(?=CRITERIA_MET:|$)', ai_text, re.DOTALL)
        feedback = feedback_match.group(1).strip() if feedback_match else ai_text[:500]
        
        is_correct = normalized_score >= 0.6  # 60% threshold for essays
        
        # Confidence based on clarity of AI response
        confidence = 0.85 if score_match else 0.6
        
        return GradingResult(
            score=normalized_score,
            is_correct=is_correct,
            confidence=confidence,
            feedback=feedback,
            strategy_used=self.get_strategy_name(),
            metadata={
                "ai_full_response": ai_text,
                "awarded_points": awarded_points if score_match else None,
                "max_points": max_points,
                "rubric_provided": rubric is not None
            }
        )
    
    def get_strategy_name(self) -> str:
        return "rubric_ai"
