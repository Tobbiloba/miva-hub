# School AI Assistant MVP - Complete Development Plan

## 📋 Project Overview

### Vision
Transform the existing Better Chatbot into a **school-specific AI assistant** where students can naturally interact with academic information through chat. Students ask questions like "Get me week 4 materials for CS101" and the AI intelligently fetches data from the school's academic database using MCP tools.

### Key Goals
- **Natural Academic Queries**: Students ask in plain English about courses, assignments, schedules
- **Intelligent Tool Usage**: AI decides when to use academic database tools vs. direct responses  
- **School-Only Access**: Students register with school email (@yourschool.edu) for secure access
- **Personal Productivity**: Students can add their own MCP tools (Google Calendar, Gmail, GitHub)
- **Admin Content Management**: Faculty can easily manage course materials and announcements

---

## 🗂️ Feature Classification & Codebase Analysis

### 🟢 **KEEP & REUSE (Existing Foundation - 80% of MVP)**

#### Core Infrastructure ✅
```
✅ Next.js 15 App Router - Perfect foundation
✅ TypeScript - Type safety for academic data  
✅ PostgreSQL + Drizzle ORM - Database for students, courses, materials
✅ Better Auth - Authentication system (adapt for school emails)
✅ Tailwind + Radix UI - Modern UI components
✅ Real-time chat streaming - Core chat functionality
```

#### Authentication System ✅
```
✅ User registration/login (src/lib/auth/auth.ts)
✅ Email verification - Already supports email verification
✅ Session management - Secure sessions with cookies
✅ User profiles - User table with preferences
✅ Password reset - Built-in forgot password flow
```

#### Chat System ✅
```
✅ Multi-LLM integration - OpenAI, Anthropic, Google, etc. (src/lib/ai/providers/)
✅ Streaming responses - Real-time AI responses (src/app/api/chat/route.ts)
✅ Chat threads - Conversation history (chat_thread, chat_message tables)
✅ Message storage - Persistent chat history
✅ Tool decision engine - AI decides when to use tools vs direct response
```

#### MCP Integration ✅ (PERFECT FOR STUDENTS!)
```
✅ MCP Server Management UI (/mcp pages) - Students can add personal tools!
✅ MCP Client system (src/lib/ai/mcp/client.ts) 
✅ Tool registration - Dynamic tool loading
✅ MCP server management - Add/configure custom tools
✅ Tool calling - AI can invoke tools automatically
✅ MCP database tables - Server configurations stored
✅ OAuth flow - For Google Calendar, Gmail, GitHub integration
```

#### UI Components ✅
```
✅ Chat interface - Message bubbles, input area (src/components/chat/)
✅ Sidebar navigation - Course list navigation
✅ Tool result display - Show tool outputs (src/components/tool-invocation/)
✅ Data tables - Display course materials, assignments
✅ Forms & inputs - User registration, preferences  
✅ Responsive design - Mobile-friendly interface
```

### 🟡 **MODIFY FOR SCHOOL USE**

#### Authentication (Minor Changes)
```
🔄 Add school email validation (@yourschool.edu)
🔄 Add course enrollment during signup
🔄 Add student ID field
🔄 Add admin role detection
```

#### User Dashboard (Adapt for Students)
```
🔄 Replace generic dashboard with student-focused one
🔄 Show enrolled courses instead of agents
🔄 Display academic deadlines instead of workflows
```

### 🔵 **KEEP AS-IS (Available But Not MVP-Critical)**

#### Advanced Features (Available for Power Users)
```
✅ Visual Workflow System (src/components/workflow/, workflow tables)
   - Students could create study workflows later
   - Professors could build course automation
✅ Agent Marketplace (/agents pages, agent sharing)  
   - Study group agents, course-specific assistants
   - Academic tutoring agents
✅ Voice Chat (OpenAI Realtime API)
   - Voice queries: "What's my schedule today?"
   - Hands-free academic assistance
✅ Archive System (archive table, /archive pages)
   - Archive important academic conversations
   - Save end-of-semester discussions
✅ Bookmark System (bookmark table)
   - Bookmark important courses, professors, deadlines
   - Quick access to frequently used academic resources
```

#### Existing Tools (Available for Academic Use)
```
✅ Code Execution (src/lib/ai/tools/code-executor.ts)
   - Perfect for CS courses, programming assignments
   - Students can test code snippets
✅ Browser Automation (Playwright integration)
   - Automate academic portal interactions
   - Research and data gathering
✅ Web Search (Great for research)
   - Academic research, paper finding
   - Course-related information gathering
✅ HTTP Client (Advanced users)
   - API integration for CS courses
   - Research data collection
```

#### Team Features (Useful for Group Work)
```
✅ Agent Sharing - Study groups can share academic assistants
✅ Workflow Collaboration - Group projects and assignments
✅ Team Management - Study groups, class collaboration
```

---

## 💡 **Why Keep Everything? The "Additive" Strategy**

### **Smart Benefits of Not Deleting:**
- **Zero Deletion Work**: No time wasted removing working features
- **Future Flexibility**: Students might discover and love existing features
- **Academic Use Cases**: 
  - **Voice Chat**: Perfect for accessibility and hands-free studying
  - **Code Execution**: Essential for CS courses and programming assignments  
  - **Workflows**: Professors could automate grading, students could create study processes
  - **Agent Sharing**: Study groups sharing custom tutoring assistants
  - **Bookmarks**: Quick access to important professors, courses, deadlines
- **Natural Evolution**: Features students don't need will simply go unused
- **Power Users**: Advanced students can leverage full platform capabilities

### **MVP Focus**: 
Build academic features first, let students naturally discover existing capabilities!

---

## 🏗️ **MVP Development Plan - 5 Phases (5 Weeks)**

## **Phase 1: Foundation & Authentication (Week 1)**

### **Days 1-2: School-Specific Authentication**

#### Modify Existing Auth System
```typescript
// MODIFY: src/lib/auth/auth.ts
export const auth = betterAuth({
  // ... existing config
  emailAndPassword: {
    enabled: true,
    emailVerification: {
      required: true,
      // Add custom validation for school domain
      validateEmail: (email: string) => {
        if (!email.endsWith('@yourschool.edu')) {
          throw new Error('Please use your school email address (@yourschool.edu)');
        }
        return true;
      }
    }
  },
  // ... rest of config
});
```

#### Add Student Fields to User Schema
```typescript
// MODIFY: src/lib/db/pg/schema.pg.ts
export const UserSchema = pgTable("user", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name"),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("emailVerified"),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  preferences: json("preferences").$type<UserPreferences>(),
  
  // NEW FIELDS FOR STUDENTS
  studentId: text("student_id").unique(), // University student ID
  major: text("major"), // Computer Science, Mathematics, etc.
  year: text("year"), // Freshman, Sophomore, Junior, Senior, Graduate
  role: text("role").default("student"), // student, admin, faculty
});
```

### **Days 3-4: Academic Database Schema**

#### Create Academic Tables
```sql
-- NEW MIGRATION: src/lib/db/migrations/pg/xxxx_academic_schema.sql

-- Courses table
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE,           -- CS101, MATH201, ENG105
  name TEXT NOT NULL,                         -- "Computer Science Fundamentals"
  description TEXT,
  credits INTEGER DEFAULT 3,
  department VARCHAR(100),                    -- "Computer Science", "Mathematics"
  semester VARCHAR(20),                       -- "Fall", "Spring", "Summer"  
  year INTEGER,                              -- 2024, 2025
  instructor_name TEXT,
  instructor_email TEXT,
  class_schedule JSON,                        -- {"days": ["Mon", "Wed"], "time": "10:00-11:30", "location": "Room 201"}
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Course materials (lectures, assignments, readings)
CREATE TABLE course_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  title TEXT NOT NULL,                        -- "Week 4: Data Structures and Algorithms"
  content TEXT,                              -- Main content/description
  material_type VARCHAR(50) NOT NULL,        -- "lecture", "reading", "assignment", "lab", "exam"
  file_urls TEXT[],                          -- Array of file URLs ["https://...", "https://..."]
  external_links TEXT[],                     -- Array of external links
  due_date TIMESTAMP,                        -- For assignments
  points_possible INTEGER,                   -- For graded items
  instructions TEXT,                         -- Specific instructions
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  INDEX idx_course_materials_course_week (course_id, week_number),
  INDEX idx_course_materials_due_date (due_date)
);

-- Student course enrollments
CREATE TABLE student_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES "user"(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active',       -- 'active', 'dropped', 'completed', 'audit'
  grade VARCHAR(5),                          -- 'A', 'B+', 'C', etc. (filled at end of semester)
  
  UNIQUE(user_id, course_id),
  INDEX idx_enrollments_user (user_id),
  INDEX idx_enrollments_course (course_id)
);

-- Faculty directory
CREATE TABLE faculty (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  department TEXT,
  title TEXT,                                -- "Professor", "Associate Professor", "Assistant Professor"
  office_location TEXT,                      -- "Science Building Room 301"
  office_hours JSON,                         -- {"Monday": "2:00-4:00 PM", "Wednesday": "10:00-12:00 PM"}
  phone TEXT,
  bio TEXT,
  website_url TEXT,
  research_interests TEXT[],                 -- Array of research topics
  courses_taught UUID[],                     -- Array of course IDs
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Announcements system
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES "user"(id),
  course_id UUID REFERENCES courses(id),     -- NULL for school-wide announcements
  priority VARCHAR(20) DEFAULT 'normal',     -- 'low', 'normal', 'high', 'urgent'
  is_pinned BOOLEAN DEFAULT false,           -- Pin important announcements
  expires_at TIMESTAMP,                      -- Auto-hide after this date
  target_audience VARCHAR(50) DEFAULT 'students', -- 'students', 'faculty', 'all'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_announcements_course (course_id),
  INDEX idx_announcements_created_at (created_at DESC)
);

-- Academic calendar events
CREATE TABLE academic_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,                       -- "Final Exams Period", "Spring Break"
  description TEXT,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,                        -- NULL for single-day events
  event_type VARCHAR(50),                    -- "exam", "holiday", "registration", "break", "deadline"
  course_id UUID REFERENCES courses(id),     -- NULL for school-wide events
  is_recurring BOOLEAN DEFAULT false,        -- For events that repeat
  recurrence_pattern JSON,                   -- {"type": "weekly", "days": ["Mon", "Wed"]}
  location TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_calendar_date_range (start_date, end_date),
  INDEX idx_calendar_course (course_id)
);
```

### **Days 5-7: Registration Flow Modification**

#### Multi-Step Student Registration
```typescript
// NEW: src/app/(auth)/sign-up/page.tsx
export default function SignUpPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<StudentRegistrationData>({});

  return (
    <div className="max-w-md mx-auto">
      <ProgressIndicator currentStep={step} totalSteps={3} />
      
      {step === 1 && (
        <BasicInfoStep 
          data={formData}
          onNext={(data) => {
            setFormData({...formData, ...data});
            setStep(2);
          }}
        />
      )}
      
      {step === 2 && (
        <AcademicInfoStep 
          data={formData}
          onNext={(data) => {
            setFormData({...formData, ...data});
            setStep(3);
          }}
          onBack={() => setStep(1)}
        />
      )}
      
      {step === 3 && (
        <CourseSelectionStep 
          data={formData}
          onComplete={handleRegistration}
          onBack={() => setStep(2)}
        />
      )}
    </div>
  );
}

// Step 1: Basic Information
const BasicInfoStep = ({ data, onNext }: StepProps) => {
  const [form, setForm] = useState({
    name: data.name || '',
    email: data.email || '',
    studentId: data.studentId || '',
    password: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate school email
    if (!form.email.endsWith('@yourschool.edu')) {
      toast.error('Please use your school email address');
      return;
    }
    
    onNext(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => setForm({...form, name: e.target.value})}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="email">School Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="john.doe@yourschool.edu"
          value={form.email}
          onChange={(e) => setForm({...form, email: e.target.value})}
          required
        />
        <p className="text-sm text-gray-600 mt-1">Must be your school email address</p>
      </div>
      
      <div>
        <Label htmlFor="studentId">Student ID</Label>
        <Input
          id="studentId"
          placeholder="123456789"
          value={form.studentId}
          onChange={(e) => setForm({...form, studentId: e.target.value})}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({...form, password: e.target.value})}
          required
          minLength={8}
        />
      </div>
      
      <Button type="submit" className="w-full">
        Next: Academic Information
      </Button>
    </form>
  );
};

// Step 2: Academic Information
const AcademicInfoStep = ({ data, onNext, onBack }: StepProps) => {
  const [form, setForm] = useState({
    major: data.major || '',
    year: data.year || '',
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onNext(form); }} className="space-y-4">
      <div>
        <Label htmlFor="major">Major</Label>
        <Select value={form.major} onValueChange={(value) => setForm({...form, major: value})}>
          <SelectTrigger>
            <SelectValue placeholder="Select your major" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="computer-science">Computer Science</SelectItem>
            <SelectItem value="mathematics">Mathematics</SelectItem>
            <SelectItem value="engineering">Engineering</SelectItem>
            <SelectItem value="business">Business</SelectItem>
            <SelectItem value="psychology">Psychology</SelectItem>
            <SelectItem value="biology">Biology</SelectItem>
            <SelectItem value="chemistry">Chemistry</SelectItem>
            <SelectItem value="physics">Physics</SelectItem>
            <SelectItem value="english">English</SelectItem>
            <SelectItem value="history">History</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="year">Academic Year</Label>
        <Select value={form.year} onValueChange={(value) => setForm({...form, year: value})}>
          <SelectTrigger>
            <SelectValue placeholder="Select your year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="freshman">Freshman</SelectItem>
            <SelectItem value="sophomore">Sophomore</SelectItem>
            <SelectItem value="junior">Junior</SelectItem>
            <SelectItem value="senior">Senior</SelectItem>
            <SelectItem value="graduate">Graduate Student</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex space-x-4">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button type="submit" className="flex-1">
          Next: Course Selection
        </Button>
      </div>
    </form>
  );
};

// Step 3: Course Selection
const CourseSelectionStep = ({ data, onComplete, onBack }: StepProps) => {
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const { data: availableCourses, isLoading } = useSWR('/api/courses/available', fetcher);

  const handleComplete = async () => {
    const registrationData = {
      ...data,
      selectedCourses
    };
    
    await onComplete(registrationData);
  };

  if (isLoading) return <div>Loading courses...</div>;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Select Your Courses</h3>
        <p className="text-sm text-gray-600">Choose the courses you're currently enrolled in</p>
      </div>
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {availableCourses?.map((course: Course) => (
          <div key={course.id} className="flex items-center space-x-2">
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
            <Label htmlFor={course.id} className="flex-1">
              <div className="flex justify-between">
                <span className="font-medium">{course.code}</span>
                <span className="text-sm text-gray-600">{course.credits} credits</span>
              </div>
              <div className="text-sm text-gray-600">{course.name}</div>
            </Label>
          </div>
        ))}
      </div>
      
      <div className="flex space-x-4">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button 
          onClick={handleComplete} 
          className="flex-1"
          disabled={selectedCourses.length === 0}
        >
          Complete Registration
        </Button>
      </div>
    </div>
  );
};
```

---

## **Phase 2: Academic MCP Tools (Week 2)**

### **Days 8-10: Core Academic MCP Tools**

#### Tool 1: Course Content Tool
```typescript
// NEW: src/lib/ai/mcp/tools/academic/course-content.tool.ts
import { z } from "zod";
import { db } from "lib/db/pg/db.pg";
import { coursesSchema, courseMaterialsSchema, studentEnrollmentsSchema } from "lib/db/pg/schema.pg";
import { eq, and } from "drizzle-orm";

export const courseContentTool = {
  name: "get-course-materials",
  description: "Fetch course materials for specific week, topic, or material type",
  parameters: z.object({
    courseCode: z.string().describe("Course code like CS101, MATH201"),
    weekNumber: z.number().optional().describe("Specific week number (1-16)"),
    materialType: z.enum(["all", "lecture", "reading", "assignment", "lab", "exam"]).optional().default("all"),
    userId: z.string().describe("Student user ID to verify enrollment")
  }),
  
  execute: async ({ courseCode, weekNumber, materialType, userId }) => {
    try {
      // First, verify the course exists and user is enrolled
      const courseQuery = db
        .select({
          course: coursesSchema,
          enrollment: studentEnrollmentsSchema
        })
        .from(coursesSchema)
        .leftJoin(
          studentEnrollmentsSchema, 
          and(
            eq(studentEnrollmentsSchema.courseId, coursesSchema.id),
            eq(studentEnrollmentsSchema.userId, userId)
          )
        )
        .where(eq(coursesSchema.code, courseCode.toUpperCase()));
        
      const courseResult = await courseQuery;
      
      if (courseResult.length === 0) {
        return {
          error: `Course ${courseCode} not found`,
          suggestions: ["Check the course code spelling", "Make sure the course exists this semester"]
        };
      }
      
      const course = courseResult[0].course;
      const enrollment = courseResult[0].enrollment;
      
      if (!enrollment) {
        return {
          error: `You are not enrolled in ${courseCode}`,
          message: "You can only access materials for courses you're enrolled in",
          courseInfo: {
            code: course.code,
            name: course.name,
            instructor: course.instructor_name
          }
        };
      }

      // Build materials query
      let materialsQuery = db
        .select()
        .from(courseMaterialsSchema)
        .where(eq(courseMaterialsSchema.courseId, course.id));

      // Add week filter if specified
      if (weekNumber) {
        materialsQuery = materialsQuery.where(eq(courseMaterialsSchema.weekNumber, weekNumber));
      }

      // Add material type filter if not "all"
      if (materialType !== "all") {
        materialsQuery = materialsQuery.where(eq(courseMaterialsSchema.materialType, materialType));
      }

      // Order by week and creation date
      materialsQuery = materialsQuery.orderBy(
        courseMaterialsSchema.weekNumber,
        courseMaterialsSchema.createdAt
      );

      const materials = await materialsQuery;

      // Format the response
      const response = {
        course: {
          code: course.code,
          name: course.name,
          instructor: course.instructor_name,
          semester: course.semester,
          year: course.year
        },
        filters: {
          week: weekNumber || "all",
          materialType,
          totalMaterials: materials.length
        },
        materials: materials.map(material => ({
          id: material.id,
          week: material.weekNumber,
          title: material.title,
          type: material.materialType,
          content: material.content,
          fileUrls: material.fileUrls || [],
          externalLinks: material.externalLinks || [],
          dueDate: material.dueDate,
          pointsPossible: material.pointsPossible,
          instructions: material.instructions,
          createdAt: material.createdAt
        })),
        summary: generateMaterialsSummary(materials, courseCode, weekNumber)
      };

      return response;
      
    } catch (error) {
      console.error("Course content tool error:", error);
      return {
        error: "Failed to fetch course materials",
        message: "There was a problem accessing the course database. Please try again."
      };
    }
  }
};

// Helper function to generate summary
function generateMaterialsSummary(materials: any[], courseCode: string, weekNumber?: number) {
  const byType = materials.reduce((acc, material) => {
    acc[material.materialType] = (acc[material.materialType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const weekText = weekNumber ? `week ${weekNumber} of` : '';
  const typesSummary = Object.entries(byType)
    .map(([type, count]) => `${count} ${type}${count !== 1 ? 's' : ''}`)
    .join(', ');

  return `Found ${materials.length} materials for ${weekText} ${courseCode}: ${typesSummary}`;
}
```

#### Tool 2: Assignment Tracker Tool
```typescript
// NEW: src/lib/ai/mcp/tools/academic/assignments.tool.ts
export const assignmentTrackerTool = {
  name: "get-upcoming-assignments",
  description: "Get upcoming assignments and deadlines across enrolled courses",
  parameters: z.object({
    userId: z.string().describe("Student user ID"),
    daysAhead: z.number().optional().default(30).describe("Number of days to look ahead"),
    courseCode: z.string().optional().describe("Filter by specific course code"),
    includeCompleted: z.boolean().optional().default(false).describe("Include completed assignments")
  }),
  
  execute: async ({ userId, daysAhead, courseCode, includeCompleted }) => {
    try {
      // Get user's enrolled courses
      const enrollmentsQuery = db
        .select({
          course: coursesSchema,
          enrollment: studentEnrollmentsSchema
        })
        .from(studentEnrollmentsSchema)
        .innerJoin(coursesSchema, eq(coursesSchema.id, studentEnrollmentsSchema.courseId))
        .where(
          and(
            eq(studentEnrollmentsSchema.userId, userId),
            eq(studentEnrollmentsSchema.status, 'active')
          )
        );

      if (courseCode) {
        enrollmentsQuery.where(eq(coursesSchema.code, courseCode.toUpperCase()));
      }

      const enrollments = await enrollmentsQuery;
      
      if (enrollments.length === 0) {
        return {
          message: courseCode 
            ? `You are not enrolled in ${courseCode}` 
            : "You are not enrolled in any courses",
          assignments: [],
          summary: "No assignments found"
        };
      }

      // Get assignments from enrolled courses
      const courseIds = enrollments.map(e => e.course.id);
      const cutoffDate = new Date(Date.now() + (daysAhead * 24 * 60 * 60 * 1000));
      
      const assignmentsQuery = db
        .select({
          assignment: courseMaterialsSchema,
          course: coursesSchema
        })
        .from(courseMaterialsSchema)
        .innerJoin(coursesSchema, eq(coursesSchema.id, courseMaterialsSchema.courseId))
        .where(
          and(
            inArray(courseMaterialsSchema.courseId, courseIds),
            eq(courseMaterialsSchema.materialType, 'assignment'),
            isNotNull(courseMaterialsSchema.dueDate),
            gte(courseMaterialsSchema.dueDate, new Date()), // Future assignments only
            lte(courseMaterialsSchema.dueDate, cutoffDate)
          )
        )
        .orderBy(courseMaterialsSchema.dueDate);

      const assignments = await assignmentsQuery;

      // Format assignments with urgency
      const formattedAssignments = assignments.map(item => {
        const assignment = item.assignment;
        const course = item.course;
        const dueDate = new Date(assignment.dueDate!);
        const now = new Date();
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        let urgency: 'overdue' | 'urgent' | 'soon' | 'later' = 'later';
        if (daysUntilDue < 0) urgency = 'overdue';
        else if (daysUntilDue <= 1) urgency = 'urgent';
        else if (daysUntilDue <= 3) urgency = 'soon';

        return {
          id: assignment.id,
          course: {
            code: course.code,
            name: course.name
          },
          title: assignment.title,
          description: assignment.content,
          instructions: assignment.instructions,
          dueDate: assignment.dueDate,
          daysUntilDue,
          urgency,
          pointsPossible: assignment.pointsPossible,
          fileUrls: assignment.fileUrls || [],
          externalLinks: assignment.externalLinks || [],
          week: assignment.weekNumber
        };
      });

      // Group by urgency for better presentation
      const groupedByUrgency = formattedAssignments.reduce((acc, assignment) => {
        acc[assignment.urgency] = acc[assignment.urgency] || [];
        acc[assignment.urgency].push(assignment);
        return acc;
      }, {} as Record<string, typeof formattedAssignments>);

      const summary = generateAssignmentsSummary(formattedAssignments, daysAhead, courseCode);

      return {
        totalAssignments: formattedAssignments.length,
        timeRange: `Next ${daysAhead} days`,
        courseFilter: courseCode || "All enrolled courses",
        assignments: formattedAssignments,
        groupedByUrgency,
        summary,
        courses: enrollments.map(e => ({
          code: e.course.code,
          name: e.course.name
        }))
      };
      
    } catch (error) {
      console.error("Assignment tracker tool error:", error);
      return {
        error: "Failed to fetch assignments",
        message: "There was a problem accessing assignment data. Please try again."
      };
    }
  }
};

function generateAssignmentsSummary(assignments: any[], daysAhead: number, courseCode?: string) {
  if (assignments.length === 0) {
    return `No assignments due in the next ${daysAhead} days${courseCode ? ` for ${courseCode}` : ''}`;
  }

  const urgentCount = assignments.filter(a => a.urgency === 'urgent').length;
  const soonCount = assignments.filter(a => a.urgency === 'soon').length;
  
  let summary = `You have ${assignments.length} assignment${assignments.length !== 1 ? 's' : ''} due in the next ${daysAhead} days`;
  
  if (courseCode) summary += ` for ${courseCode}`;
  
  if (urgentCount > 0) {
    summary += `. ${urgentCount} due ${urgentCount === 1 ? 'is' : 'are'} urgent (due within 1 day)`;
  }
  
  if (soonCount > 0) {
    summary += `. ${soonCount} ${soonCount === 1 ? 'is' : 'are'} due soon (within 3 days)`;
  }
  
  return summary;
}
```

#### Tool 3: Faculty Directory Tool
```typescript
// NEW: src/lib/ai/mcp/tools/academic/faculty.tool.ts
export const facultyDirectoryTool = {
  name: "find-faculty",
  description: "Find faculty member contact information, office hours, and course information",
  parameters: z.object({
    name: z.string().optional().describe("Faculty name to search (partial names work)"),
    department: z.string().optional().describe("Department to filter by"),
    courseCode: z.string().optional().describe("Find instructor for specific course"),
    email: z.string().optional().describe("Search by email address")
  }),
  
  execute: async ({ name, department, courseCode, email }) => {
    try {
      let facultyQuery = db.select().from(facultySchema);
      let conditions: any[] = [];

      // Build search conditions
      if (name) {
        conditions.push(ilike(facultySchema.name, `%${name}%`));
      }
      
      if (department) {
        conditions.push(ilike(facultySchema.department, `%${department}%`));
      }
      
      if (email) {
        conditions.push(eq(facultySchema.email, email.toLowerCase()));
      }

      // If searching by course, find the instructor
      if (courseCode) {
        const courseQuery = db
          .select({
            faculty: facultySchema,
            course: coursesSchema
          })
          .from(coursesSchema)
          .leftJoin(facultySchema, eq(facultySchema.email, coursesSchema.instructor_email))
          .where(eq(coursesSchema.code, courseCode.toUpperCase()));
          
        const courseResult = await courseQuery;
        
        if (courseResult.length === 0) {
          return {
            error: `Course ${courseCode} not found`,
            suggestions: ["Check the course code spelling", "Make sure the course exists this semester"]
          };
        }
        
        const course = courseResult[0].course;
        const faculty = courseResult[0].faculty;
        
        if (!faculty) {
          return {
            message: `Instructor information not available for ${courseCode}`,
            courseInfo: {
              code: course.code,
              name: course.name,
              instructorName: course.instructor_name,
              instructorEmail: course.instructor_email
            },
            suggestions: [
              "Contact the instructor directly via email",
              "Check the course syllabus for office hours",
              "Visit the department office for more information"
            ]
          };
        }
        
        // Return the specific course instructor
        return {
          searchType: "course_instructor",
          course: {
            code: course.code,
            name: course.name
          },
          faculty: [formatFacultyInfo(faculty, course)]
        };
      }

      // Apply search conditions
      if (conditions.length > 0) {
        facultyQuery = facultyQuery.where(or(...conditions));
      }

      const faculty = await facultyQuery.orderBy(facultySchema.name);

      if (faculty.length === 0) {
        return {
          message: "No faculty members found matching your search criteria",
          searchCriteria: { name, department, email },
          suggestions: [
            "Try searching with partial names",
            "Check the department spelling",
            "Contact the main office for faculty directory"
          ]
        };
      }

      // Get courses taught by each faculty member
      const facultyWithCourses = await Promise.all(
        faculty.map(async (prof) => {
          const courses = await db
            .select()
            .from(coursesSchema)
            .where(eq(coursesSchema.instructor_email, prof.email || ''))
            .orderBy(coursesSchema.code);
            
          return formatFacultyInfo(prof, null, courses);
        })
      );

      return {
        totalFound: faculty.length,
        searchCriteria: { name, department, email },
        faculty: facultyWithCourses
      };
      
    } catch (error) {
      console.error("Faculty directory tool error:", error);
      return {
        error: "Failed to search faculty directory",
        message: "There was a problem accessing the faculty database. Please try again."
      };
    }
  }
};

function formatFacultyInfo(faculty: any, specificCourse?: any, allCourses?: any[]) {
  return {
    id: faculty.id,
    name: faculty.name,
    email: faculty.email,
    department: faculty.department,
    title: faculty.title,
    officeLocation: faculty.office_location,
    officeHours: faculty.office_hours,
    phone: faculty.phone,
    bio: faculty.bio,
    websiteUrl: faculty.website_url,
    researchInterests: faculty.research_interests || [],
    currentCourse: specificCourse ? {
      code: specificCourse.code,
      name: specificCourse.name,
      schedule: specificCourse.class_schedule
    } : undefined,
    allCourses: allCourses?.map(course => ({
      code: course.code,
      name: course.name,
      semester: course.semester,
      year: course.year
    })) || []
  };
}
```

#### Tool 4: Academic Schedule Tool
```typescript
// NEW: src/lib/ai/mcp/tools/academic/schedule.tool.ts
export const academicScheduleTool = {
  name: "get-academic-schedule",
  description: "Get class schedule, academic calendar events, and important dates",
  parameters: z.object({
    userId: z.string().describe("Student user ID"),
    date: z.string().optional().describe("Specific date (YYYY-MM-DD) or 'today', 'tomorrow', 'this-week'"),
    courseCode: z.string().optional().describe("Filter by specific course"),
    eventType: z.enum(["class", "exam", "assignment", "event", "holiday", "all"]).optional().default("all"),
    daysAhead: z.number().optional().default(7).describe("Number of days to look ahead")
  }),
  
  execute: async ({ userId, date, courseCode, eventType, daysAhead }) => {
    try {
      // Parse date parameter
      const { startDate, endDate, dateLabel } = parseDateRange(date, daysAhead);
      
      // Get user's enrolled courses
      const enrollments = await db
        .select({
          course: coursesSchema,
          enrollment: studentEnrollmentsSchema
        })
        .from(studentEnrollmentsSchema)
        .innerJoin(coursesSchema, eq(coursesSchema.id, studentEnrollmentsSchema.courseId))
        .where(
          and(
            eq(studentEnrollmentsSchema.userId, userId),
            eq(studentEnrollmentsSchema.status, 'active')
          )
        );

      if (enrollments.length === 0) {
        return {
          message: "You are not enrolled in any courses",
          schedule: [],
          summary: "No schedule to display"
        };
      }

      const enrolledCourses = enrollments.map(e => e.course);
      
      // Filter by specific course if requested
      const coursesToShow = courseCode 
        ? enrolledCourses.filter(c => c.code.toLowerCase() === courseCode.toLowerCase())
        : enrolledCourses;

      if (courseCode && coursesToShow.length === 0) {
        return {
          error: `You are not enrolled in ${courseCode}`,
          enrolledCourses: enrolledCourses.map(c => c.code)
        };
      }

      const scheduleEvents: ScheduleEvent[] = [];

      // Add class sessions
      if (eventType === "all" || eventType === "class") {
        const classEvents = generateClassSessions(coursesToShow, startDate, endDate);
        scheduleEvents.push(...classEvents);
      }

      // Add assignments due dates
      if (eventType === "all" || eventType === "assignment") {
        const assignmentEvents = await getAssignmentEvents(coursesToShow, startDate, endDate);
        scheduleEvents.push(...assignmentEvents);
      }

      // Add academic calendar events
      if (eventType === "all" || eventType === "event" || eventType === "exam" || eventType === "holiday") {
        const calendarEvents = await getAcademicCalendarEvents(
          coursesToShow.map(c => c.id), 
          startDate, 
          endDate, 
          eventType
        );
        scheduleEvents.push(...calendarEvents);
      }

      // Sort events by date and time
      scheduleEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

      // Group events by date for better presentation
      const eventsByDate = groupEventsByDate(scheduleEvents);

      const summary = generateScheduleSummary(scheduleEvents, dateLabel, courseCode);

      return {
        period: dateLabel,
        courseFilter: courseCode || "All enrolled courses",
        eventTypeFilter: eventType,
        totalEvents: scheduleEvents.length,
        events: scheduleEvents,
        eventsByDate,
        summary,
        enrolledCourses: enrolledCourses.map(c => ({
          code: c.code,
          name: c.name
        }))
      };
      
    } catch (error) {
      console.error("Academic schedule tool error:", error);
      return {
        error: "Failed to fetch schedule",
        message: "There was a problem accessing schedule data. Please try again."
      };
    }
  }
};

// Helper types
interface ScheduleEvent {
  id: string;
  type: 'class' | 'assignment' | 'exam' | 'event' | 'holiday';
  title: string;
  description?: string;
  course?: {
    code: string;
    name: string;
  };
  startTime: string;
  endTime?: string;
  location?: string;
  isRecurring: boolean;
}

// Helper functions
function parseDateRange(date: string | undefined, daysAhead: number) {
  const today = new Date();
  let startDate: Date;
  let endDate: Date;
  let dateLabel: string;

  switch (date) {
    case 'today':
      startDate = new Date(today);
      endDate = new Date(today);
      dateLabel = 'Today';
      break;
    case 'tomorrow':
      startDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      dateLabel = 'Tomorrow';
      break;
    case 'this-week':
      startDate = getStartOfWeek(today);
      endDate = getEndOfWeek(today);
      dateLabel = 'This Week';
      break;
    default:
      if (date && isValidDate(date)) {
        startDate = new Date(date);
        endDate = new Date(date);
        dateLabel = formatDate(startDate);
      } else {
        startDate = new Date(today);
        endDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);
        dateLabel = `Next ${daysAhead} days`;
      }
  }

  return { startDate, endDate, dateLabel };
}

function generateClassSessions(courses: any[], startDate: Date, endDate: Date): ScheduleEvent[] {
  const events: ScheduleEvent[] = [];
  
  for (const course of courses) {
    if (!course.class_schedule) continue;
    
    const schedule = course.class_schedule;
    const days = schedule.days || [];
    const time = schedule.time || '';
    const location = schedule.location || '';
    
    // Generate class sessions for each day in the date range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'short' });
      
      if (days.includes(dayName) || days.includes(dayName.toLowerCase())) {
        const [startTime, endTime] = parseTimeRange(time);
        
        events.push({
          id: `class-${course.id}-${currentDate.toISOString().split('T')[0]}`,
          type: 'class',
          title: `${course.code} - ${course.name}`,
          description: `Class session`,
          course: {
            code: course.code,
            name: course.name
          },
          startTime: combineDateTime(currentDate, startTime),
          endTime: combineDateTime(currentDate, endTime),
          location,
          isRecurring: true
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  return events;
}
```

### **Days 11-14: Tool Integration & Registration**

#### MCP Tool Registration System
```typescript
// NEW: src/lib/ai/mcp/tools/academic/index.ts
import { courseContentTool } from './course-content.tool';
import { assignmentTrackerTool } from './assignments.tool';
import { facultyDirectoryTool } from './faculty.tool';
import { academicScheduleTool } from './schedule.tool';

// Academic Tools Bundle
export const academicTools = {
  [courseContentTool.name]: courseContentTool,
  [assignmentTrackerTool.name]: assignmentTrackerTool,
  [facultyDirectoryTool.name]: facultyDirectoryTool,
  [academicScheduleTool.name]: academicScheduleTool,
};

// Auto-register academic tools for all students
export async function registerAcademicToolsForUser(userId: string) {
  const mcpServerId = await createOrUpdateAcademicMCPServer(userId);
  
  // Create academic tool preset
  const academicPreset = {
    id: 'academic-assistant',
    name: 'Academic Assistant',
    description: 'Essential tools for academic success',
    tools: Object.keys(academicTools),
    mcpServers: [mcpServerId],
    isDefault: true
  };
  
  await saveUserToolPreset(userId, academicPreset);
  
  return mcpServerId;
}

// MODIFY: src/lib/ai/mcp/client-manager.ts
export class MCPClientManager {
  // ... existing code
  
  // Add method to initialize academic tools
  async initializeAcademicTools(userId: string) {
    const academicClient = new MCPClient({
      name: 'academic-tools',
      type: 'internal',
      tools: academicTools,
      userId
    });
    
    this.clients.set('academic-tools', academicClient);
    
    return academicClient;
  }
}
```

---

## **Phase 3: Student Dashboard & Interface (Week 3)**

### **Days 15-17: Student Dashboard Redesign**

#### Main Student Dashboard
```typescript
// NEW: src/app/(chat)/dashboard/page.tsx
import { Metadata } from "next";
import { auth } from "lib/auth";
import { redirect } from "next/navigation";
import { EnrolledCoursesWidget } from "components/student/enrolled-courses-widget";
import { UpcomingAssignmentsWidget } from "components/student/upcoming-assignments-widget";
import { TodaysScheduleWidget } from "components/student/todays-schedule-widget";
import { RecentAnnouncementsWidget } from "components/student/recent-announcements-widget";
import { QuickActionsWidget } from "components/student/quick-actions-widget";
import { AcademicProgressWidget } from "components/student/academic-progress-widget";

export const metadata: Metadata = {
  title: "Student Dashboard - Your School AI Assistant",
  description: "Your personalized academic dashboard"
};

export default async function StudentDashboardPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/sign-in");
  }
  
  // Redirect admins to admin dashboard
  if (session.user.role === 'admin') {
    redirect("/admin/dashboard");
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Welcome back, {session.user.name?.split(' ')[0]}!</h1>
        <p className="text-gray-600">Here's what's happening with your courses</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Primary widgets - full width on mobile, responsive on larger screens */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EnrolledCoursesWidget userId={session.user.id} />
            <UpcomingAssignmentsWidget userId={session.user.id} />
          </div>
        </div>
        
        <div className="space-y-6">
          <TodaysScheduleWidget userId={session.user.id} />
          <QuickActionsWidget />
        </div>
        
        {/* Secondary widgets - full width */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecentAnnouncementsWidget userId={session.user.id} />
            <AcademicProgressWidget userId={session.user.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### Enrolled Courses Widget
```typescript
// NEW: src/components/student/enrolled-courses-widget.tsx
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "components/ui/card";
import { Button } from "components/ui/button";
import { Badge } from "components/ui/badge";
import { BookOpen, Clock, User, ExternalLink } from "lucide-react";
import useSWR from "swr";
import { useRouter } from "next/navigation";

interface Course {
  id: string;
  code: string;
  name: string;
  credits: number;
  instructor_name: string;
  class_schedule: {
    days: string[];
    time: string;
    location: string;
  };
  department: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function EnrolledCoursesWidget({ userId }: { userId: string }) {
  const { data: courses, isLoading, error } = useSWR<Course[]>(`/api/student/${userId}/courses`, fetcher);
  const router = useRouter();

  const startCourseChat = (courseCode: string) => {
    // Navigate to chat with course context
    router.push(`/?course=${courseCode}&message=Tell me about ${courseCode}`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            My Courses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            My Courses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">Failed to load courses</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          My Courses ({courses?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {courses?.map(course => (
            <div key={course.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{course.code}</Badge>
                  <Badge variant="secondary">{course.credits} credits</Badge>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => startCourseChat(course.code)}
                  className="flex items-center gap-1"
                >
                  Chat <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
              
              <h4 className="font-medium text-sm mb-2">{course.name}</h4>
              
              <div className="flex flex-col gap-1 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {course.instructor_name}
                </div>
                {course.class_schedule && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {course.class_schedule.days?.join(', ')} {course.class_schedule.time}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {(!courses || courses.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No courses enrolled</p>
              <Button variant="link" className="mt-2">
                Contact your advisor to enroll in courses
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

#### Upcoming Assignments Widget
```typescript
// NEW: src/components/student/upcoming-assignments-widget.tsx
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "components/ui/card";
import { Button } from "components/ui/button";
import { Badge } from "components/ui/badge";
import { Calendar, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import useSWR from "swr";
import { formatDistanceToNow, format, isPast } from "date-fns";

interface Assignment {
  id: string;
  title: string;
  course: {
    code: string;
    name: string;
  };
  dueDate: string;
  daysUntilDue: number;
  urgency: 'overdue' | 'urgent' | 'soon' | 'later';
  pointsPossible: number;
  description?: string;
}

const urgencyColors = {
  overdue: 'destructive',
  urgent: 'destructive',
  soon: 'warning',
  later: 'secondary'
} as const;

const urgencyIcons = {
  overdue: AlertTriangle,
  urgent: AlertTriangle,
  soon: Clock,
  later: Calendar
};

export function UpcomingAssignmentsWidget({ userId }: { userId: string }) {
  const { data, isLoading, error } = useSWR(
    `/api/student/${userId}/assignments?daysAhead=14`, 
    (url) => fetch(url).then(res => res.json())
  );

  const assignments = data?.assignments || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const askAboutAssignment = (assignment: Assignment) => {
    const message = `Tell me more about the assignment "${assignment.title}" for ${assignment.course.code}`;
    window.open(`/?message=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Upcoming Assignments ({assignments.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {assignments.slice(0, 10).map((assignment: Assignment) => {
            const UrgencyIcon = urgencyIcons[assignment.urgency];
            const isOverdue = isPast(new Date(assignment.dueDate));
            
            return (
              <div 
                key={assignment.id} 
                className="p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => askAboutAssignment(assignment)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{assignment.course.code}</Badge>
                    <Badge variant={urgencyColors[assignment.urgency] as any}>
                      <UrgencyIcon className="h-3 w-3 mr-1" />
                      {assignment.urgency}
                    </Badge>
                  </div>
                  {assignment.pointsPossible && (
                    <span className="text-xs text-gray-500">
                      {assignment.pointsPossible} pts
                    </span>
                  )}
                </div>
                
                <h4 className="font-medium text-sm mb-1">{assignment.title}</h4>
                
                <div className="flex justify-between items-center text-xs text-gray-600">
                  <span>
                    Due {format(new Date(assignment.dueDate), 'MMM d, yyyy')}
                  </span>
                  <span className={isOverdue ? 'text-red-600' : ''}>
                    {isOverdue ? 'Overdue' : formatDistanceToNow(new Date(assignment.dueDate), { addSuffix: true })}
                  </span>
                </div>
              </div>
            );
          })}
          
          {assignments.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No upcoming assignments</p>
              <p className="text-xs">You're all caught up!</p>
            </div>
          )}
        </div>
        
        {assignments.length > 10 && (
          <Button variant="link" className="w-full mt-2">
            View all assignments
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```

### **Days 18-19: Chat Interface Enhancements**

#### Course-Aware Chat Context
```typescript
// MODIFY: src/app/api/chat/route.ts
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages, model, tools, toolChoice, courseContext } = await request.json();
  
  // Get academic context for the user
  const academicContext = await getAcademicContext(session.user.id, courseContext);
  
  // Add academic context to system message
  const systemMessage = {
    role: "system",
    content: `You are an academic assistant for ${session.user.name}. 
    
Academic Context:
- Enrolled Courses: ${academicContext.courses.map(c => `${c.code} - ${c.name}`).join(', ')}
- Current Semester: ${academicContext.semester}
- Student Level: ${session.user.year || 'Student'}

Available Academic Tools:
- get-course-materials: Fetch course content and materials
- get-upcoming-assignments: Check assignment deadlines  
- find-faculty: Find professor contact information
- get-academic-schedule: Check class schedule and events

When students ask about courses, assignments, or academic topics, use these tools to provide accurate, personalized information. Always consider the student's enrollment when making recommendations.

If they ask general knowledge questions unrelated to their courses, answer directly without using academic tools.`
  };

  const enhancedMessages = [systemMessage, ...messages];
  
  // Include academic tools in available tools
  const academicTools = await getAcademicToolsForUser(session.user.id);
  const allTools = [...(tools || []), ...academicTools];

  // Rest of existing chat logic...
  const result = streamText({
    model: provider(modelName),
    messages: enhancedMessages,
    tools: allTools,
    toolChoice,
    onToolCall: async ({ toolCallId, toolName, args }) => {
      // Add user ID to academic tool calls
      if (isAcademicTool(toolName)) {
        args.userId = session.user.id;
      }
      
      return await executeTool(toolName, args);
    },
  });

  return result.toDataStreamResponse();
}

async function getAcademicContext(userId: string, courseContext?: string) {
  const enrollments = await db
    .select({
      course: coursesSchema,
    })
    .from(studentEnrollmentsSchema)
    .innerJoin(coursesSchema, eq(coursesSchema.id, studentEnrollmentsSchema.courseId))
    .where(
      and(
        eq(studentEnrollmentsSchema.userId, userId),
        eq(studentEnrollmentsSchema.status, 'active')
      )
    );

  return {
    courses: enrollments.map(e => e.course),
    semester: getCurrentSemester(),
    hasSpecificCourseContext: !!courseContext
  };
}
```

#### Enhanced Chat Input with Academic Suggestions
```typescript
// MODIFY: src/components/chat/message-input.tsx
"use client";

import { useState, useRef } from "react";
import { Button } from "components/ui/button";
import { Textarea } from "components/ui/textarea";
import { Badge } from "components/ui/badge";
import { Send, BookOpen, Calendar, User, Clock } from "lucide-react";
import { useChat } from "ai/react";

const academicSuggestions = [
  {
    icon: BookOpen,
    text: "What materials do I need for week 4 of CS101?",
    category: "course-content"
  },
  {
    icon: Calendar,
    text: "Show me upcoming assignments across all my courses",
    category: "assignments"
  },
  {
    icon: User,
    text: "When are Professor Smith's office hours?",
    category: "faculty"
  },
  {
    icon: Clock,
    text: "What's my schedule for tomorrow?",
    category: "schedule"
  }
];

export function MessageInput({ onSendMessage, isLoading, courses = [] }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSendMessage = () => {
    if (!message.trim() || isLoading) return;
    
    onSendMessage(message);
    setMessage("");
    setShowSuggestions(false);
  };

  const useSuggestion = (suggestion: string) => {
    setMessage(suggestion);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="border-t bg-white p-4">
      {/* Course Context Pills */}
      {courses.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-gray-500">Your courses:</span>
            {courses.map((course) => (
              <Badge
                key={course.code}
                variant="secondary"
                className="cursor-pointer hover:bg-blue-100"
                onClick={() => useSuggestion(`Tell me about ${course.code}`)}
              >
                {course.code}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Quick Academic Suggestions */}
      {showSuggestions && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium mb-3">Try asking about:</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {academicSuggestions.map((suggestion, index) => {
              const Icon = suggestion.icon;
              return (
                <button
                  key={index}
                  onClick={() => useSuggestion(suggestion.text)}
                  className="flex items-start gap-2 p-2 text-left hover:bg-white rounded border transition-colors"
                >
                  <Icon className="h-4 w-4 mt-0.5 text-blue-600" />
                  <span className="text-sm">{suggestion.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Ask me anything about your courses, assignments, or schedule..."
            className="min-h-[44px] max-h-32 resize-none"
            disabled={isLoading}
          />
        </div>
        <Button 
          onClick={handleSendMessage}
          disabled={!message.trim() || isLoading}
          size="sm"
          className="self-end"
        >
          {isLoading ? (
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Help Text */}
      <div className="mt-2 text-xs text-gray-500">
        Ask about your courses, assignments, professors, or schedule. Type @ to mention specific tools.
      </div>
    </div>
  );
}
```

---

## **Phase 4: Admin Interface (Week 4)**

### **Days 22-24: Course & Content Management**

#### Admin Dashboard
```typescript
// NEW: src/app/(admin)/layout.tsx
import { auth } from "lib/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "components/admin/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  if (!session?.user || session.user.role !== 'admin') {
    redirect("/");
  }

  return (
    <div className="flex h-screen">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

// NEW: src/app/(admin)/dashboard/page.tsx
export default function AdminDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Students"
          value="1,247"
          icon={Users}
          change="+12 this week"
        />
        <StatsCard
          title="Active Courses"
          value="89"
          icon={BookOpen}
          change="+3 new courses"
        />
        <StatsCard
          title="Assignments Due"
          value="156"
          icon={Calendar}
          change="This week"
        />
        <StatsCard
          title="Faculty Members"
          value="67"
          icon={User}
          change="Across 15 departments"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <RecentActivityWidget />
        <CourseEnrollmentChart />
      </div>
    </div>
  );
}
```

#### Course Management Interface
```typescript
// NEW: src/app/(admin)/courses/page.tsx
"use client";

import { useState } from "react";
import { Button } from "components/ui/button";
import { Input } from "components/ui/input";
import { Badge } from "components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "components/ui/table";
import { Plus, Edit, Trash2, Upload, Search } from "lucide-react";
import { CreateCourseDialog } from "components/admin/create-course-dialog";
import { BulkCourseUpload } from "components/admin/bulk-course-upload";
import useSWR from "swr";

export default function CoursesManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  
  const { data: courses, mutate } = useSWR('/api/admin/courses', fetcher);

  const filteredCourses = courses?.filter((course: Course) =>
    course.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Course Management</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowBulkUpload(true)}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Bulk Upload
          </Button>
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Course
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search courses by code, name, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Courses Table */}
      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course Code</TableHead>
              <TableHead>Course Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Instructor</TableHead>
              <TableHead>Enrolled</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCourses?.map((course: Course) => (
              <TableRow key={course.id}>
                <TableCell className="font-medium">{course.code}</TableCell>
                <TableCell>{course.name}</TableCell>
                <TableCell>{course.department}</TableCell>
                <TableCell>{course.instructor_name || 'TBA'}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {course._count?.enrollments || 0} students
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={course.status === 'active' ? 'default' : 'secondary'}>
                    {course.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/admin/courses/${course.id}`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/admin/courses/${course.id}/materials`)}
                    >
                      Materials
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() => handleDeleteCourse(course.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialogs */}
      <CreateCourseDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          mutate();
          setShowCreateDialog(false);
        }}
      />
      
      <BulkCourseUpload
        open={showBulkUpload}
        onOpenChange={setShowBulkUpload}
        onSuccess={() => {
          mutate();
          setShowBulkUpload(false);
        }}
      />
    </div>
  );
}
```

#### Course Materials Management
```typescript
// NEW: src/app/(admin)/courses/[id]/materials/page.tsx
"use client";

import { useState } from "react";
import { Button } from "components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "components/ui/card";
import { Badge } from "components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "components/ui/tabs";
import { Plus, Edit, Trash2, FileText, Calendar } from "lucide-react";
import { AddMaterialDialog } from "components/admin/add-material-dialog";
import { WeeklyMaterialsGrid } from "components/admin/weekly-materials-grid";
import useSWR from "swr";

export default function CourseMaterialsPage({ params }: { params: { id: string } }) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  
  const { data: course } = useSWR(`/api/admin/courses/${params.id}`, fetcher);
  const { data: materials, mutate } = useSWR(`/api/admin/courses/${params.id}/materials`, fetcher);

  const materialsByWeek = materials?.reduce((acc: any, material: any) => {
    const week = material.weekNumber;
    acc[week] = acc[week] || [];
    acc[week].push(material);
    return acc;
  }, {}) || {};

  const materialsByType = materials?.reduce((acc: any, material: any) => {
    const type = material.materialType;
    acc[type] = acc[type] || [];
    acc[type].push(material);
    return acc;
  }, {}) || {};

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{course?.code} Materials</h1>
          <p className="text-gray-600">{course?.name}</p>
        </div>
        <Button 
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Material
        </Button>
      </div>

      <Tabs defaultValue="by-week" className="space-y-6">
        <TabsList>
          <TabsTrigger value="by-week">By Week</TabsTrigger>
          <TabsTrigger value="by-type">By Type</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
        </TabsList>

        <TabsContent value="by-week" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 16 }, (_, i) => i + 1).map(week => (
              <Card 
                key={week} 
                className={`cursor-pointer transition-colors ${
                  selectedWeek === week ? 'ring-2 ring-blue-500' : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedWeek(selectedWeek === week ? null : week)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Week {week}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {Object.entries(
                      (materialsByWeek[week] || []).reduce((acc: any, material: any) => {
                        acc[material.materialType] = (acc[material.materialType] || 0) + 1;
                        return acc;
                      }, {})
                    ).map(([type, count]) => (
                      <div key={type} className="flex justify-between text-xs">
                        <span className="capitalize">{type}</span>
                        <Badge variant="secondary" className="h-4 text-xs">
                          {count}
                        </Badge>
                      </div>
                    ))}
                    {(!materialsByWeek[week] || materialsByWeek[week].length === 0) && (
                      <p className="text-xs text-gray-400">No materials</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedWeek && (
            <Card>
              <CardHeader>
                <CardTitle>Week {selectedWeek} Materials</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(materialsByWeek[selectedWeek] || []).map((material: any) => (
                    <div key={material.id} className="flex justify-between items-start p-4 border rounded">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{material.materialType}</Badge>
                          <h4 className="font-medium">{material.title}</h4>
                        </div>
                        {material.content && (
                          <p className="text-sm text-gray-600 mb-2">{material.content}</p>
                        )}
                        {material.dueDate && (
                          <div className="flex items-center gap-1 text-xs text-red-600">
                            <Calendar className="h-3 w-3" />
                            Due: {format(new Date(material.dueDate), 'MMM d, yyyy')}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="by-type" className="space-y-6">
          {Object.entries(materialsByType).map(([type, materials]) => (
            <Card key={type}>
              <CardHeader>
                <CardTitle className="capitalize">{type}s ({(materials as any[]).length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(materials as any[]).map((material: any) => (
                    <div key={material.id} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">Week {material.weekNumber}</Badge>
                          <span className="font-medium">{material.title}</span>
                        </div>
                        {material.dueDate && (
                          <p className="text-sm text-gray-600">
                            Due: {format(new Date(material.dueDate), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <AddMaterialDialog
        courseId={params.id}
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => {
          mutate();
          setShowAddDialog(false);
        }}
        suggestedWeek={selectedWeek}
      />
    </div>
  );
}
```

---

## **Phase 5: Integration & Testing (Week 5)**

### **Days 29-35: Final Integration & Polish**

#### API Endpoints Implementation
```typescript
// NEW: src/app/api/student/[userId]/courses/route.ts
export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const session = await auth();
  if (!session?.user || session.user.id !== params.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const courses = await db
      .select({
        course: coursesSchema,
        enrollment: studentEnrollmentsSchema
      })
      .from(studentEnrollmentsSchema)
      .innerJoin(coursesSchema, eq(coursesSchema.id, studentEnrollmentsSchema.courseId))
      .where(
        and(
          eq(studentEnrollmentsSchema.userId, params.userId),
          eq(studentEnrollmentsSchema.status, 'active')
        )
      )
      .orderBy(coursesSchema.code);

    return Response.json(courses.map(item => item.course));
  } catch (error) {
    return Response.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}

// NEW: src/app/api/student/[userId]/assignments/route.ts
export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const session = await auth();
  if (!session?.user || session.user.id !== params.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const daysAhead = parseInt(searchParams.get('daysAhead') || '30');
  const courseCode = searchParams.get('courseCode');

  try {
    // Use the assignment tracker tool
    const result = await assignmentTrackerTool.execute({
      userId: params.userId,
      daysAhead,
      courseCode: courseCode || undefined
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: "Failed to fetch assignments" }, { status: 500 });
  }
}
```

#### Testing & Quality Assurance
```typescript
// NEW: tests/academic-tools.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { courseContentTool } from '../src/lib/ai/mcp/tools/academic/course-content.tool';
import { assignmentTrackerTool } from '../src/lib/ai/mcp/tools/academic/assignments.tool';

describe('Academic MCP Tools', () => {
  beforeAll(async () => {
    // Setup test database with sample data
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('Course Content Tool', () => {
    it('should fetch course materials for enrolled student', async () => {
      const result = await courseContentTool.execute({
        courseCode: 'CS101',
        userId: 'test-student-id'
      });

      expect(result).toBeDefined();
      expect(result.course.code).toBe('CS101');
      expect(Array.isArray(result.materials)).toBe(true);
    });

    it('should reject access for non-enrolled student', async () => {
      const result = await courseContentTool.execute({
        courseCode: 'MATH201', 
        userId: 'test-student-id' // Not enrolled in MATH201
      });

      expect(result.error).toContain('not enrolled');
    });
  });

  describe('Assignment Tracker Tool', () => {
    it('should return upcoming assignments for student', async () => {
      const result = await assignmentTrackerTool.execute({
        userId: 'test-student-id',
        daysAhead: 14
      });

      expect(result.assignments).toBeDefined();
      expect(Array.isArray(result.assignments)).toBe(true);
    });
  });
});
```

#### Performance Optimizations
```typescript
// Performance improvements for academic queries
export const academicQueryCache = new Map();

export async function getCachedCourseContent(courseId: string, weekNumber?: number) {
  const cacheKey = `course-${courseId}-week-${weekNumber || 'all'}`;
  
  if (academicQueryCache.has(cacheKey)) {
    const cached = academicQueryCache.get(cacheKey);
    if (Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minute cache
      return cached.data;
    }
  }

  const data = await db.select()
    .from(courseMaterialsSchema)
    .where(
      weekNumber 
        ? and(eq(courseMaterialsSchema.courseId, courseId), eq(courseMaterialsSchema.weekNumber, weekNumber))
        : eq(courseMaterialsSchema.courseId, courseId)
    );

  academicQueryCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });

  return data;
}
```

---

## 🎯 **Success Metrics & Completion Checklist**

### **MVP Success Criteria**

#### ✅ **Core Functionality**
- [ ] Students can register with school email (@yourschool.edu)
- [ ] Students can select courses during registration
- [ ] AI can answer academic queries using MCP tools
- [ ] AI decides when to use tools vs. direct response
- [ ] Students can access course materials, assignments, schedules
- [ ] Admin can manage courses and content
- [ ] Students can add personal MCP tools (Google Calendar, etc.)

#### ✅ **Technical Requirements**
- [ ] Database schema supports academic data
- [ ] Academic MCP tools integrated with chat system
- [ ] Student dashboard shows personalized information
- [ ] Admin interface for content management
- [ ] Authentication enforces school email domain
- [ ] Performance optimized for academic queries

#### ✅ **User Experience**
- [ ] Intuitive chat interface with academic suggestions
- [ ] Course-aware responses with proper context
- [ ] Mobile-responsive design for students
- [ ] Clear error handling and user feedback
- [ ] Fast response times for common queries

### **Timeline Summary**
- **Week 1**: Foundation & Authentication Setup
- **Week 2**: Academic MCP Tools Development  
- **Week 3**: Student Dashboard & Chat Enhancements
- **Week 4**: Admin Interface & Content Management
- **Week 5**: Integration, Testing & Polish

### **Post-MVP Roadmap**
1. **File Upload**: Course material file management
2. **Mobile App**: React Native companion app
3. **Advanced Analytics**: Usage insights for admins
4. **Grade Integration**: Connect to existing grade systems
5. **Enhanced Voice Features**: Voice-first academic interactions
6. **Workflow Templates**: Pre-built academic workflows for common tasks

**Total Development Time: 5 weeks to fully functional MVP**

## 🚀 **The Perfect Strategy: Additive Development**

This plan uses the **"additive" approach** - we keep 100% of your existing codebase intact and simply add academic-specific features on top. No deletion, no breaking changes, no wasted work.

**The Result:**
- **Core MVP**: Students get natural language access to all academic information
- **Power Features**: Advanced users can leverage workflows, voice chat, agents, bookmarks
- **Future Flexibility**: Features naturally evolve based on actual student usage
- **Zero Risk**: Existing functionality remains untouched and functional

**Students get the best of both worlds**: A focused academic assistant with the full power of your existing platform available when they need it. Some students might discover they love creating study workflows or using voice chat for accessibility - that's all ready to go!