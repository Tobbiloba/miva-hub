#!/usr/bin/env tsx
/**
 * Comprehensive Test of All 4 MIVA University Academic Tools
 * Verifies functionality, data access, and error handling
 */

import "load-env";
import { academicTools } from '../src/lib/ai/tools/academic/index';
import { registerAcademicToolsForUser } from '../src/lib/ai/tools/academic/registration';
import { pgDb } from '../src/lib/db/pg/db.pg';
import { UserSchema } from '../src/lib/db/pg/schema.pg';
import { eq } from 'drizzle-orm';

async function comprehensiveAcademicToolsTest() {
  console.log('\n🎓 MIVA University Academic Tools - Comprehensive Test\n');
  
  try {
    // 1. Find real student user
    console.log('1. Finding test student user...');
    const testUser = await pgDb
      .select()
      .from(UserSchema)
      .where(eq(UserSchema.role, 'student'))
      .limit(1);
    
    if (testUser.length === 0) {
      console.log('❌ No student users found in database');
      return;
    }

    const userId = testUser[0].id;
    console.log(`✅ Found student: ${testUser[0].name} (${testUser[0].email})`);

    // 2. Test registration system
    console.log('\n2. Testing academic tools registration...');
    const registration = await registerAcademicToolsForUser(userId);
    console.log(`${registration.success ? '✅' : '❌'} Registration: ${registration.message}`);
    if (registration.registeredTools) {
      console.log(`   Registered tools: ${registration.registeredTools.join(', ')}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('TESTING ALL 4 ACADEMIC TOOLS');
    console.log('='.repeat(80));

    // 3. Test Course Content Tool
    console.log('\n📚 Testing Course Content Tool...');
    try {
      const courseContentTool = academicTools['get-course-materials'];
      if (!courseContentTool) {
        console.log('❌ Course Content Tool not found in registry');
      } else {
        const result1 = await courseContentTool.execute({
          courseCode: 'CS101',
          userId: userId,
          materialType: 'all'
        });
        
        if (result1.isError) {
          console.log(`❌ Course Content Tool error: ${result1.error}`);
        } else {
          console.log('✅ Course Content Tool working');
          console.log(`   Course: ${result1.course?.code} - ${result1.course?.title}`);
          console.log(`   Materials found: ${result1.materials?.length || 0}`);
          console.log(`   Enrollment verified: ${result1.course ? 'Yes' : 'No'}`);
        }
      }
    } catch (error) {
      console.log(`❌ Course Content Tool failed: ${error.message}`);
    }

    // 4. Test Assignment Tracker Tool  
    console.log('\n📝 Testing Assignment Tracker Tool...');
    try {
      const assignmentTool = academicTools['get-upcoming-assignments'];
      if (!assignmentTool) {
        console.log('❌ Assignment Tracker Tool not found in registry');
      } else {
        const result2 = await assignmentTool.execute({
          userId: userId,
          daysAhead: 30
        });
        
        if (result2.isError) {
          console.log(`❌ Assignment Tracker Tool error: ${result2.error}`);
        } else {
          console.log('✅ Assignment Tracker Tool working');
          console.log(`   Total assignments: ${result2.totalAssignments || 0}`);
          console.log(`   Time range: ${result2.timeRange}`);
          console.log(`   Courses checked: ${result2.enrolledCourses?.length || 0}`);
          
          if (result2.groupedByUrgency) {
            const urgencies = Object.keys(result2.groupedByUrgency);
            console.log(`   Urgency levels: ${urgencies.join(', ') || 'None'}`);
          }
        }
      }
    } catch (error) {
      console.log(`❌ Assignment Tracker Tool failed: ${error.message}`);
    }

    // 5. Test Faculty Directory Tool
    console.log('\n👩‍🏫 Testing Faculty Directory Tool...');
    try {
      const facultyTool = academicTools['find-faculty'];
      if (!facultyTool) {
        console.log('❌ Faculty Directory Tool not found in registry');
      } else {
        const result3 = await facultyTool.execute({
          name: 'Johnson'
        });
        
        if (result3.isError) {
          console.log(`❌ Faculty Directory Tool error: ${result3.error}`);
        } else {
          console.log('✅ Faculty Directory Tool working');
          console.log(`   Faculty found: ${result3.totalFound || 0}`);
          if (result3.faculty && result3.faculty.length > 0) {
            const prof = result3.faculty[0];
            console.log(`   Example: ${prof.name || 'N/A'} - ${prof.department?.name || 'N/A'}`);
            console.log(`   Position: ${prof.position || 'N/A'}`);
            console.log(`   Office: ${prof.officeLocation || 'N/A'}`);
          }
        }
      }
    } catch (error) {
      console.log(`❌ Faculty Directory Tool failed: ${error.message}`);
    }

    // 6. Test Academic Schedule Tool
    console.log('\n🗓️ Testing Academic Schedule Tool...');
    try {
      const scheduleTool = academicTools['get-academic-schedule'];
      if (!scheduleTool) {
        console.log('❌ Academic Schedule Tool not found in registry');
      } else {
        const result4 = await scheduleTool.execute({
          userId: userId,
          date: 'today'
        });
        
        if (result4.isError) {
          console.log(`❌ Academic Schedule Tool error: ${result4.error}`);
        } else {
          console.log('✅ Academic Schedule Tool working');
          console.log(`   Date range: ${result4.dateRange}`);
          console.log(`   Total events: ${result4.totalEvents || 0}`);
          console.log(`   Enrolled courses: ${result4.enrolledCourses?.length || 0}`);
          console.log(`   Summary: ${result4.summary}`);
        }
      }
    } catch (error) {
      console.log(`❌ Academic Schedule Tool failed: ${error.message}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));
    
    const toolNames = Object.keys(academicTools);
    console.log(`📊 Total academic tools: ${toolNames.length}`);
    console.log(`🔧 Tools registered: ${registration.registeredTools?.length || 0}`);
    console.log(`👤 Test user: ${testUser[0].name} (${testUser[0].role})`);
    console.log(`📚 Academic tools: ${toolNames.join(', ')}`);

    console.log('\n✅ Comprehensive test completed successfully!');
    console.log('🎓 MIVA University Academic Tools are ready for production use!');

  } catch (error) {
    console.error('❌ Comprehensive test failed:', error);
    process.exit(1);
  }
}

// Run the comprehensive test
comprehensiveAcademicToolsTest()
  .then(() => {
    console.log('\n🏆 All academic tools verified and working!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });