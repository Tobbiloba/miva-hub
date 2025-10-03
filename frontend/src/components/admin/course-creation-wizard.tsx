"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  BookOpen, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Loader2, 
  AlertCircle,
  Settings,
  List,
  CheckCircle
} from "lucide-react";

interface Department {
  id: string;
  name: string;
  code: string;
}

interface CourseFormData {
  courseCode: string;
  title: string;
  description: string;
  credits: number;
  departmentId: string;
  level: string;
  semesterOffered: string;
  isActive: boolean;
  totalWeeks: number;
  startDate: string;
  endDate: string;
}

interface WeekPlan {
  weekNumber: number;
  title: string;
  description: string;
  learningObjectives: string[];
  topics: string[];
}

const initialFormData: CourseFormData = {
  courseCode: "",
  title: "",
  description: "",
  credits: 3,
  departmentId: "",
  level: "100L",
  semesterOffered: "both",
  isActive: true,
  totalWeeks: 16,
  startDate: "",
  endDate: ""
};

const academicLevels = [
  { value: "100L", label: "100 Level (Freshman)" },
  { value: "200L", label: "200 Level (Sophomore)" },
  { value: "300L", label: "300 Level (Junior)" },
  { value: "400L", label: "400 Level (Senior)" },
  { value: "graduate", label: "Graduate Level" },
  { value: "doctoral", label: "Doctoral Level" }
];

const semesterOptions = [
  { value: "fall", label: "Fall Semester" },
  { value: "spring", label: "Spring Semester" },
  { value: "summer", label: "Summer Semester" },
  { value: "both", label: "Both Fall & Spring" }
];

const steps = [
  { id: 1, title: "Basic Information", description: "Course details and metadata" },
  { id: 2, title: "Course Planning", description: "Duration and academic structure" },
  { id: 3, title: "Weekly Structure", description: "Week-by-week course planning" },
  { id: 4, title: "Review & Create", description: "Review and finalize course" }
];

interface CourseCreationWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function CourseCreationWizard({ onComplete, onCancel }: CourseCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CourseFormData>(initialFormData);
  const [weeklyPlans, setWeeklyPlans] = useState<WeekPlan[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Fetch departments on component mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await fetch('/api/admin/departments');
        const data = await response.json();
        
        if (data.success) {
          setDepartments(data.data);
        } else {
          toast({
            title: "Error",
            description: "Failed to load departments",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error fetching departments:', error);
        toast({
          title: "Error",
          description: "Failed to load departments",
          variant: "destructive"
        });
      } finally {
        setIsLoadingDepartments(false);
      }
    };

    fetchDepartments();
  }, []);

  // Initialize weekly plans when total weeks changes
  useEffect(() => {
    if (formData.totalWeeks && formData.totalWeeks > 0) {
      const plans: WeekPlan[] = Array.from({ length: formData.totalWeeks }, (_, i) => ({
        weekNumber: i + 1,
        title: `Week ${i + 1}`,
        description: "",
        learningObjectives: [],
        topics: []
      }));
      setWeeklyPlans(plans);
    }
  }, [formData.totalWeeks]);

  const handleInputChange = (field: keyof CourseFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error for this field if it exists
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ""
      }));
    }
  };

  const updateWeekPlan = (weekNumber: number, field: keyof WeekPlan, value: any) => {
    setWeeklyPlans(prev => prev.map(week => 
      week.weekNumber === weekNumber 
        ? { ...week, [field]: value }
        : week
    ));
  };

  const validateCurrentStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    switch (currentStep) {
      case 1: // Basic Information
        if (!formData.courseCode.trim()) {
          newErrors.courseCode = "Course code is required";
        }
        if (!formData.title.trim()) {
          newErrors.title = "Course title is required";
        }
        if (!formData.departmentId) {
          newErrors.departmentId = "Department is required";
        }
        break;

      case 2: // Course Planning
        if (!formData.startDate) {
          newErrors.startDate = "Start date is required";
        }
        if (!formData.endDate) {
          newErrors.endDate = "End date is required";
        }
        if (formData.startDate && formData.endDate && formData.startDate >= formData.endDate) {
          newErrors.endDate = "End date must be after start date";
        }
        break;

      case 3: // Weekly Structure
        const emptyWeeks = weeklyPlans.filter(week => !week.title.trim() || week.title === `Week ${week.weekNumber}`);
        if (emptyWeeks.length > 0) {
          newErrors.weeklyPlans = `Please provide titles for all ${emptyWeeks.length} weeks`;
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateCurrentStep() && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setIsLoading(true);

    try {
      // First create the course
      const courseResponse = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const courseData = await courseResponse.json();

      if (!courseData.success) {
        throw new Error(courseData.message || "Failed to create course");
      }

      // Then create the weekly structure
      const courseId = courseData.data.id;
      
      for (const week of weeklyPlans) {
        const weekResponse = await fetch('/api/admin/course-weeks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId,
            weekNumber: week.weekNumber,
            title: week.title,
            description: week.description,
            learningObjectives: JSON.stringify(week.learningObjectives),
            topics: JSON.stringify(week.topics)
          }),
        });

        if (!weekResponse.ok) {
          console.warn(`Failed to create week ${week.weekNumber}`);
        }
      }

      toast({
        title: "Success",
        description: `Course "${formData.title}" created successfully with ${weeklyPlans.length} weeks`,
      });

      onComplete();
    } catch (error) {
      console.error('Error creating course:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create course",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingDepartments) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const progressValue = (currentStep / 4) * 100;

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Create New Course
          </h2>
          <div className="text-sm text-muted-foreground">
            Step {currentStep} of {steps.length}
          </div>
        </div>
        
        <Progress value={progressValue} className="mb-4" />
        
        <div className="flex justify-between text-xs text-muted-foreground">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex flex-col items-center ${
                step.id === currentStep ? "text-primary font-medium" : ""
              } ${step.id < currentStep ? "text-green-600" : ""}`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 ${
                  step.id < currentStep
                    ? "bg-green-100 text-green-600"
                    : step.id === currentStep
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {step.id < currentStep ? (
                  <CheckCircle className="w-3 h-3" />
                ) : (
                  step.id
                )}
              </div>
              <span className="hidden sm:block">{step.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {currentStep === 1 && <Settings className="h-5 w-5" />}
            {currentStep === 2 && <Calendar className="h-5 w-5" />}
            {currentStep === 3 && <List className="h-5 w-5" />}
            {currentStep === 4 && <CheckCircle className="h-5 w-5" />}
            {steps[currentStep - 1].title}
          </CardTitle>
          <CardDescription>
            {steps[currentStep - 1].description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="courseCode">Course Code *</Label>
                  <Input
                    id="courseCode"
                    placeholder="e.g., CS101, MATH201"
                    value={formData.courseCode}
                    onChange={(e) => handleInputChange('courseCode', e.target.value.toUpperCase())}
                  />
                  {errors.courseCode && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.courseCode}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="credits">Credits *</Label>
                  <Select
                    value={formData.credits.toString()}
                    onValueChange={(value) => handleInputChange('credits', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select credits" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6].map((credit) => (
                        <SelectItem key={credit} value={credit.toString()}>
                          {credit} Credit{credit > 1 ? 's' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Course Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Introduction to Computer Science"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                />
                {errors.title && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.title}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Course Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the course content and objectives"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="department">Department *</Label>
                  <Select
                    value={formData.departmentId}
                    onValueChange={(value) => handleInputChange('departmentId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.code} - {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.departmentId && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.departmentId}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="level">Academic Level</Label>
                  <Select
                    value={formData.level}
                    onValueChange={(value) => handleInputChange('level', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {academicLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="semester">Semester Offered</Label>
                <Select
                  value={formData.semesterOffered}
                  onValueChange={(value) => handleInputChange('semesterOffered', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {semesterOptions.map((semester) => (
                      <SelectItem key={semester.value} value={semester.value}>
                        {semester.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                />
                <Label htmlFor="isActive">
                  Course is active and available for enrollment
                </Label>
              </div>
            </div>
          )}

          {/* Step 2: Course Planning */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="totalWeeks">Total Weeks</Label>
                <Select
                  value={formData.totalWeeks.toString()}
                  onValueChange={(value) => handleInputChange('totalWeeks', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select total weeks" />
                  </SelectTrigger>
                  <SelectContent>
                    {[12, 14, 16, 18, 20].map((weeks) => (
                      <SelectItem key={weeks} value={weeks.toString()}>
                        {weeks} weeks
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Course Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                  />
                  {errors.startDate && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.startDate}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">Course End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                  />
                  {errors.endDate && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.endDate}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Course Structure Overview</h4>
                <ul className="text-sm text-blue-700 dark:text-blue-200 space-y-1">
                  <li>• Duration: {formData.totalWeeks} weeks</li>
                  <li>• Credits: {formData.credits}</li>
                  <li>• Level: {academicLevels.find(l => l.value === formData.level)?.label}</li>
                  <li>• Semester: {semesterOptions.find(s => s.value === formData.semesterOffered)?.label}</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 3: Weekly Structure */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {errors.weeklyPlans && (
                <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.weeklyPlans}
                  </p>
                </div>
              )}

              <div className="grid gap-4 max-h-96 overflow-y-auto">
                {weeklyPlans.map((week) => (
                  <Card key={week.weekNumber} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-muted-foreground">
                          Week {week.weekNumber}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`week-${week.weekNumber}-title`}>Week Title *</Label>
                        <Input
                          id={`week-${week.weekNumber}-title`}
                          placeholder={`Week ${week.weekNumber} topic...`}
                          value={week.title}
                          onChange={(e) => updateWeekPlan(week.weekNumber, 'title', e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`week-${week.weekNumber}-description`}>Description</Label>
                        <Textarea
                          id={`week-${week.weekNumber}-description`}
                          placeholder="Brief description of this week's content..."
                          rows={2}
                          value={week.description}
                          onChange={(e) => updateWeekPlan(week.weekNumber, 'description', e.target.value)}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Review & Create */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Course Summary</h4>
                <div className="grid gap-4 p-4 bg-muted rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Course Code:</span>
                    <span className="font-medium">{formData.courseCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Title:</span>
                    <span className="font-medium">{formData.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Credits:</span>
                    <span className="font-medium">{formData.credits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium">{formData.totalWeeks} weeks</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Department:</span>
                    <span className="font-medium">
                      {departments.find(d => d.id === formData.departmentId)?.name}
                    </span>
                  </div>
                </div>

                <h4 className="font-medium mt-6">Weekly Structure ({weeklyPlans.length} weeks)</h4>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {weeklyPlans.map((week) => (
                    <div key={week.weekNumber} className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="text-sm">Week {week.weekNumber}</span>
                      <span className="text-sm font-medium">{week.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <div className="flex gap-2">
          {currentStep > 1 && (
            <Button variant="outline" onClick={prevStep}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
          )}
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>

        <div>
          {currentStep < 4 ? (
            <Button onClick={nextStep}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Create Course
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}