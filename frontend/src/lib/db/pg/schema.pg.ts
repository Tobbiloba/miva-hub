import { Agent } from "app-types/agent";
import { UserPreferences } from "app-types/user";
import { MCPServerConfig } from "app-types/mcp";
import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  json,
  uuid,
  boolean,
  unique,
  varchar,
  index,
  integer,
  decimal,
  date,
} from "drizzle-orm/pg-core";
import { isNotNull } from "drizzle-orm";
import { DBWorkflow, DBEdge, DBNode } from "app-types/workflow";
import { UIMessage } from "ai";
import { ChatMetadata } from "app-types/chat";

export const ChatThreadSchema = pgTable("chat_thread", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  title: text("title").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserSchema.id),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const ChatMessageSchema = pgTable("chat_message", {
  id: text("id").primaryKey().notNull(),
  threadId: uuid("thread_id")
    .notNull()
    .references(() => ChatThreadSchema.id),
  role: text("role").notNull().$type<UIMessage["role"]>(),
  parts: json("parts").notNull().array().$type<UIMessage["parts"]>(),
  metadata: json("metadata").$type<ChatMetadata>(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const AgentSchema = pgTable("agent", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  icon: json("icon").$type<Agent["icon"]>(),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserSchema.id),
  instructions: json("instructions").$type<Agent["instructions"]>(),
  visibility: varchar("visibility", {
    enum: ["public", "private", "readonly"],
  })
    .notNull()
    .default("private"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const BookmarkSchema = pgTable(
  "bookmark",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => UserSchema.id, { onDelete: "cascade" }),
    itemId: uuid("item_id").notNull(),
    itemType: varchar("item_type", {
      enum: ["agent", "workflow"],
    }).notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    unique().on(table.userId, table.itemId, table.itemType),
    index("bookmark_user_id_idx").on(table.userId),
    index("bookmark_item_idx").on(table.itemId, table.itemType),
  ],
);

export const McpServerSchema = pgTable("mcp_server", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  config: json("config").notNull().$type<MCPServerConfig>(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const UserSchema = pgTable("user", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  password: text("password"),
  image: text("image"),
  preferences: json("preferences").default({}).$type<UserPreferences>(),
  
  // Academic/Student fields
  studentId: text("student_id").unique(),
  major: text("major"),
  year: text("year"), // 100, 200, 300, 400, graduate, doctoral
  currentSemester: text("current_semester"), // first, second
  role: text("role").default("student"), // student, faculty, admin, staff
  academicYear: text("academic_year"), // 2024-2025, 2025-2026
  enrollmentStatus: text("enrollment_status").default("active"), // active, inactive, graduated, suspended, transferred
  graduationDate: timestamp("graduation_date"),
  
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const SessionSchema = pgTable("session", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserSchema.id, { onDelete: "cascade" }),
});

export const AccountSchema = pgTable("account", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserSchema.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const VerificationSchema = pgTable("verification", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
});

// Tool customization table for per-user additional instructions
export const McpToolCustomizationSchema = pgTable(
  "mcp_server_tool_custom_instructions",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => UserSchema.id, { onDelete: "cascade" }),
    toolName: text("tool_name").notNull(),
    mcpServerId: uuid("mcp_server_id")
      .notNull()
      .references(() => McpServerSchema.id, { onDelete: "cascade" }),
    prompt: text("prompt"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [unique().on(table.userId, table.toolName, table.mcpServerId)],
);

export const McpServerCustomizationSchema = pgTable(
  "mcp_server_custom_instructions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => UserSchema.id, { onDelete: "cascade" }),
    mcpServerId: uuid("mcp_server_id")
      .notNull()
      .references(() => McpServerSchema.id, { onDelete: "cascade" }),
    prompt: text("prompt"),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [unique().on(table.userId, table.mcpServerId)],
);

export const WorkflowSchema = pgTable("workflow", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  version: text("version").notNull().default("0.1.0"),
  name: text("name").notNull(),
  icon: json("icon").$type<DBWorkflow["icon"]>(),
  description: text("description"),
  isPublished: boolean("is_published").notNull().default(false),
  visibility: varchar("visibility", {
    enum: ["public", "private", "readonly"],
  })
    .notNull()
    .default("private"),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserSchema.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const WorkflowNodeDataSchema = pgTable(
  "workflow_node",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    version: text("version").notNull().default("0.1.0"),
    workflowId: uuid("workflow_id")
      .notNull()
      .references(() => WorkflowSchema.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    uiConfig: json("ui_config").$type<DBNode["uiConfig"]>().default({}),
    nodeConfig: json("node_config")
      .$type<Partial<DBNode["nodeConfig"]>>()
      .default({}),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("workflow_node_kind_idx").on(t.kind)],
);

export const WorkflowEdgeSchema = pgTable("workflow_edge", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  version: text("version").notNull().default("0.1.0"),
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => WorkflowSchema.id, { onDelete: "cascade" }),
  source: uuid("source")
    .notNull()
    .references(() => WorkflowNodeDataSchema.id, { onDelete: "cascade" }),
  target: uuid("target")
    .notNull()
    .references(() => WorkflowNodeDataSchema.id, { onDelete: "cascade" }),
  uiConfig: json("ui_config").$type<DBEdge["uiConfig"]>().default({}),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const ArchiveSchema = pgTable("archive", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserSchema.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const ArchiveItemSchema = pgTable(
  "archive_item",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    archiveId: uuid("archive_id")
      .notNull()
      .references(() => ArchiveSchema.id, { onDelete: "cascade" }),
    itemId: uuid("item_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => UserSchema.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("archive_item_item_id_idx").on(t.itemId)],
);

export const McpOAuthSessionSchema = pgTable(
  "mcp_oauth_session",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    mcpServerId: uuid("mcp_server_id")
      .notNull()
      .references(() => McpServerSchema.id, { onDelete: "cascade" }),
    serverUrl: text("server_url").notNull(),
    clientInfo: json("client_info"),
    tokens: json("tokens"),
    codeVerifier: text("code_verifier"),
    state: text("state").unique(), // OAuth state parameter for current flow (unique for security)
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("mcp_oauth_session_server_id_idx").on(t.mcpServerId),
    index("mcp_oauth_session_state_idx").on(t.state),
    // Partial index for sessions with tokens for better performance
    index("mcp_oauth_session_tokens_idx")
      .on(t.mcpServerId)
      .where(isNotNull(t.tokens)),
  ],
);

// ===============================
// ACADEMIC SCHEMA TABLES
// ===============================

// Departments table
export const DepartmentSchema = pgTable("department", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  code: text("code").notNull().unique(), // e.g., "CS", "MATH", "ENG"
  name: text("name").notNull(), // e.g., "Computer Science", "Mathematics"
  description: text("description"),
  facultyHeadId: uuid("faculty_head_id").references(() => UserSchema.id),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  officeLocation: text("office_location"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Courses table
export const CourseSchema = pgTable(
  "course",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    courseCode: text("course_code").notNull().unique(), // e.g., "CS101", "MATH201"
    title: text("title").notNull(),
    description: text("description"),
    credits: integer("credits").notNull().default(3),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => DepartmentSchema.id),
    level: varchar("level", { enum: ["100L", "200L", "300L", "400L", "graduate", "doctoral"] })
      .notNull()
      .default("100L"),
    semesterOffered: varchar("semester_offered", { 
      enum: ["fall", "spring", "summer", "both"] 
    }).notNull().default("both"),
    isActive: boolean("is_active").notNull().default(true),
    totalWeeks: integer("total_weeks").default(16), // Total weeks for the course
    startDate: timestamp("start_date"), // Course start date
    endDate: timestamp("end_date"), // Course end date
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("course_department_idx").on(table.departmentId),
    index("course_code_idx").on(table.courseCode),
    index("course_level_idx").on(table.level),
  ],
);

// Course weeks table for structured weekly planning
export const CourseWeekSchema = pgTable(
  "course_week",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => CourseSchema.id, { onDelete: "cascade" }),
    weekNumber: integer("week_number").notNull(), // 1, 2, 3, ..., 16
    title: text("title").notNull(), // Week title/topic
    description: text("description"), // Week description
    learningObjectives: text("learning_objectives"), // JSON array of objectives
    topics: text("topics"), // JSON array of topics to cover
    isPublished: boolean("is_published").notNull().default(false),
    plannedStartDate: timestamp("planned_start_date"), // When this week should start
    plannedEndDate: timestamp("planned_end_date"), // When this week should end
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    unique().on(table.courseId, table.weekNumber),
    index("course_week_course_idx").on(table.courseId),
    index("course_week_number_idx").on(table.weekNumber),
  ],
);

// Course prerequisites junction table
export const CoursePrerequisiteSchema = pgTable(
  "course_prerequisite",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => CourseSchema.id, { onDelete: "cascade" }),
    prerequisiteCourseId: uuid("prerequisite_course_id")
      .notNull()
      .references(() => CourseSchema.id, { onDelete: "cascade" }),
    isRequired: boolean("is_required").notNull().default(true),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    unique().on(table.courseId, table.prerequisiteCourseId),
    index("prerequisite_course_idx").on(table.courseId),
  ],
);

// Course materials table
export const CourseMaterialSchema = pgTable(
  "course_material",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => CourseSchema.id, { onDelete: "cascade" }),
    materialType: varchar("material_type", {
      enum: ["syllabus", "lecture", "assignment", "resource", "reading", "exam"],
    }).notNull(),
    title: text("title").notNull(),
    description: text("description"),
    contentUrl: text("content_url"), // File path or URL
    publicUrl: text("public_url"), // Public URL for frontend access (e.g., /api/files/[id])
    fileName: text("file_name"),
    fileSize: integer("file_size"), // in bytes
    mimeType: text("mime_type"),
    weekNumber: integer("week_number"), // Which week of the semester
    moduleNumber: integer("module_number"), // Which module/unit
    isPublic: boolean("is_public").notNull().default(true),
    uploadedById: uuid("uploaded_by_id")
      .notNull()
      .references(() => UserSchema.id),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("material_course_idx").on(table.courseId),
    index("material_type_idx").on(table.materialType),
    index("material_week_idx").on(table.weekNumber),
    index("material_uploaded_by_idx").on(table.uploadedById),
  ],
);

// Student enrollments table
export const StudentEnrollmentSchema = pgTable(
  "student_enrollment",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => UserSchema.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => CourseSchema.id, { onDelete: "cascade" }),
    semester: text("semester").notNull(), // e.g., "2024-fall", "2025-spring"
    academicYear: text("academic_year").notNull(), // e.g., "2024-2025"
    enrollmentDate: timestamp("enrollment_date").notNull().default(sql`CURRENT_TIMESTAMP`),
    status: varchar("status", {
      enum: ["enrolled", "dropped", "completed", "failed", "withdrawn"],
    }).notNull().default("enrolled"),
    finalGrade: text("final_grade"), // A, B, C, D, F, I, W
    gradePoints: decimal("grade_points", { precision: 3, scale: 2 }), // GPA points
    attendancePercentage: decimal("attendance_percentage", { precision: 5, scale: 2 }),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    unique().on(table.studentId, table.courseId, table.semester),
    index("enrollment_student_idx").on(table.studentId),
    index("enrollment_course_idx").on(table.courseId),
    index("enrollment_semester_idx").on(table.semester),
    index("enrollment_status_idx").on(table.status),
  ],
);

// Faculty table (extends user information for faculty members)
export const FacultySchema = pgTable(
  "faculty",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => UserSchema.id, { onDelete: "cascade" }),
    employeeId: text("employee_id").notNull().unique(),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => DepartmentSchema.id),
    position: varchar("position", {
      enum: ["professor", "associate_professor", "assistant_professor", "lecturer", "instructor", "visiting_professor"],
    }).notNull(),
    specializations: json("specializations").$type<string[]>().default([]),
    officeLocation: text("office_location"),
    officeHours: json("office_hours").$type<{
      day: string;
      startTime: string;
      endTime: string;
    }[]>().default([]),
    contactPhone: text("contact_phone"),
    researchInterests: text("research_interests"),
    qualifications: json("qualifications").$type<{
      degree: string;
      institution: string;
      year: number;
    }[]>().default([]),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("faculty_user_idx").on(table.userId),
    index("faculty_department_idx").on(table.departmentId),
    index("faculty_position_idx").on(table.position),
  ],
);

// Course instructors junction table
export const CourseInstructorSchema = pgTable(
  "course_instructor",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => CourseSchema.id, { onDelete: "cascade" }),
    facultyId: uuid("faculty_id")
      .notNull()
      .references(() => FacultySchema.id, { onDelete: "cascade" }),
    semester: text("semester").notNull(),
    role: varchar("role", {
      enum: ["primary", "assistant", "lab_instructor", "grader"],
    }).notNull().default("primary"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    unique().on(table.courseId, table.facultyId, table.semester),
    index("instructor_course_idx").on(table.courseId),
    index("instructor_faculty_idx").on(table.facultyId),
    index("instructor_semester_idx").on(table.semester),
  ],
);

// Class schedules table
export const ClassScheduleSchema = pgTable(
  "class_schedule",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => CourseSchema.id, { onDelete: "cascade" }),
    semester: text("semester").notNull(),
    dayOfWeek: varchar("day_of_week", {
      enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    }).notNull(),
    startTime: text("start_time").notNull(), // HH:MM format
    endTime: text("end_time").notNull(), // HH:MM format
    roomLocation: text("room_location"),
    buildingName: text("building_name"),
    classType: varchar("class_type", {
      enum: ["lecture", "lab", "tutorial", "seminar"],
    }).notNull().default("lecture"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("schedule_course_idx").on(table.courseId),
    index("schedule_day_idx").on(table.dayOfWeek),
    index("schedule_semester_idx").on(table.semester),
    index("schedule_room_idx").on(table.roomLocation),
  ],
);

// Academic calendar table
export const AcademicCalendarSchema = pgTable(
  "academic_calendar",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    semester: text("semester").notNull().unique(), // e.g., "2024-fall"
    academicYear: text("academic_year").notNull(), // e.g., "2024-2025"
    semesterName: text("semester_name").notNull(), // e.g., "Fall 2024"
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    registrationStartDate: date("registration_start_date"),
    registrationEndDate: date("registration_end_date"),
    addDropDeadline: date("add_drop_deadline"),
    midtermWeek: integer("midterm_week"), // Week number
    finalsStartDate: date("finals_start_date"),
    finalsEndDate: date("finals_end_date"),
    graduationDate: date("graduation_date"),
    isActive: boolean("is_active").notNull().default(false),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("calendar_semester_idx").on(table.semester),
    index("calendar_academic_year_idx").on(table.academicYear),
    index("calendar_active_idx").on(table.isActive),
  ],
);

// Announcements table
export const AnnouncementSchema = pgTable(
  "announcement",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    courseId: uuid("course_id").references(() => CourseSchema.id, { onDelete: "cascade" }),
    departmentId: uuid("department_id").references(() => DepartmentSchema.id, { onDelete: "cascade" }),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => UserSchema.id),
    targetAudience: varchar("target_audience", {
      enum: ["all", "students", "faculty", "course_specific", "department_specific"],
    }).notNull().default("all"),
    priority: varchar("priority", {
      enum: ["low", "medium", "high", "urgent"],
    }).notNull().default("medium"),
    isActive: boolean("is_active").notNull().default(true),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("announcement_course_idx").on(table.courseId),
    index("announcement_department_idx").on(table.departmentId),
    index("announcement_target_idx").on(table.targetAudience),
    index("announcement_priority_idx").on(table.priority),
    index("announcement_active_idx").on(table.isActive),
    index("announcement_created_by_idx").on(table.createdById),
  ],
);

// Assignments table
export const AssignmentSchema = pgTable(
  "assignment",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => CourseSchema.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    instructions: text("instructions"),
    assignmentType: varchar("assignment_type", {
      enum: ["homework", "project", "quiz", "exam", "presentation", "lab", "essay"],
    }).notNull(),
    totalPoints: decimal("total_points", { precision: 6, scale: 2 }).notNull(),
    dueDate: timestamp("due_date").notNull(),
    submissionType: varchar("submission_type", {
      enum: ["file_upload", "text_entry", "online_test", "in_person"],
    }).notNull().default("file_upload"),
    allowLateSubmission: boolean("allow_late_submission").notNull().default(false),
    lateSubmissionPenalty: decimal("late_submission_penalty", { precision: 5, scale: 2 }), // percentage
    weekNumber: integer("week_number"),
    moduleNumber: integer("module_number"),
    isPublished: boolean("is_published").notNull().default(false),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => UserSchema.id),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("assignment_course_idx").on(table.courseId),
    index("assignment_due_date_idx").on(table.dueDate),
    index("assignment_type_idx").on(table.assignmentType),
    index("assignment_week_idx").on(table.weekNumber),
    index("assignment_published_idx").on(table.isPublished),
  ],
);

// Assignment submissions table
export const AssignmentSubmissionSchema = pgTable(
  "assignment_submission",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => AssignmentSchema.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => UserSchema.id, { onDelete: "cascade" }),
    submissionText: text("submission_text"),
    fileUrl: text("file_url"),
    fileName: text("file_name"),
    fileSize: integer("file_size"),
    mimeType: text("mime_type"),
    grade: decimal("grade", { precision: 6, scale: 2 }),
    feedback: text("feedback"),
    isLateSubmission: boolean("is_late_submission").notNull().default(false),
    submittedAt: timestamp("submitted_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    gradedAt: timestamp("graded_at"),
    gradedById: uuid("graded_by_id").references(() => UserSchema.id),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    unique().on(table.assignmentId, table.studentId),
    index("submission_assignment_idx").on(table.assignmentId),
    index("submission_student_idx").on(table.studentId),
    index("submission_date_idx").on(table.submittedAt),
    index("submission_graded_idx").on(table.gradedAt),
  ],
);

// Attendance tracking table
export const AttendanceSchema = pgTable(
  "attendance",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => StudentEnrollmentSchema.id, { onDelete: "cascade" }),
    classDate: date("class_date").notNull(),
    status: varchar("status", {
      enum: ["present", "absent", "late", "excused"],
    }).notNull(),
    markedById: uuid("marked_by_id")
      .notNull()
      .references(() => UserSchema.id),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    unique().on(table.enrollmentId, table.classDate),
    index("attendance_enrollment_idx").on(table.enrollmentId),
    index("attendance_date_idx").on(table.classDate),
    index("attendance_status_idx").on(table.status),
  ],
);

// AI Processing Tables
// Track AI processing jobs for content analysis
export const AIProcessingJobSchema = pgTable(
  "ai_processing_job",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    courseMaterialId: uuid("course_material_id")
      .notNull()
      .references(() => CourseMaterialSchema.id, { onDelete: "cascade" }),
    jobType: varchar("job_type", {
      enum: ["pdf_processing", "video_transcription", "interactive_parsing", "text_analysis"],
    }).notNull(),
    status: varchar("status", {
      enum: ["pending", "processing", "completed", "failed"],
    }).notNull().default("pending"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    errorMessage: text("error_message"),
    metadata: json("metadata").default({}),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("ai_job_material_idx").on(table.courseMaterialId),
    index("ai_job_status_idx").on(table.status),
    index("ai_job_type_idx").on(table.jobType),
  ],
);

// Store AI processed content (extracted text, summaries, analysis)
export const AIProcessedContentSchema = pgTable(
  "ai_processed_content",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    courseMaterialId: uuid("course_material_id")
      .notNull()
      .references(() => CourseMaterialSchema.id, { onDelete: "cascade" }),
    extractedText: text("extracted_text"),
    aiSummary: text("ai_summary"),
    keyConcepts: json("key_concepts").$type<string[]>().default([]),
    difficulty: varchar("difficulty", {
      enum: ["beginner", "intermediate", "advanced"],
    }),
    estimatedReadTime: integer("estimated_read_time"), // in minutes
    wordCount: integer("word_count"),
    languageDetected: varchar("language_detected", { length: 10 }).default("en"),
    processingMetadata: json("processing_metadata").default({}),
    qualityScore: decimal("quality_score", { precision: 3, scale: 2 }), // 0.00 to 1.00
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    unique().on(table.courseMaterialId), // One processed content per material
    index("ai_content_material_idx").on(table.courseMaterialId),
    index("ai_content_difficulty_idx").on(table.difficulty),
  ],
);

// Store vector embeddings for semantic search
export const ContentEmbeddingSchema = pgTable(
  "content_embedding",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    courseMaterialId: uuid("course_material_id")
      .notNull()
      .references(() => CourseMaterialSchema.id, { onDelete: "cascade" }),
    aiProcessedId: uuid("ai_processed_id")
      .notNull()
      .references(() => AIProcessedContentSchema.id, { onDelete: "cascade" }),
    chunkText: text("chunk_text").notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    chunkType: varchar("chunk_type", {
      enum: ["content", "summary", "key_concept", "question"],
    }).notNull().default("content"),
    embedding: text("embedding").notNull(), // JSON string of vector array
    embeddingModel: varchar("embedding_model", { length: 100 }).default("nomic-embed-text"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("embedding_material_idx").on(table.courseMaterialId),
    index("embedding_processed_idx").on(table.aiProcessedId),
    index("embedding_type_idx").on(table.chunkType),
    index("embedding_chunk_idx").on(table.chunkIndex),
  ],
);

// ===============================
// SYSTEM MANAGEMENT SCHEMAS
// ===============================

// System settings table
export const SystemSettingsSchema = pgTable(
  "system_settings",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    category: varchar("category", { length: 50 }).notNull(), // university, academic, email, security, features, system
    key: varchar("key", { length: 100 }).notNull(),
    value: text("value"),
    valueType: varchar("value_type", {
      enum: ["string", "number", "boolean", "json"],
    }).notNull().default("string"),
    description: text("description"),
    isEditable: boolean("is_editable").notNull().default(true),
    isSecret: boolean("is_secret").notNull().default(false), // For sensitive values like passwords
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    unique().on(table.category, table.key),
    index("settings_category_idx").on(table.category),
    index("settings_key_idx").on(table.key),
  ],
);

// Calendar events table (more general than academic calendar)
export const CalendarEventSchema = pgTable(
  "calendar_event",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    title: text("title").notNull(),
    description: text("description"),
    eventType: varchar("event_type", {
      enum: ["academic", "registration", "exam", "holiday", "professional", "ceremony", "maintenance"],
    }).notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    startTime: text("start_time"), // HH:MM format
    endTime: text("end_time"), // HH:MM format
    isAllDay: boolean("is_all_day").notNull().default(false),
    location: text("location"),
    priority: varchar("priority", {
      enum: ["low", "medium", "high", "critical"],
    }).notNull().default("medium"),
    status: varchar("status", {
      enum: ["scheduled", "completed", "cancelled", "postponed"],
    }).notNull().default("scheduled"),
    affectedUsers: varchar("affected_users", {
      enum: ["all", "students", "faculty", "staff", "specific"],
    }).notNull().default("all"),
    courseId: uuid("course_id").references(() => CourseSchema.id),
    departmentId: uuid("department_id").references(() => DepartmentSchema.id),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => UserSchema.id),
    remindersEnabled: boolean("reminders_enabled").notNull().default(true),
    isRecurring: boolean("is_recurring").notNull().default(false),
    recurringPattern: json("recurring_pattern"), // For recurring events
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("calendar_event_type_idx").on(table.eventType),
    index("calendar_event_date_idx").on(table.startDate),
    index("calendar_event_priority_idx").on(table.priority),
    index("calendar_event_status_idx").on(table.status),
    index("calendar_event_users_idx").on(table.affectedUsers),
    index("calendar_event_course_idx").on(table.courseId),
    index("calendar_event_department_idx").on(table.departmentId),
  ],
);

// Reports configuration table
export const ReportConfigSchema = pgTable(
  "report_config",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    category: varchar("category", {
      enum: ["academic", "enrollment", "performance", "system", "financial", "research", "engagement"],
    }).notNull(),
    reportType: varchar("report_type", {
      enum: ["automated", "custom", "manual"],
    }).notNull().default("custom"),
    format: varchar("format", {
      enum: ["pdf", "excel", "csv", "json"],
    }).notNull().default("pdf"),
    schedule: varchar("schedule", {
      enum: ["manual", "daily", "weekly", "monthly", "quarterly", "semester", "yearly"],
    }).notNull().default("manual"),
    isActive: boolean("is_active").notNull().default(true),
    queryTemplate: text("query_template"), // SQL template for data extraction
    parameters: json("parameters").default({}), // Report parameters
    recipients: json("recipients").$type<string[]>().default([]), // Email recipients
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => UserSchema.id),
    lastGenerated: timestamp("last_generated"),
    nextScheduled: timestamp("next_scheduled"),
    generationCount: integer("generation_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("report_category_idx").on(table.category),
    index("report_type_idx").on(table.reportType),
    index("report_schedule_idx").on(table.schedule),
    index("report_active_idx").on(table.isActive),
    index("report_next_scheduled_idx").on(table.nextScheduled),
  ],
);

// Report instances table (tracks generated reports)
export const ReportInstanceSchema = pgTable(
  "report_instance",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    reportConfigId: uuid("report_config_id")
      .notNull()
      .references(() => ReportConfigSchema.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    filePath: text("file_path"),
    fileSize: integer("file_size"), // in bytes
    format: varchar("format", {
      enum: ["pdf", "excel", "csv", "json"],
    }).notNull(),
    generatedAt: timestamp("generated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    generatedById: uuid("generated_by_id")
      .notNull()
      .references(() => UserSchema.id),
    downloadCount: integer("download_count").notNull().default(0),
    isPublic: boolean("is_public").notNull().default(false),
    expiresAt: timestamp("expires_at"),
    metadata: json("metadata").default({}),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("report_instance_config_idx").on(table.reportConfigId),
    index("report_instance_generated_idx").on(table.generatedAt),
    index("report_instance_expires_idx").on(table.expiresAt),
  ],
);

export type McpServerEntity = typeof McpServerSchema.$inferSelect;
export type ChatThreadEntity = typeof ChatThreadSchema.$inferSelect;
export type ChatMessageEntity = typeof ChatMessageSchema.$inferSelect;

export type AgentEntity = typeof AgentSchema.$inferSelect;
export type UserEntity = typeof UserSchema.$inferSelect;
export type ToolCustomizationEntity =
  typeof McpToolCustomizationSchema.$inferSelect;
export type McpServerCustomizationEntity =
  typeof McpServerCustomizationSchema.$inferSelect;

export type ArchiveEntity = typeof ArchiveSchema.$inferSelect;
export type ArchiveItemEntity = typeof ArchiveItemSchema.$inferSelect;
export type BookmarkEntity = typeof BookmarkSchema.$inferSelect;

// Academic entity types
export type DepartmentEntity = typeof DepartmentSchema.$inferSelect;
export type CourseEntity = typeof CourseSchema.$inferSelect;
export type CourseWeekEntity = typeof CourseWeekSchema.$inferSelect;
export type CoursePrerequisiteEntity = typeof CoursePrerequisiteSchema.$inferSelect;
export type CourseMaterialEntity = typeof CourseMaterialSchema.$inferSelect;
export type StudentEnrollmentEntity = typeof StudentEnrollmentSchema.$inferSelect;
export type FacultyEntity = typeof FacultySchema.$inferSelect;
export type CourseInstructorEntity = typeof CourseInstructorSchema.$inferSelect;
export type ClassScheduleEntity = typeof ClassScheduleSchema.$inferSelect;
export type AcademicCalendarEntity = typeof AcademicCalendarSchema.$inferSelect;
export type AnnouncementEntity = typeof AnnouncementSchema.$inferSelect;
export type AssignmentEntity = typeof AssignmentSchema.$inferSelect;
export type AssignmentSubmissionEntity = typeof AssignmentSubmissionSchema.$inferSelect;
export type AttendanceEntity = typeof AttendanceSchema.$inferSelect;

// AI Processing entity types
export type AIProcessingJobEntity = typeof AIProcessingJobSchema.$inferSelect;
export type AIProcessedContentEntity = typeof AIProcessedContentSchema.$inferSelect;
export type ContentEmbeddingEntity = typeof ContentEmbeddingSchema.$inferSelect;

// System Management entity types
export type SystemSettingsEntity = typeof SystemSettingsSchema.$inferSelect;
export type CalendarEventEntity = typeof CalendarEventSchema.$inferSelect;
export type ReportConfigEntity = typeof ReportConfigSchema.$inferSelect;
export type ReportInstanceEntity = typeof ReportInstanceSchema.$inferSelect;
