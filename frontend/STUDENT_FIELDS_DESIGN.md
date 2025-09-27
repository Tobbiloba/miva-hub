# Student Extension Fields Design

## Fields to Add to UserSchema

### Core Academic Identity
```typescript
studentId: text("student_id").unique()
// University-assigned student ID
// Format: "SID123456" or "STU001234"
// UNIQUE constraint when not null
// Used for: Academic records, enrollment verification

major: text("major")
// Student's field of study
// Examples: "Computer Science", "Mathematics", "Biology", "Business Administration"
// Used for: Course recommendations, academic advisors, major-specific features

year: text("year")
// Academic level/classification
// Values: "freshman", "sophomore", "junior", "senior", "graduate", "doctoral"
// Used for: Course eligibility, graduation requirements, peer groups

role: text("role").default("student")
// User type in the academic system
// Values: "student", "faculty", "admin", "staff"
// Default: "student"
// Used for: Access control, feature availability, UI customization
```

### Academic Lifecycle
```typescript
academicYear: text("academic_year")
// Current academic year
// Format: "2024-2025", "2025-2026"
// Used for: Course schedules, academic calendar, semester context

enrollmentStatus: text("enrollment_status").default("active")
// Current enrollment status
// Values: "active", "inactive", "graduated", "suspended", "transferred"
// Default: "active"
// Used for: Access control, course enrollment eligibility

graduationDate: timestamp("graduation_date")
// Expected or actual graduation date
// Used for: Academic planning, alumni services, course sequencing
```

### Performance Considerations
```sql
-- Indexes for common queries
CREATE INDEX idx_user_student_id ON "user"(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX idx_user_role ON "user"(role);
CREATE INDEX idx_user_enrollment_status ON "user"(enrollment_status);
CREATE INDEX idx_user_academic_year ON "user"(academic_year);
CREATE INDEX idx_user_major ON "user"(major) WHERE major IS NOT NULL;
```

### Constraints & Validation
```sql
-- Role validation
ALTER TABLE "user" ADD CONSTRAINT check_role 
  CHECK (role IN ('student', 'faculty', 'admin', 'staff'));

-- Enrollment status validation  
ALTER TABLE "user" ADD CONSTRAINT check_enrollment_status
  CHECK (enrollment_status IN ('active', 'inactive', 'graduated', 'suspended', 'transferred'));

-- Academic year format validation (YYYY-YYYY pattern)
ALTER TABLE "user" ADD CONSTRAINT check_academic_year_format
  CHECK (academic_year IS NULL OR academic_year ~ '^\d{4}-\d{4}$');

-- Year validation
ALTER TABLE "user" ADD CONSTRAINT check_year
  CHECK (year IS NULL OR year IN ('freshman', 'sophomore', 'junior', 'senior', 'graduate', 'doctoral'));
```

### Migration Strategy
1. **Add fields as nullable** - Ensure backward compatibility
2. **Set defaults for new registrations** - Use application logic
3. **Populate existing users** - Set role='student', enrollmentStatus='active'
4. **Add constraints after data migration** - Ensure data integrity

### Type Definitions
```typescript
export type StudentRole = 'student' | 'faculty' | 'admin' | 'staff';
export type AcademicYear = 'freshman' | 'sophomore' | 'junior' | 'senior' | 'graduate' | 'doctoral';
export type EnrollmentStatus = 'active' | 'inactive' | 'graduated' | 'suspended' | 'transferred';

export interface StudentInfo {
  studentId?: string;
  major?: string;
  year?: AcademicYear;
  academicYear?: string; // "2024-2025"
  enrollmentStatus?: EnrollmentStatus;
  graduationDate?: Date;
}

export interface UserWithAcademicInfo extends UserEntity {
  studentId?: string;
  major?: string;
  year?: AcademicYear;
  role: StudentRole;
  academicYear?: string;
  enrollmentStatus?: EnrollmentStatus;
  graduationDate?: Date;
}
```

### Usage Examples
```typescript
// Student registration
const newStudent = {
  name: "John Doe",
  email: "john.doe@yourschool.edu",
  studentId: "SID123456",
  major: "Computer Science", 
  year: "sophomore",
  role: "student",
  academicYear: "2024-2025",
  enrollmentStatus: "active"
};

// Faculty member
const newFaculty = {
  name: "Dr. Jane Smith",
  email: "jane.smith@yourschool.edu", 
  role: "faculty",
  academicYear: "2024-2025",
  enrollmentStatus: "active"
};

// Query examples
const activeStudents = await db.select()
  .from(UserSchema)
  .where(and(
    eq(UserSchema.role, 'student'),
    eq(UserSchema.enrollmentStatus, 'active')
  ));

const csSophomores = await db.select()
  .from(UserSchema) 
  .where(and(
    eq(UserSchema.major, 'Computer Science'),
    eq(UserSchema.year, 'sophomore'),
    eq(UserSchema.enrollmentStatus, 'active')
  ));
```

This design ensures:
- ✅ Backward compatibility (all new fields are nullable)
- ✅ Performance optimization (appropriate indexes)
- ✅ Data integrity (constraints and validation)
- ✅ Flexibility (supports students, faculty, admin, staff)
- ✅ Academic context (major, year, academic calendar integration)