"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GraduationCap, Clock, CheckCircle2, XCircle, AlertTriangle, Loader2, CloudOff } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useExamProgress, useLoadExamProgress, clearExamProgress } from "@/hooks/useExamProgress";
import { authClient } from "@/lib/auth/client";
import { getStudentId } from "@/lib/auth/user-utils";

type ExamProps = {
  exam_id?: string;
  course_code: string;
  course_name: string;
  exam_type?: "midterm" | "final" | "quiz" | "practice";
  time_limit_minutes: number;
  total_questions: number;
  total_points: number;
  instructions?: string;
  questions: Array<{
    question: string;
    question_type: "multiple_choice" | "true_false" | "short_answer" | "essay";
    options?: string[];
    points: number;
    correct_answer?: string;
  }>;
  grading_rubric?: string;
  student_id?: string;
};

export function Exam(props: ExamProps) {
  const { data: session } = authClient.useSession();
  const studentId = getStudentId(session?.user);
  
  const [mode, setMode] = useState<"preview" | "interactive" | "results">("preview");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(props.time_limit_minutes * 60);
  const [submitted, setSubmitted] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  
  const { progress: savedProgress } = useLoadExamProgress(props.exam_id, studentId || undefined);
  
  const { saveStatus, forceSave } = useExamProgress({
    examId: props.exam_id,
    studentId: studentId || undefined,
    data: { answers, currentQuestion, timeRemaining, mode },
    debounceMs: 1000
  });
  
  useEffect(() => {
    if (savedProgress && mode === "preview") {
      if (savedProgress.mode === "results") {
        setAnswers(savedProgress.answers);
        setCurrentQuestion(savedProgress.currentQuestion);
        setTimeRemaining(savedProgress.timeRemaining);
        setMode("results");
      } else if (!showResumePrompt) {
        setShowResumePrompt(true);
      }
    }
  }, [savedProgress, showResumePrompt, mode]);
  
  const handleResumeProgress = () => {
    if (savedProgress) {
      setAnswers(savedProgress.answers);
      setCurrentQuestion(savedProgress.currentQuestion);
      setTimeRemaining(savedProgress.timeRemaining);
      setMode(savedProgress.mode as "preview" | "interactive" | "results");
      setShowResumePrompt(false);
    }
  };
  
  const handleStartFresh = async () => {
    await clearExamProgress(props.exam_id, studentId || undefined);
    setShowResumePrompt(false);
    setMode("interactive");
  };

  useEffect(() => {
    if (mode !== "interactive" || submitted) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [mode, submitted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswer = (answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion]: answer,
    }));
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    await clearExamProgress(props.exam_id, studentId || undefined);
    setMode("results");
  };

  const calculateScore = () => {
    let correct = 0;
    let totalPoints = 0;
    let earnedPoints = 0;
    
    props.questions.forEach((q, i) => {
      totalPoints += q.points;
      
      if (q.correct_answer && answers[i]) {
        if (answers[i] === q.correct_answer) {
          correct++;
          earnedPoints += q.points;
        } else if (q.question_type === 'short_answer' || q.question_type === 'essay') {
          const similarity = calculateStringSimilarity(answers[i], q.correct_answer);
          if (similarity > 0.85) {
            correct++;
            earnedPoints += q.points;
          } else if (similarity > 0.5) {
            earnedPoints += q.points * similarity;
          }
        }
      }
    });

    return { correct, totalPoints, earnedPoints };
  };
  
  const calculateStringSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1.0;
    
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = getEditDistance(s1, s2);
    return (longer.length - editDistance) / longer.length;
  };
  
  const getEditDistance = (s1: string, s2: string): number => {
    const costs: number[] = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  };

  const isWarningTime = timeRemaining <= 300 && timeRemaining > 0;

  const getSaveStatusDisplay = () => {
    switch (saveStatus.status) {
      case 'saving':
        return (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Saving...</span>
          </div>
        );
      case 'saved':
        return (
          <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-3 h-3" />
            <span>Saved</span>
          </div>
        );
      case 'offline':
        return (
          <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
            <CloudOff className="w-3 h-3" />
            <span>Offline</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
            <XCircle className="w-3 h-3" />
            <span>Error</span>
          </div>
        );
      default:
        return null;
    }
  };

  if (mode === "preview") {
    return (
      <div className="space-y-4">
        {showResumePrompt && savedProgress && (
          <Alert className="bg-blue-500/10 border-blue-500/20">
            <AlertDescription className="flex items-center justify-between">
              <span className="text-sm">
                Resume your previous attempt? ({Object.keys(savedProgress.answers).length} questions answered, {Math.floor(savedProgress.timeRemaining / 60)} min remaining)
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleStartFresh}>
                  Start Fresh
                </Button>
                <Button size="sm" onClick={handleResumeProgress}>
                  Resume
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        <Card className="bg-card">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-secondary/40">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-lg">
                    {props.exam_type ? props.exam_type.charAt(0).toUpperCase() + props.exam_type.slice(1) : "Exam"}
                  </h3>
                  {props.exam_type && (
                    <span className="px-2 py-1 rounded-full bg-secondary/40 text-xs font-medium capitalize">
                      {props.exam_type}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {props.course_code && <span className="font-medium">{props.course_code}</span>}
                  {props.course_name && props.course_code && " • "}
                  {props.course_name}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {props.time_limit_minutes} minutes
                  </span>
                  <span>•</span>
                  <span>{props.total_questions} questions</span>
                  <span>•</span>
                  <span>{props.total_points} points</span>
                </div>
                {props.instructions && (
                  <div className="mb-4 p-3 rounded-lg bg-secondary/40">
                    <p className="text-sm font-medium mb-1">Instructions:</p>
                    <p className="text-sm text-muted-foreground">
                      {props.instructions}
                    </p>
                  </div>
                )}
                <Button
                  onClick={() => setMode("interactive")}
                >
                  Start Exam
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mode === "results") {
    const { correct, totalPoints, earnedPoints } = calculateScore();
    const percentage = (earnedPoints / totalPoints) * 100;

    return (
      <div className="space-y-4">
        <Card className="bg-card">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <h3 className="font-semibold text-2xl mb-2">Exam Submitted!</h3>
              <div className="text-4xl font-bold mb-2">
                {percentage.toFixed(0)}%
              </div>
              <p className="text-muted-foreground">
                {correct} out of {props.total_questions} correct • {earnedPoints.toFixed(1)} / {totalPoints} points
              </p>
            </div>
            <Button onClick={() => setMode("preview")} className="w-full">
              Close Results
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {props.questions.map((q, i) => {
            const wasAnswered = answers[i] !== undefined;
            let score = 0;
            let isFullyCorrect = false;
            let isPartialCredit = false;
            
            if (q.correct_answer && answers[i]) {
              if (answers[i] === q.correct_answer) {
                score = 1.0;
                isFullyCorrect = true;
              } else if (q.question_type === 'short_answer' || q.question_type === 'essay') {
                const similarity = calculateStringSimilarity(answers[i], q.correct_answer);
                score = similarity;
                if (similarity > 0.85) {
                  isFullyCorrect = true;
                } else if (similarity > 0.5) {
                  isPartialCredit = true;
                }
              }
            }
            
            const borderColor = isFullyCorrect 
              ? "border-green-500/20" 
              : isPartialCredit 
                ? "border-yellow-500/20" 
                : wasAnswered 
                  ? "border-red-500/20" 
                  : "border-gray-500/20";
            
            return (
              <Card key={i} className={borderColor}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {isFullyCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                    ) : isPartialCredit ? (
                      <div className="w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center mt-0.5">
                        <span className="text-xs text-yellow-600 dark:text-yellow-400 font-bold">~</span>
                      </div>
                    ) : wasAnswered ? (
                      <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-500/20 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-sm">
                          Question {i + 1}: {q.question}
                        </p>
                        {wasAnswered && (
                          <span className={`text-xs font-medium px-2 py-1 rounded ${
                            isFullyCorrect 
                              ? "bg-green-500/10 text-green-600 dark:text-green-400" 
                              : isPartialCredit 
                                ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                                : "bg-red-500/10 text-red-600 dark:text-red-400"
                          }`}>
                            {(score * q.points).toFixed(1)}/{q.points} pts ({(score * 100).toFixed(0)}%)
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Your answer: {answers[i] || "Not answered"}
                      </p>
                      {q.correct_answer && !isFullyCorrect && wasAnswered && (
                        <>
                          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                            Expected answer: {q.correct_answer}
                          </p>
                          {isPartialCredit && (
                            <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                              ℹ️ Partial credit: Your answer demonstrates some understanding but is incomplete
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  const question = props.questions[currentQuestion];
  const currentAnswer = answers[currentQuestion];

  return (
    <div className="space-y-4">
      <Card className={`${isWarningTime ? "border-2 border-yellow-500/40 bg-yellow-500/5" : "bg-card"}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isWarningTime && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
              <Clock className="w-5 h-5" />
              <span className={`font-mono text-lg font-semibold ${isWarningTime ? "text-yellow-500" : ""}`}>
                {formatTime(timeRemaining)}
              </span>
              {isWarningTime && (
                <span className="text-sm text-yellow-600 dark:text-yellow-400">
                  Warning: Less than 5 minutes remaining!
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {getSaveStatusDisplay()}
              <Button
                onClick={handleSubmit}
                variant="destructive"
                size="sm"
              >
                Submit Exam
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-secondary/40">
        <CardContent className="p-4">
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {props.questions.map((_, i) => (
              <Button
                key={i}
                variant={currentQuestion === i ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentQuestion(i)}
                className={`h-10 ${
                  answers[i] !== undefined
                    ? "bg-green-500/20 hover:bg-green-500/30"
                    : ""
                }`}
              >
                {i + 1}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm text-muted-foreground">
              Question {currentQuestion + 1} of {props.total_questions}
            </h3>
            <span className="text-sm text-muted-foreground">
              {question.points} {question.points === 1 ? "point" : "points"}
            </span>
          </div>

          <h3 className="font-semibold text-lg mb-4">{question.question}</h3>

          {question.question_type === "multiple_choice" && question.options && (
            <RadioGroup value={currentAnswer} onValueChange={handleAnswer}>
              <div className="space-y-3">
                {question.options.map((option, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`q${currentQuestion}-opt${i}`} />
                    <Label
                      htmlFor={`q${currentQuestion}-opt${i}`}
                      className="flex-1 cursor-pointer"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}

          {question.question_type === "true_false" && (
            <RadioGroup value={currentAnswer} onValueChange={handleAnswer}>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="True" id={`q${currentQuestion}-true`} />
                  <Label htmlFor={`q${currentQuestion}-true`} className="cursor-pointer">
                    True
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="False" id={`q${currentQuestion}-false`} />
                  <Label htmlFor={`q${currentQuestion}-false`} className="cursor-pointer">
                    False
                  </Label>
                </div>
              </div>
            </RadioGroup>
          )}

          {question.question_type === "short_answer" && (
            <Input
              value={currentAnswer || ""}
              onChange={(e) => handleAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full"
            />
          )}

          {question.question_type === "essay" && (
            <Textarea
              value={currentAnswer || ""}
              onChange={(e) => handleAnswer(e.target.value)}
              placeholder="Type your essay response here..."
              className="w-full min-h-[200px]"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
