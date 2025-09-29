-- MIVA University Academic Database - Dummy Data
-- Based on real COS202 course structure from content.md

-- Create database (run separately if needed)
-- CREATE DATABASE miva_academic;

-- Use the database
-- \c miva_academic;

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create faculty table
CREATE TABLE IF NOT EXISTS faculty (
    id SERIAL PRIMARY KEY,
    staff_id VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    title VARCHAR(10),
    email VARCHAR(255) UNIQUE NOT NULL,
    department_id INTEGER REFERENCES departments(id),
    office_location VARCHAR(255),
    office_hours TEXT,
    specialization TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    course_code VARCHAR(10) UNIQUE NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    description TEXT,
    credits INTEGER DEFAULT 3,
    level VARCHAR(10),
    semester VARCHAR(20),
    department_id INTEGER REFERENCES departments(id),
    coordinator_id INTEGER REFERENCES faculty(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create students table (simplified)
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    level VARCHAR(10),
    current_semester VARCHAR(20),
    department_id INTEGER REFERENCES departments(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    course_id INTEGER REFERENCES courses(id),
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    UNIQUE(student_id, course_id)
);

-- Create course_materials table
CREATE TABLE IF NOT EXISTS course_materials (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id),
    week_number INTEGER,
    title VARCHAR(255) NOT NULL,
    material_type VARCHAR(50) NOT NULL, -- video, pdf, url, worksheet
    description TEXT,
    file_url VARCHAR(500),
    file_size VARCHAR(20),
    pages INTEGER,
    duration VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    posted_by INTEGER REFERENCES faculty(id),
    posted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    priority VARCHAR(20) DEFAULT 'medium',
    category VARCHAR(50)
);

-- Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id),
    week_number INTEGER,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assignment_type VARCHAR(50), -- practice, graded, peer
    due_date TIMESTAMP,
    attempts_allowed INTEGER DEFAULT 1,
    time_limit VARCHAR(20),
    weight VARCHAR(10),
    status VARCHAR(20) DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert dummy data

-- Insert departments
INSERT INTO departments (code, name, description) VALUES
('COMP', 'School of Computing', 'Computer Science and related programs'),
('MATH', 'Department of Mathematics', 'Mathematics and Statistics programs'),
('ENG', 'School of Engineering', 'Engineering programs'),
('BUS', 'School of Business', 'Business and Management programs');

-- Insert faculty (based on content.md COS202 instructors)
INSERT INTO faculty (staff_id, first_name, last_name, title, email, department_id, office_location, office_hours, specialization) VALUES
('AI001', 'Augustus', 'Isichei', 'Dr.', 'a.isichei@miva.edu.ng', 1, 'Computing Building, Room 301', 'Monday/Wednesday 2:00-4:00 PM', 'Object-Oriented Programming, Software Engineering'),
('EO002', 'Emeka', 'Ogbuju', 'Dr.', 'e.ogbuju@miva.edu.ng', 1, 'Computing Building, Room 305', 'Tuesday/Thursday 1:00-3:00 PM', 'Algorithms, Data Structures'),
('EO003', 'Esther', 'Omonayin', 'Dr.', 'e.omonayin@miva.edu.ng', 1, 'Computing Building, Room 308', 'Monday/Friday 10:00-12:00 PM', 'GUI Programming, Human-Computer Interaction'),
('JW004', 'Jimin', 'Wuese', 'Dr.', 'j.wuese@miva.edu.ng', 1, 'Computing Building, Room 312', 'Wednesday/Friday 9:00-11:00 AM', 'Event-Driven Programming, Software Development'),
('SA005', 'Sarah', 'Johnson', 'Dr.', 's.johnson@miva.edu.ng', 1, 'Computing Building, Room 201', 'Tuesday/Thursday 2:00-4:00 PM', 'Introduction to Computer Science');

-- Insert courses
INSERT INTO courses (course_code, course_name, description, credits, level, semester, department_id, coordinator_id) VALUES
('COS202', 'Computer Programming II', 'Explore advanced object-oriented programming concepts, including polymorphism, abstract classes, and interfaces. Learn effective program organisation with packages and namespaces and utilise APIs for iterators, lists, stacks, and queues. Delve into searching, sorting, and recursive algorithms. Master event-driven programming, covering event-handling methods, propagation, and exception handling. Apply these skills to graphic user interface (GUI) programming for real-world applications.', 3, '200', 'Fall 2024', 1, 1),
('CS101', 'Introduction to Computer Science', 'Fundamental concepts of computer science and programming', 3, '100', 'Fall 2024', 1, 5),
('MATH201', 'Calculus II', 'Advanced calculus concepts including integration and series', 4, '200', 'Fall 2024', 2, NULL);

-- Insert sample students
INSERT INTO students (student_id, first_name, last_name, email, level, current_semester, department_id) VALUES
('MIVA2024001', 'John', 'Doe', 'j.doe@miva.edu.ng', '200', 'Fall 2024', 1),
('MIVA2024002', 'Jane', 'Smith', 'j.smith@miva.edu.ng', '200', 'Fall 2024', 1),
('MIVA2024003', 'Mike', 'Johnson', 'm.johnson@miva.edu.ng', '100', 'Fall 2024', 1);

-- Insert enrollments
INSERT INTO enrollments (student_id, course_id) VALUES
(1, 1), -- John Doe enrolled in COS202
(1, 3), -- John Doe enrolled in MATH201
(2, 1), -- Jane Smith enrolled in COS202
(3, 2); -- Mike Johnson enrolled in CS101

-- Insert course materials (based on content.md structure)
INSERT INTO course_materials (course_id, week_number, title, material_type, description, file_url, duration) VALUES
-- COS202 Week 1
(1, 1, 'Week 1: Introductory Video - Advanced Object-Oriented Programming', 'video', 'Introduction to advanced OOP concepts in C++', '/videos/cos202_week1_intro.mp4', '45 minutes'),
(1, 1, 'Week 1: Reading - Advanced Object-Oriented Programming', 'url', 'Comprehensive reading on advanced OOP concepts', 'https://external-resource.com/oop-advanced', NULL),

-- COS202 Week 2
(1, 2, 'Week 2: Video Lecture - Organising Class Hierarchies', 'video', 'Deep dive into class hierarchies and program organisation', '/videos/cos202_week2_lecture.mp4', '60 minutes'),
(1, 2, 'Organising Class Hierarchies(PDF)', 'pdf', 'PDF guide to organizing class hierarchies', '/materials/cos202_class_hierarchies.pdf', NULL),

-- COS202 Week 3
(1, 3, 'Week 3: Introductory Video - Utilising APIs: Implementing Iterators, Enumerators, Lists, Stacks, and Queues', 'video', 'Introduction to API utilization in C++', '/videos/cos202_week3_api.mp4', '50 minutes'),
(1, 3, 'Week 3: Interactive Content - Implementing Iterators, Enumerators, Lists, Stacks, and Queues', 'url', 'Interactive programming exercises', 'https://interactive.miva.edu.ng/cos202/week3', NULL),

-- COS202 Week 4
(1, 4, 'Week 4: Introductory Video - Search Algorithm', 'video', 'Introduction to search algorithms', '/videos/cos202_week4_search.mp4', '55 minutes'),
(1, 4, 'Worksheet - Search Algorithm', 'worksheet', 'Practice problems for search algorithms', '/materials/cos202_search_worksheet.pdf', NULL),
(1, 4, 'Week 4: Reading - Understanding Search Algorithms', 'url', 'External resource on search algorithm techniques', 'https://algorithm-guide.com/search-algorithms', NULL),

-- COS202 Week 5
(1, 5, 'Week 5: Introductory Video - Sorting Algorithms', 'video', 'Introduction to sorting algorithms', '/videos/cos202_week5_sorting.mp4', '52 minutes'),
(1, 5, 'Week 5: Reading - Understanding Common Sorting Techniques in C++.pdf', 'pdf', 'Comprehensive guide to sorting algorithms in C++', '/materials/cos202_sorting_techniques.pdf', NULL),

-- COS202 Week 6
(1, 6, 'Week 6: Video Lecture - Recursive Algorithms and Their Applications', 'video', 'Deep dive into recursive programming', '/videos/cos202_week6_recursion.mp4', '65 minutes'),
(1, 6, 'Week 6: Recursive Algorithms and Their Applications (PDF)', 'pdf', 'Detailed exploration of recursive programming techniques', '/materials/cos202_recursive_algorithms.pdf', NULL),

-- COS202 Week 7
(1, 7, 'Week 7: Introductory Video - Event-Driven Programming (A)', 'video', 'Part A: Fundamentals of event-driven programming', '/videos/cos202_week7_eventdriven_a.mp4', '35 minutes'),
(1, 7, 'Week 7: Introductory Video - Event-Driven Programming (B)', 'video', 'Part B: Advanced event-driven programming concepts', '/videos/cos202_week7_eventdriven_b.mp4', '40 minutes'),

-- COS202 Week 8
(1, 8, 'Week 8: Introductory Video - Exception Handling (A)', 'video', 'Introduction to exception handling', '/videos/cos202_week8_exception_a.mp4', '38 minutes'),
(1, 8, 'Week 8: Introductory Video - Exception Handling (B)', 'video', 'Advanced exception handling techniques', '/videos/cos202_week8_exception_b.mp4', '42 minutes'),
(1, 8, 'Week 8: Interactive Content - Exception Handling in C++', 'url', 'Interactive exception handling exercises', 'https://interactive.miva.edu.ng/cos202/week8', NULL),

-- COS202 Week 9
(1, 9, 'Week 9: Video Lecture - Introduction to GUI Programming in C++', 'video', 'Comprehensive introduction to GUI development in C++', '/videos/cos202_week9_gui.mp4', '75 minutes'),
(1, 9, 'Week 9: Introduction to GUI Programming in C++ (PDF)', 'pdf', 'GUI programming reference material', '/materials/cos202_gui_intro.pdf', NULL),
(1, 9, 'Week 9: Interactive Content - GUI in C++', 'url', 'Interactive GUI programming exercises', 'https://interactive.miva.edu.ng/cos202/week9', NULL),

-- COS202 Week 10
(1, 10, 'Week 10: Reading - Advanced GUI Techniques', 'url', 'Advanced GUI programming concepts', 'https://gui-advanced.miva.edu.ng/techniques', NULL),
(1, 10, 'Week 10: Worksheet - GUI', 'worksheet', 'GUI programming practice problems', '/materials/cos202_gui_worksheet.pdf', NULL),

-- COS202 Week 11
(1, 11, 'Week 11: Reading - GUI Components and Layout Management', 'url', 'Comprehensive guide to GUI components', 'https://gui-components.miva.edu.ng/layouts', NULL),
(1, 11, 'Week 11: Interactive Content - Advanced Techniques for Interactive Applications with MVC', 'url', 'MVC pattern in GUI applications', 'https://interactive.miva.edu.ng/cos202/week11', NULL),

-- COS202 Week 12
(1, 12, 'Week 12: Video Lecture - GUI Applications and Project Development', 'video', 'Final project guidance and advanced GUI concepts', '/videos/cos202_week12_projects.mp4', '70 minutes'),
(1, 12, 'Week 12: GUI Applications and Project Development (PDF)', 'pdf', 'Project development guidelines', '/materials/cos202_project_guide.pdf', NULL);

-- Insert course announcements
INSERT INTO announcements (course_id, title, content, posted_by, posted_date, priority, category) VALUES
(1, 'Welcome to COS 202 - Computer Programming II', 'Welcome to the Fall 2024 semester! Please review the course syllabus and complete the pre-semester test to establish your baseline knowledge.', 1, '2024-08-15 09:00:00', 'high', 'general'),
(1, 'Mid-Semester Assessment Schedule', 'The Mid-Semester Assessment will be available from August 24-27, 2025. You have two attempts to complete this graded assessment. Please manage your time wisely.', 2, '2024-08-20 14:30:00', 'high', 'assessment'),
(1, 'Office Hours Available', 'Faculty office hours are now available for booking. Click the office hours link in course materials to schedule your session with any instructor.', 3, '2024-08-18 11:00:00', 'medium', 'support'),
(1, 'Week 4 Discussion Forum Active', 'The Week 4 discussion forum is now open. Please participate in the discussion about search algorithms and their applications in different data structures.', 4, '2024-09-01 10:00:00', 'medium', 'discussion'),
(1, 'Live Lessons Schedule Updated', 'Live lesson sessions have been scheduled for all weeks. Check your course materials for the "Tailoring Live Lessons" form to specify your learning needs.', 1, '2024-08-25 16:00:00', 'medium', 'schedule');

-- Insert assignments (based on content.md structure)
INSERT INTO assignments (course_id, week_number, title, description, assignment_type, due_date, attempts_allowed, time_limit, weight) VALUES
-- Pre-semester
(1, NULL, 'Pre-Semester Test (Ungraded)', 'This is a quiz administered before you begin your weekly modules. This pre-test will help you establish a baseline for your knowledge before actual learning commences. Note: The scores for this test will NOT count towards your CA or exam scores.', 'practice', '2025-05-05 23:59:00', 1, '45 minutes', '0%'),

-- Weekly practice assessments
(1, 1, 'Week 1: Practice Assessment (Ungraded)', 'Practice quiz to review advanced OOP concepts. Two attempts allowed. Take your time to read each question before selecting an answer.', 'practice', '2025-05-05 23:59:00', 2, '60 minutes', '0%'),
(1, 2, 'Week 2: Practice Assessment (Ungraded)', 'Practice quiz on class hierarchies and program organization. Two attempts allowed.', 'practice', '2025-05-05 23:59:00', 2, '60 minutes', '0%'),
(1, 3, 'Week 3: Practice Assessment (Ungraded)', 'Practice quiz on API utilization. Two attempts allowed.', 'practice', '2025-05-05 23:59:00', 2, '60 minutes', '0%'),
(1, 4, 'Week 4: Practice Assessment (Ungraded)', 'Practice quiz on search algorithms. Two attempts allowed.', 'practice', '2025-05-05 23:59:00', 2, '60 minutes', '0%'),

-- Peer assessment
(1, 2, 'Peer-to-Peer Assessment (Ungraded)', 'Discuss the concept of polymorphism in C++ with a focus on both compile-time and runtime polymorphism. You will evaluate the work of 2-3 assigned peers after you have submitted your work.', 'peer', '2025-10-24 23:59:00', 1, 'N/A', '0%'),

-- Graded assessments
(1, NULL, 'Mid-Semester Assessment (Graded)', 'Graded assessment covering Weeks 1-4. Two attempts allowed. Each attempt is timed. The highest score from your two attempts will be recorded as your Continuous Assessment (CA) mark.', 'graded', '2025-08-27 23:59:00', 2, '120 minutes', '30%'),
(1, NULL, 'End of Semester Assessment (Graded)', 'Comprehensive assessment covering all course material. Two attempts allowed. This assessment contributes to your final score.', 'graded', '2025-08-27 23:59:00', 2, '180 minutes', '30%'),

-- Post-semester
(1, NULL, 'Post-Semester Test (Ungraded)', 'Post-course assessment to measure learning outcomes. Scores will NOT count towards your final grade.', 'practice', '2025-05-05 23:59:00', 1, '60 minutes', '0%');

-- Update file_size and pages for PDF materials
UPDATE course_materials SET file_size = '2.5 MB', pages = 24 WHERE title LIKE '%Class Hierarchies%';
UPDATE course_materials SET file_size = '1.2 MB', pages = 8 WHERE title LIKE '%Worksheet - Search%';
UPDATE course_materials SET file_size = '3.1 MB', pages = 32 WHERE title LIKE '%Sorting Techniques%';
UPDATE course_materials SET file_size = '2.8 MB', pages = 28 WHERE title LIKE '%Recursive Algorithms%PDF%';
UPDATE course_materials SET file_size = '2.2 MB', pages = 18 WHERE title LIKE '%GUI Programming%PDF%';
UPDATE course_materials SET file_size = '1.8 MB', pages = 12 WHERE title LIKE '%Project Development%PDF%';
UPDATE course_materials SET file_size = '0.9 MB', pages = 6 WHERE title LIKE '%Worksheet - GUI%';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_course_materials_course_week ON course_materials(course_id, week_number);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_announcements_course ON announcements(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(course_id);

-- Verify data insertion
SELECT 'Departments' as table_name, COUNT(*) as count FROM departments
UNION ALL
SELECT 'Faculty', COUNT(*) FROM faculty
UNION ALL
SELECT 'Courses', COUNT(*) FROM courses
UNION ALL
SELECT 'Students', COUNT(*) FROM students
UNION ALL
SELECT 'Enrollments', COUNT(*) FROM enrollments
UNION ALL
SELECT 'Course Materials', COUNT(*) FROM course_materials
UNION ALL
SELECT 'Announcements', COUNT(*) FROM announcements
UNION ALL
SELECT 'Assignments', COUNT(*) FROM assignments;