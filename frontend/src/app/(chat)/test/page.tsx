"use client";

import { PieChart } from "@/components/tool-invocation/pie-chart";
import { BarChart } from "@/components/tool-invocation/bar-chart";
import { LineChart } from "@/components/tool-invocation/line-chart";
import { InteractiveTable } from "@/components/tool-invocation/interactive-table";
import { Flashcards } from "@/components/tool-invocation/flashcards";
import { Quiz } from "@/components/tool-invocation/quiz";
import { Exam } from "@/components/tool-invocation/exam";
import { Assignment } from "@/components/tool-invocation/assignment";
import { CourseMaterial } from "@/components/tool-invocation/course-material";
import { Schedule } from "@/components/tool-invocation/schedule";
import { CourseList } from "@/components/tool-invocation/course-list";
import { AssignmentList } from "@/components/tool-invocation/assignment-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TestPage() {
  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Visualization Tools Test Page</h1>
      
      <Tabs defaultValue="flashcards" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
          <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
          <TabsTrigger value="quiz">Quiz</TabsTrigger>
          <TabsTrigger value="exam">Exam</TabsTrigger>
          <TabsTrigger value="assignment">Assignment</TabsTrigger>
          <TabsTrigger value="material">Material</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="pie">Pie</TabsTrigger>
          <TabsTrigger value="bar">Bar</TabsTrigger>
          <TabsTrigger value="line">Line</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
        </TabsList>

        <TabsContent value="flashcards" className="mt-6">
          <Flashcards
            topic="Binary Search Trees"
            course_name="Data Structures & Algorithms"
            course_code="CS201"
            total_cards={6}
            difficulty_level="intermediate"
            cards={[
              {
                front: "What is a Binary Search Tree (BST)?",
                back: "A binary tree where each node has at most two children, and for each node, all values in the left subtree are less than the node's value, and all values in the right subtree are greater.",
              },
              {
                front: "What is the time complexity of searching in a balanced BST?",
                back: "O(log n) - because we can eliminate half of the remaining nodes at each step.",
              },
              {
                front: "What is the worst-case time complexity of insertion in a BST?",
                back: "O(n) - when the tree becomes completely unbalanced, resembling a linked list.",
              },
              {
                front: "What is an in-order traversal of a BST?",
                back: "Visiting nodes in the order: left subtree, root, right subtree. This produces values in sorted order for a BST.",
              },
              {
                front: "What is the difference between a balanced and unbalanced BST?",
                back: "A balanced BST has roughly equal heights for left and right subtrees at every node, while an unbalanced BST has significant height differences, leading to worse performance.",
              },
              {
                front: "Name two self-balancing BST variants",
                back: "AVL trees and Red-Black trees. Both maintain balance through rotations during insertion/deletion.",
              },
            ]}
            sources_used={[
              "Lecture Notes - Week 6",
              "Introduction to Algorithms, 3rd Edition",
            ]}
          />
        </TabsContent>

        <TabsContent value="quiz" className="mt-6">
          <Quiz
            title="Introduction to React Hooks"
            course_name="Web Development"
            course_code="CS305"
            total_questions={5}
            total_points={50}
            estimated_time="15 minutes"
            instructions="Answer all questions to the best of your ability. You can navigate between questions using the Previous/Next buttons."
            questions={[
              {
                question: "What is the primary purpose of the useState hook?",
                question_type: "multiple_choice",
                options: [
                  "To manage side effects",
                  "To manage component state",
                  "To access the DOM",
                  "To optimize performance",
                ],
                points: 10,
                correct_answer: "To manage component state",
              },
              {
                question: "useEffect runs after every render by default.",
                question_type: "true_false",
                points: 10,
                correct_answer: "True",
              },
              {
                question: "Which hook would you use to access context values?",
                question_type: "short_answer",
                points: 10,
                correct_answer: "useContext",
              },
              {
                question: "What does the dependency array in useEffect control?",
                question_type: "multiple_choice",
                options: [
                  "When the component re-renders",
                  "When the effect runs",
                  "Which props are passed",
                  "The component's lifecycle",
                ],
                points: 10,
                correct_answer: "When the effect runs",
              },
              {
                question: "useMemo and useCallback are both optimization hooks.",
                question_type: "true_false",
                points: 10,
                correct_answer: "True",
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="exam" className="mt-6">
          <Exam
            course_code="MATH301"
            course_name="Calculus III"
            exam_type="midterm"
            time_limit_minutes={90}
            total_questions={8}
            total_points={100}
            instructions="You have 90 minutes to complete this exam. Answer all questions. Show your work for partial credit. The exam will auto-submit when time expires."
            questions={[
              {
                question: "Find the partial derivative ∂f/∂x of f(x,y) = x²y + 3xy²",
                question_type: "short_answer",
                points: 15,
                correct_answer: "2xy + 3y²",
              },
              {
                question: "The gradient of a scalar function points in the direction of maximum increase.",
                question_type: "true_false",
                points: 10,
                correct_answer: "True",
              },
              {
                question: "Which of the following is a valid parameterization of a circle?",
                question_type: "multiple_choice",
                options: [
                  "r(t) = (cos t, sin t)",
                  "r(t) = (t, t²)",
                  "r(t) = (e^t, e^-t)",
                  "r(t) = (t, 1/t)",
                ],
                points: 10,
                correct_answer: "r(t) = (cos t, sin t)",
              },
              {
                question: "Explain the difference between a local maximum and a global maximum for a multivariable function. Provide an example.",
                question_type: "essay",
                points: 20,
                correct_answer: "A local maximum is a point where the function value is greater than all nearby points, while a global maximum is the highest point across the entire domain. Example: f(x,y) = -(x²+y²) has a global maximum at (0,0), while f(x,y) = x⁴-x²+y² has local maxima at x=±1/√2.",
              },
              {
                question: "Calculate the divergence of F = (xy, yz, xz)",
                question_type: "short_answer",
                points: 15,
                correct_answer: "y + z + x",
              },
              {
                question: "Green's Theorem relates a line integral around a closed curve to a double integral over the region it encloses.",
                question_type: "true_false",
                points: 10,
                correct_answer: "True",
              },
              {
                question: "What is the value of ∫∫R xy dA over the rectangle R = [0,2] × [0,3]?",
                question_type: "multiple_choice",
                options: [
                  "6",
                  "9",
                  "12",
                  "18",
                ],
                points: 10,
                correct_answer: "9",
              },
              {
                question: "What does it mean for a vector field to be conservative? How can you test if a vector field is conservative?",
                question_type: "essay",
                points: 10,
                correct_answer: "A vector field is conservative if it is the gradient of some scalar potential function, meaning the line integral is path-independent. Test: Check if curl F = 0, or verify that the mixed partial derivatives are equal (∂P/∂y = ∂Q/∂x in 2D).",
              },
            ]}
            grading_rubric="Partial credit will be awarded based on correct methodology and work shown. Essay questions will be graded on completeness, accuracy, and clarity of explanation."
          />
        </TabsContent>

        <TabsContent value="assignment" className="mt-6">
          <Assignment
            course_code="CS401"
            course_name="Software Engineering"
            title="Implement User Authentication System"
            description="Build a complete user authentication system with registration, login, password reset, and session management. The system should follow security best practices and include comprehensive testing."
            due_date="November 15, 2024"
            total_points={100}
            submission_type="multiple"
            status="in_progress"
            instructions={`Complete the following tasks:

1. Design and implement a user registration system
   - Email validation
   - Password strength requirements
   - Email verification flow

2. Implement secure login functionality
   - Bcrypt password hashing
   - JWT-based session management
   - Rate limiting for login attempts

3. Add password reset feature
   - Email-based reset tokens
   - Token expiration (1 hour)
   - Secure password update flow

4. Write comprehensive tests
   - Unit tests for all authentication functions
   - Integration tests for the full flow
   - Minimum 80% code coverage

5. Documentation
   - API documentation
   - Setup instructions
   - Security considerations document`}
            rubric={[
              {
                criteria: "User Registration",
                points: 20,
                description: "Complete registration system with validation and email verification",
              },
              {
                criteria: "Secure Login",
                points: 20,
                description: "Proper password hashing, JWT implementation, and rate limiting",
              },
              {
                criteria: "Password Reset",
                points: 15,
                description: "Secure token-based password reset with proper expiration",
              },
              {
                criteria: "Testing",
                points: 25,
                description: "Comprehensive test suite with 80%+ coverage",
              },
              {
                criteria: "Code Quality",
                points: 10,
                description: "Clean, maintainable code following best practices",
              },
              {
                criteria: "Documentation",
                points: 10,
                description: "Clear API docs, setup guide, and security documentation",
              },
            ]}
            resources={[
              {
                type: "PDF",
                title: "Authentication Best Practices Guide",
                url: "https://example.com/auth-guide.pdf",
              },
              {
                type: "Video",
                title: "JWT Authentication Tutorial",
                url: "https://example.com/jwt-tutorial",
              },
              {
                type: "Documentation",
                title: "Bcrypt Library Documentation",
                url: "https://www.npmjs.com/package/bcrypt",
              },
              {
                type: "Article",
                title: "OWASP Authentication Cheat Sheet",
                url: "https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html",
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="material" className="mt-6">
          <CourseMaterial
            title="Introduction to Data Structures"
            file_url="https://example.com/sample.pdf"
            course_code="CS201"
            course_name="Data Structures & Algorithms"
            week_number={3}
            material_type="lecture"
            ai_summary="This lecture introduces fundamental data structures including arrays, linked lists, stacks, and queues. Key topics covered include memory allocation, time complexity analysis, and when to use each data structure. The lecture emphasizes practical applications and includes code examples in Python."
            key_concepts={[
              "Arrays",
              "Linked Lists",
              "Stacks",
              "Queues",
              "Time Complexity",
              "Memory Management",
              "Python Implementation"
            ]}
          />
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <Schedule
            semester="Fall 2024"
            week_number={5}
            days={[
              {
                day: "Monday",
                classes: [
                  {
                    time: "9:00 AM - 10:30 AM",
                    course_code: "CS201",
                    course_name: "Data Structures",
                    location: "Room 301",
                    instructor: "Dr. Smith",
                    class_type: "Lecture",
                  },
                  {
                    time: "2:00 PM - 3:30 PM",
                    course_code: "MATH301",
                    course_name: "Calculus III",
                    location: "Room 205",
                    instructor: "Dr. Johnson",
                    class_type: "Lecture",
                  },
                ],
              },
              {
                day: "Tuesday",
                classes: [
                  {
                    time: "10:00 AM - 11:30 AM",
                    course_code: "CS305",
                    course_name: "Web Development",
                    location: "Lab 101",
                    instructor: "Prof. Davis",
                    class_type: "Lab",
                  },
                ],
              },
              {
                day: "Wednesday",
                classes: [
                  {
                    time: "9:00 AM - 10:30 AM",
                    course_code: "CS201",
                    course_name: "Data Structures",
                    location: "Room 301",
                    instructor: "Dr. Smith",
                    class_type: "Lecture",
                  },
                  {
                    time: "1:00 PM - 2:30 PM",
                    course_code: "CS401",
                    course_name: "Software Engineering",
                    location: "Room 402",
                    instructor: "Prof. Williams",
                    class_type: "Lecture",
                  },
                ],
              },
              {
                day: "Thursday",
                classes: [
                  {
                    time: "2:00 PM - 3:30 PM",
                    course_code: "MATH301",
                    course_name: "Calculus III",
                    location: "Room 205",
                    instructor: "Dr. Johnson",
                    class_type: "Tutorial",
                  },
                ],
              },
              {
                day: "Friday",
                classes: [
                  {
                    time: "11:00 AM - 12:30 PM",
                    course_code: "CS401",
                    course_name: "Software Engineering",
                    location: "Lab 203",
                    instructor: "Prof. Williams",
                    class_type: "Lab",
                  },
                ],
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="courses" className="mt-6">
          <CourseList
            semester="Fall 2024"
            total_courses={4}
            total_credits={12}
            courses={[
              {
                course_code: "CS201",
                course_name: "Data Structures & Algorithms",
                credits: 3,
                instructor: "Dr. Smith",
                status: "enrolled",
                enrollment_date: "2024-08-20",
                schedule: "Mon/Wed 9:00 AM - 10:30 AM",
                location: "Room 301",
              },
              {
                course_code: "CS305",
                course_name: "Web Development",
                credits: 3,
                instructor: "Prof. Davis",
                status: "enrolled",
                enrollment_date: "2024-08-20",
                schedule: "Tue 10:00 AM - 11:30 AM",
                location: "Lab 101",
              },
              {
                course_code: "MATH301",
                course_name: "Calculus III",
                credits: 3,
                instructor: "Dr. Johnson",
                status: "enrolled",
                enrollment_date: "2024-08-20",
                schedule: "Mon/Thu 2:00 PM - 3:30 PM",
                location: "Room 205",
              },
              {
                course_code: "CS401",
                course_name: "Software Engineering",
                credits: 3,
                instructor: "Prof. Williams",
                status: "enrolled",
                enrollment_date: "2024-08-20",
                schedule: "Wed 1:00 PM - 2:30 PM, Fri 11:00 AM - 12:30 PM",
                location: "Room 402",
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="assignments" className="mt-6">
          <AssignmentList
            total_count={3}
            assignments={[
              {
                title: "Binary Search Tree Implementation",
                course_code: "CS201",
                course_name: "Data Structures & Algorithms",
                due_date: "November 15, 2024",
                due_time: "11:59 PM",
                points_possible: 100,
                assignment_type: "project",
                urgency: "urgent",
                days_until_due: 2,
                description: "Implement a self-balancing BST with insert, delete, and search operations. Include comprehensive unit tests.",
                status: "in_progress",
              },
              {
                title: "React Hooks Quiz",
                course_code: "CS305",
                course_name: "Web Development",
                due_date: "November 18, 2024",
                due_time: "11:59 PM",
                points_possible: 50,
                assignment_type: "quiz",
                urgency: "soon",
                days_until_due: 5,
                description: "Complete the online quiz covering useState, useEffect, useContext, and custom hooks.",
              },
              {
                title: "Calculus Problem Set 7",
                course_code: "MATH301",
                course_name: "Calculus III",
                due_date: "November 22, 2024",
                due_time: "11:59 PM",
                points_possible: 75,
                assignment_type: "homework",
                urgency: "later",
                days_until_due: 9,
                description: "Problems on partial derivatives, gradients, and optimization of multivariable functions.",
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="pie" className="mt-6">
          <PieChart
            title="Student Grade Distribution"
            data={[
              { name: "A", value: 25 },
              { name: "B", value: 35 },
              { name: "C", value: 20 },
              { name: "D", value: 15 },
              { name: "F", value: 5 },
            ]}
          />
        </TabsContent>

        <TabsContent value="bar" className="mt-6">
          <BarChart
            title="Monthly Sales Performance"
            data={[
              { name: "Jan", value: 4000 },
              { name: "Feb", value: 3000 },
              { name: "Mar", value: 5000 },
              { name: "Apr", value: 4500 },
              { name: "May", value: 6000 },
              { name: "Jun", value: 5500 },
            ]}
          />
        </TabsContent>

        <TabsContent value="line" className="mt-6">
          <LineChart
            title="Website Traffic Trend"
            data={[
              { name: "Week 1", value: 1200 },
              { name: "Week 2", value: 1900 },
              { name: "Week 3", value: 1500 },
              { name: "Week 4", value: 2200 },
              { name: "Week 5", value: 2800 },
              { name: "Week 6", value: 3200 },
            ]}
          />
        </TabsContent>

        <TabsContent value="table" className="mt-6">
          <InteractiveTable
            title="Course Enrollment Data"
            headers={["Course Code", "Course Name", "Enrolled", "Capacity", "Status"]}
            rows={[
              ["CS101", "Intro to Programming", "45", "50", "Open"],
              ["CS201", "Data Structures", "50", "50", "Full"],
              ["CS301", "Algorithms", "38", "45", "Open"],
              ["MATH301", "Calculus III", "42", "50", "Open"],
              ["CS401", "Software Engineering", "35", "40", "Open"],
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
