"use client";
import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "ui/card";
import { Button } from "ui/button";
import { Badge } from "ui/badge";
import { Input } from "ui/input";
import { 
  Brain, 
  Send, 
  BookOpen, 
  Lightbulb,
  MessageSquare,
  Zap,
  Clock,
  Target,
  User,
  Bot,
  FileText
} from "lucide-react";

export default function StudyBuddyPage() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: "Hello! I'm your AI Study Buddy. I can help you with questions about your courses, create study materials, and provide explanations. What would you like to study today?",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mock courses - in real implementation, fetch from API
  const enrolledCourses = [
    { id: "1", code: "CS101", name: "Introduction to Programming" },
    { id: "2", code: "MATH201", name: "Calculus II" },
    { id: "3", code: "PHYS101", name: "General Physics" },
  ];

  const quickActions = [
    { icon: Lightbulb, text: "Explain a concept", action: "explain" },
    { icon: FileText, text: "Create quiz", action: "quiz" },
    { icon: Target, text: "Study plan", action: "plan" },
    { icon: BookOpen, text: "Summarize notes", action: "summarize" },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user' as const,
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      // Mock API call - in real implementation, call MCP Study Buddy API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot' as const,
        content: generateMockResponse(inputMessage, selectedCourse),
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot' as const,
        content: "I'm sorry, I encountered an error. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    const actionMessages = {
      explain: "Can you explain a concept from my courses?",
      quiz: "Create a quiz to test my understanding",
      plan: "Help me create a study plan",
      summarize: "Summarize my recent course materials"
    };
    
    setInputMessage(actionMessages[action] || "");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-purple-600" />
            Study Buddy
          </h1>
          <p className="text-muted-foreground mt-1">
            Your AI-powered academic assistant
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
            <Zap className="mr-1 h-3 w-3" />
            AI Powered
          </Badge>
        </div>
      </div>

      <div className="flex-1 grid gap-4 md:grid-cols-4">
        {/* Sidebar */}
        <div className="md:col-span-1 space-y-4">
          {/* Course Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Course Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant={selectedCourse === "" ? "default" : "outline"}
                size="sm"
                className="w-full justify-start"
                onClick={() => setSelectedCourse("")}
              >
                All Courses
              </Button>
              {enrolledCourses.map((course) => (
                <Button
                  key={course.id}
                  variant={selectedCourse === course.id ? "default" : "outline"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setSelectedCourse(course.id)}
                >
                  {course.code}
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickActions.map((action) => (
                <Button
                  key={action.action}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => handleQuickAction(action.action)}
                >
                  <action.icon className="mr-2 h-3 w-3" />
                  {action.text}
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Study Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Study Session</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-muted-foreground">Time: 0m</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MessageSquare className="h-4 w-4 text-green-600" />
                <span className="text-muted-foreground">Questions: {messages.filter(m => m.type === 'user').length}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Area */}
        <div className="md:col-span-3 flex flex-col">
          <Card className="flex-1 flex flex-col">
            {/* Messages */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.type === 'bot' && (
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-purple-600" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.type === 'user' 
                        ? 'text-primary-foreground/70' 
                        : 'text-muted-foreground'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  {message.type === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </CardContent>

            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about your studies..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              {selectedCourse && (
                <p className="text-xs text-muted-foreground mt-2">
                  Context: {enrolledCourses.find(c => c.id === selectedCourse)?.code}
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Mock response generator - in real implementation, this would call the MCP Study Buddy API
function generateMockResponse(userMessage: string, courseContext: string): string {
  const responses = [
    "That's a great question! Let me help you understand this concept step by step.",
    "Based on your course materials, here's what I found relevant to your question...",
    "I can help you with that! Let me break this down into simpler parts.",
    "This is an important topic in your studies. Here's a detailed explanation...",
    "Great question! This connects to several concepts we've covered. Let me explain..."
  ];
  
  return responses[Math.floor(Math.random() * responses.length)] + 
    "\n\nWould you like me to create some practice questions on this topic?";
}