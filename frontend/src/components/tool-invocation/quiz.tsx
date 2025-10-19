"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ClipboardList, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Loader2, CloudOff } from "lucide-react";
import { useQuizProgress, useLoadQuizProgress, clearQuizProgress } from "@/hooks/useQuizProgress";
import { authClient } from "@/lib/auth/client";
import { getStudentId } from "@/lib/auth/user-utils";

type QuizProps = {
  quiz_id?: string;
  title: string;
  course_name?: string;
  course_code?: string;
  total_questions: number;
  total_points: number;
  estimated_time?: string;
  instructions?: string;
  questions: Array<{
    question: string;
    question_type: "multiple_choice" | "true_false" | "short_answer";
    options?: string[];
    points: number;
    correct_answer?: string;
  }>;
};

export function Quiz(props: QuizProps) {
  const { data: session } = authClient.useSession();
  const studentId = getStudentId(session?.user);
  
  const [mode, setMode] = useState<"preview" | "interactive" | "results">("preview");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  
  const { progress: savedProgress } = useLoadQuizProgress(props.quiz_id, studentId || undefined);
  
  const { saveStatus, forceSave } = useQuizProgress({
    quizId: props.quiz_id,
    studentId: studentId || undefined,
    data: { answers, currentQuestion, mode },
    debounceMs: 1000
  });
  
  useEffect(() => {
    if (savedProgress && mode === "preview") {
      if (savedProgress.mode === "results") {
        setAnswers(savedProgress.answers);
        setCurrentQuestion(savedProgress.currentQuestion);
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
      setMode(savedProgress.mode as "preview" | "interactive" | "results");
      setShowResumePrompt(false);
    }
  };
  
  const handleStartFresh = async () => {
    await clearQuizProgress(props.quiz_id, studentId || undefined);
    setShowResumePrompt(false);
    setMode("interactive");
  };

  const questionProgress = ((currentQuestion + 1) / props.total_questions) * 100;

  const handleAnswer = (answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion]: answer,
    }));
  };

  const handleNext = () => {
    if (currentQuestion < props.total_questions - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    await clearQuizProgress(props.quiz_id, studentId || undefined);
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
        } else if (q.question_type === 'short_answer') {
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

  if (mode === "preview") {
    return (
      <div className="space-y-4">
        {showResumePrompt && savedProgress && (
          <Alert className="bg-blue-500/10 border-blue-500/20">
            <AlertDescription className="flex items-center justify-between">
              <span className="text-sm">
                Resume your previous attempt? ({Object.keys(savedProgress.answers).length} questions answered)
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
                <ClipboardList className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">{props.title}</h3>
                {(props.course_name || props.course_code) && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {props.course_code && <span className="font-medium">{props.course_code}</span>}
                    {props.course_name && props.course_code && " • "}
                    {props.course_name}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span>{props.total_questions} questions</span>
                  <span>•</span>
                  <span>{props.total_points} points</span>
                  {props.estimated_time && (
                    <>
                      <span>•</span>
                      <span>{props.estimated_time}</span>
                    </>
                  )}
                </div>
                {props.instructions && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {props.instructions}
                  </p>
                )}
                <Button
                  onClick={() => setMode("interactive")}
                >
                  Start Quiz
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
              <h3 className="font-semibold text-2xl mb-2">Quiz Complete!</h3>
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
              } else if (q.question_type === 'short_answer') {
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
                            Correct answer: {q.correct_answer}
                          </p>
                          {isPartialCredit && (
                            <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                              ℹ️ Partial credit: Your answer is close but not exact
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

  return (
    <div className="space-y-4">
      <Card className="bg-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">
              Question {currentQuestion + 1} of {props.total_questions}
            </div>
            <div className="flex items-center gap-3">
              {getSaveStatusDisplay()}
              <div className="text-sm text-muted-foreground">
                {question.points} {question.points === 1 ? "point" : "points"}
              </div>
            </div>
          </div>
          <Progress value={questionProgress} className="h-2" />
        </CardContent>
      </Card>

      <Card className="bg-secondary/40">
        <CardContent className="p-6">
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
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentQuestion === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        {currentQuestion === props.total_questions - 1 ? (
          <Button
            onClick={handleSubmit}
          >
            Submit Quiz
          </Button>
        ) : (
          <Button
            onClick={handleNext}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
