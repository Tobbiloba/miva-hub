import "load-env";
import { pgAcademicRepository } from "lib/db/pg/repositories/academic-repository.pg";

console.log("🎯 Testing specific academic queries for MCP tool scenarios...");

async function testSpecificQueries() {
  try {
    // Test the exact scenario mentioned by the user: "fetch me week 4 materials for CS101"
    console.log("\n🔍 Testing: 'fetch me week 4 materials for CS101'");
    
    // 1. Get CS101 course
    const cs101 = await pgAcademicRepository.getCourseByCode("CS101");
    if (!cs101) {
      throw new Error("CS101 course not found!");
    }
    console.log(`✅ Found course: ${cs101.courseCode} - ${cs101.title}`);

    // 2. Get week 4 materials for CS101
    const week4Materials = await pgAcademicRepository.getCourseMaterials(cs101.id, 4);
    console.log(`✅ Found ${week4Materials.length} materials for CS101 Week 4:`);
    week4Materials.forEach((material, index) => {
      console.log(`   ${index + 1}. ${material.title} (${material.materialType})`);
      if (material.description) {
        console.log(`      Description: ${material.description}`);
      }
    });

    // 3. Test getting all materials for a course (useful for "show me all CS101 materials")
    console.log("\n🔍 Testing: 'show me all CS101 materials'");
    const allCS101Materials = await pgAcademicRepository.getCourseMaterials(cs101.id);
    console.log(`✅ Found ${allCS101Materials.length} total materials for CS101:`);
    
    const materialsByWeek = allCS101Materials.reduce((acc, material) => {
      const week = material.weekNumber || 0;
      if (!acc[week]) acc[week] = [];
      acc[week].push(material);
      return acc;
    }, {} as Record<number, typeof allCS101Materials>);

    Object.keys(materialsByWeek).sort((a, b) => Number(a) - Number(b)).forEach(week => {
      console.log(`   Week ${week}:`);
      materialsByWeek[Number(week)].forEach(material => {
        console.log(`     - ${material.title} (${material.materialType})`);
      });
    });

    // 4. Test getting course schedule (useful for "when is CS101?")
    console.log("\n🔍 Testing: 'when is CS101 this semester?'");
    const cs101Schedule = await pgAcademicRepository.getCourseSchedule(cs101.id, "2024-fall");
    console.log(`✅ CS101 Fall 2024 schedule (${cs101Schedule.length} sessions):`);
    cs101Schedule.forEach(session => {
      console.log(`   ${session.dayOfWeek.charAt(0).toUpperCase() + session.dayOfWeek.slice(1)}: ${session.startTime}-${session.endTime} in ${session.roomLocation}, ${session.buildingName} (${session.classType})`);
    });

    // 5. Test getting course announcements (useful for "any announcements for CS101?")
    console.log("\n🔍 Testing: 'any announcements for CS101?'");
    const cs101Announcements = await pgAcademicRepository.getAnnouncements(cs101.id);
    console.log(`✅ Found ${cs101Announcements.length} announcements for CS101:`);
    cs101Announcements.forEach(announcement => {
      console.log(`   📢 ${announcement.title} (${announcement.priority})`);
      console.log(`      ${announcement.content.substring(0, 100)}...`);
    });

    // 6. Test getting lecture materials specifically
    console.log("\n🔍 Testing: 'show me CS101 lecture materials'");
    const cs101Lectures = await pgAcademicRepository.getCourseMaterialsByType(cs101.id, "lecture");
    console.log(`✅ Found ${cs101Lectures.length} lecture materials for CS101:`);
    cs101Lectures.forEach((lecture, _index) => {
      console.log(`   Week ${lecture.weekNumber}: ${lecture.title}`);
    });

    // 7. Test getting assignments
    console.log("\n🔍 Testing: 'show me CS101 assignments'");
    const cs101Assignments = await pgAcademicRepository.getCourseMaterialsByType(cs101.id, "assignment");
    console.log(`✅ Found ${cs101Assignments.length} assignments for CS101:`);
    cs101Assignments.forEach(assignment => {
      console.log(`   Week ${assignment.weekNumber}: ${assignment.title}`);
    });

    // 8. Test getting current semester info
    console.log("\n🔍 Testing: 'what's the current semester?'");
    const currentSemester = await pgAcademicRepository.getActiveAcademicCalendar();
    if (currentSemester) {
      console.log(`✅ Current semester: ${currentSemester.semesterName}`);
      console.log(`   Period: ${currentSemester.startDate} to ${currentSemester.endDate}`);
      console.log(`   Registration: ${currentSemester.registrationStartDate} to ${currentSemester.registrationEndDate}`);
      console.log(`   Add/Drop deadline: ${currentSemester.addDropDeadline}`);
    }

    console.log("\n🎉 All specific query scenarios tested successfully!");
    console.log("✅ Ready for MCP tool implementation - all data access patterns work!");

  } catch (error) {
    console.error("❌ Error testing specific queries:", error);
    throw error;
  }
}

testSpecificQueries()
  .then(() => {
    console.log("✅ Specific queries test completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Specific queries test failed:", error);
    process.exit(1);
  });