"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useObjectState } from "@/hooks/use-object-state";
import { cn } from "lib/utils";
import { ChevronLeft, Loader } from "lucide-react";
import { toast } from "sonner";
import { safe } from "ts-safe";
import { UserZodSchema } from "app-types/user";
import { existsByEmailAction } from "@/app/api/auth/actions";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { validateSchoolEmail } from "@/lib/utils/email-validation";

// SWR fetcher function
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SignUpPage() {
  const [step, setStep] = useState(1);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [formData, setFormData] = useObjectState({
    // Basic info
    email: "",
    name: "",
    studentId: "",
    password: "",
    // Academic info
    major: "",
    year: "",
    semester: "",
  });

  // Fetch departments and courses data
  const { data: departments } = useSWR('/api/departments/public', fetcher);
  const { data: coursesData } = useSWR('/api/courses/available', fetcher);

  const steps = [
    "Basic Information",
    "Academic Information", 
    "Course Selection",
  ];

  const safeProcessWithLoading = function <T>(fn: () => Promise<T>) {
    setIsLoading(true);
    return safe(() => fn()).watch(() => setIsLoading(false));
  };

  const backStep = () => {
    setStep(Math.max(step - 1, 1));
  };

  const validateBasicInfo = async () => {
    // Validate MIVA email
    const emailValidation = validateSchoolEmail(formData.email);
    if (!emailValidation.isValid) {
      toast.error(emailValidation.error || "Please use your MIVA University email address");
      return false;
    }

    // Check if email already exists
    const exists = await safeProcessWithLoading(() =>
      existsByEmailAction(formData.email),
    ).orElse(false);
    if (exists) {
      toast.error("Email already exists");
      return false;
    }

    // Validate name
    const { success: nameValid } = UserZodSchema.shape.name.safeParse(formData.name);
    if (!nameValid || !formData.name.trim()) {
      toast.error("Please enter your full name");
      return false;
    }

    // Validate student ID
    if (!formData.studentId.trim()) {
      toast.error("Please enter your student ID");
      return false;
    }

    // Validate password
    const { success: passwordValid } = UserZodSchema.shape.password.safeParse(formData.password);
    if (!passwordValid || !formData.password) {
      toast.error("Please enter a valid password (minimum 8 characters)");
      return false;
    }

    return true;
  };

  const validateAcademicInfo = () => {
    if (!formData.major) {
      toast.error("Please select your major");
      return false;
    }
    if (!formData.year) {
      toast.error("Please select your academic level");
      return false;
    }
    if (!formData.semester) {
      toast.error("Please select your current semester");
      return false;
    }
    return true;
  };

  const nextStep = async () => {
    if (step === 1) {
      const valid = await validateBasicInfo();
      if (valid) setStep(2);
    } else if (step === 2) {
      const valid = validateAcademicInfo();
      if (valid) setStep(3);
    } else if (step === 3) {
      await completeRegistration();
    }
  };

  const completeRegistration = async () => {
    if (selectedCourses.length === 0) {
      toast.error("Please select at least one course");
      return;
    }

    await safeProcessWithLoading(async () => {
      // Use our custom registration endpoint that handles academic fields and enrollments
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          selectedCourses,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      toast.success("Registration completed successfully!");
      router.push("/");
    }).unwrap();
  };

  return (
    <div className="animate-in fade-in duration-1000 w-full h-full flex flex-col p-4 md:p-8 justify-center relative">
      <div className="w-full flex justify-end absolute top-0 right-0">
        <Link href="/sign-in">
          <Button variant="ghost">Sign In</Button>
        </Link>
      </div>
      <Card className="w-full md:max-w-lg bg-background border-none mx-auto gap-0 shadow-none">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Join MIVA University
          </CardTitle>
          <CardDescription className="py-12">
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground text-right">
                Step {step} of {steps.length}
              </p>
              <div className="h-2 w-full relative bg-input">
                <div
                  style={{
                    width: `${(step / 3) * 100}%`,
                  }}
                  className="h-full bg-primary transition-all duration-300"
                ></div>
              </div>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {step === 1 && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    disabled={isLoading}
                    autoFocus
                    value={formData.name}
                    onChange={(e) => setFormData({ name: e.target.value })}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">MIVA University Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="student.name@miva.edu.ng"
                    disabled={isLoading}
                    value={formData.email}
                    onChange={(e) => setFormData({ email: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be your MIVA University email address
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="studentId">Student ID</Label>
                  <Input
                    id="studentId"
                    type="text"
                    placeholder="Enter your student ID"
                    disabled={isLoading}
                    value={formData.studentId}
                    onChange={(e) => setFormData({ studentId: e.target.value })}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter a secure password"
                    disabled={isLoading}
                    value={formData.password}
                    onChange={(e) => setFormData({ password: e.target.value })}
                    required
                    minLength={8}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="major">Major</Label>
                  <Select value={formData.major} onValueChange={(value) => setFormData({ major: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your major" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments?.map((dept: any) => (
                        <SelectItem key={dept.value} value={dept.value}>
                          {dept.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="year">Academic Level</Label>
                  <Select value={formData.year} onValueChange={(value) => setFormData({ year: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your academic level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">100 Level (Freshman)</SelectItem>
                      <SelectItem value="200">200 Level (Sophomore)</SelectItem>
                      <SelectItem value="300">300 Level (Junior)</SelectItem>
                      <SelectItem value="400">400 Level (Senior)</SelectItem>
                      <SelectItem value="graduate">Graduate Student</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="semester">Current Semester</Label>
                  <Select value={formData.semester} onValueChange={(value) => setFormData({ semester: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your current semester" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first">First Semester</SelectItem>
                      <SelectItem value="second">Second Semester</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Select Your Courses</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Choose the courses you&apos;re enrolling in for {coursesData?.semester || "this semester"}
                  </p>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {coursesData?.courses?.map((course: any) => (
                    <div key={course.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        id={course.id}
                        checked={selectedCourses.includes(course.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedCourses([...selectedCourses, course.id]);
                          } else {
                            setSelectedCourses(selectedCourses.filter(id => id !== course.id));
                          }
                        }}
                      />
                      <div className="flex-1">
                        <Label htmlFor={course.id} className="cursor-pointer">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">{course.code}</div>
                              <div className="text-sm text-muted-foreground">{course.title}</div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {course.credits} credits
                            </div>
                          </div>
                          {course.schedule && course.schedule.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {course.schedule.map((s: any, idx: number) => (
                                <span key={idx}>
                                  {s.day.charAt(0).toUpperCase() + s.day.slice(1)} {s.time}
                                  {idx < course.schedule.length - 1 && ", "}
                                </span>
                              ))}
                            </div>
                          )}
                        </Label>
                      </div>
                    </div>
                  ))}
                  {!coursesData?.courses && (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading available courses...
                    </div>
                  )}
                </div>
              </div>
            )}

            <p className="text-muted-foreground text-xs mb-6">
              {steps[step - 1]}
            </p>

            <div className="flex gap-2">
              <Button
                disabled={isLoading}
                className={cn(step === 1 && "opacity-0", "w-1/2")}
                variant="ghost"
                onClick={backStep}
              >
                <ChevronLeft className="size-4" />
                Back
              </Button>
              <Button
                disabled={isLoading}
                className="w-1/2"
                onClick={nextStep}
              >
                {step === 3 ? "Complete Registration" : "Next"}
                {isLoading && <Loader className="size-4 ml-2" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
