import { NextRequest, NextResponse } from "next/server";
import { requireFaculty, checkCourseInstructorAccess } from "@/lib/auth/faculty";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { s3Service } from "@/lib/aws/s3-service";

export async function POST(request: NextRequest) {
  try {
    const sessionOrError = await requireFaculty();
    if (sessionOrError instanceof NextResponse) return sessionOrError;
    const session = sessionOrError;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const externalUrl = formData.get("externalUrl") as string | null;
    const courseId = formData.get("courseId") as string;
    const materialType = formData.get("materialType") as string;
    const weekNumber = formData.get("weekNumber") as string;
    const title = formData.get("title") as string;
    const description = (formData.get("description") as string) || "";

    if (!courseId || !materialType || !weekNumber || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify faculty teaches this course
    const hasAccess = await checkCourseInstructorAccess(session.user.id, courseId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You are not assigned to teach this course" },
        { status: 403 }
      );
    }

    // ── External URL mode ──────────────────────────────────────────
    if (externalUrl) {
      try {
        const parsed = new URL(externalUrl);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          return NextResponse.json({ error: "URL must use http:// or https://" }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
      }

      const insertedMaterial = await pgAcademicRepository.insertCourseMaterial({
        courseId,
        title,
        description,
        materialType: materialType as "syllabus" | "lecture" | "assignment" | "resource" | "reading" | "exam",
        weekNumber: parseInt(weekNumber),
        contentUrl: externalUrl,
        publicUrl: externalUrl,
        fileName: null,
        fileSize: null,
        mimeType: null,
        uploadedById: session.user.id,
      });

      return NextResponse.json(
        { message: "External URL added as material", materialId: insertedMaterial.id },
        { status: 201 }
      );
    }

    // ── File upload mode ───────────────────────────────────────────
    if (!file) {
      return NextResponse.json({ error: "Missing file or externalUrl" }, { status: 400 });
    }

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "video/mp4",
      "video/quicktime",
      "audio/mpeg",
      "audio/wav",
      "audio/x-m4a",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "File type not supported" }, { status: 400 });
    }

    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File size exceeds 100MB limit" }, { status: 400 });
    }

    const course = await pgAcademicRepository.getCourseById(courseId);
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const department = await pgAcademicRepository.getDepartmentById(course.departmentId);
    if (!department) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const semester = currentMonth >= 8 || currentMonth <= 1 ? `${currentYear}-fall` : `${currentYear}-spring`;

    const s3Key = s3Service.generateS3Key(
      {
        courseId: course.id,
        courseDepartment: department.code.toLowerCase(),
        courseCode: course.courseCode.toLowerCase(),
        semester,
        weekNumber: parseInt(weekNumber),
        materialType: materialType as any,
        uploadedBy: session.user.id,
        userRole: "faculty" as const,
      },
      file.name
    );

    const uploadResult = await s3Service.uploadFile(file, s3Key, {
      userId: session.user.id,
      userRole: "faculty",
      userEmail: session.user.email,
    });

    if (!uploadResult.success) {
      return NextResponse.json({ error: uploadResult.error || "Upload failed" }, { status: 500 });
    }

    const insertedMaterial = await pgAcademicRepository.insertCourseMaterial({
      courseId,
      title,
      description,
      materialType: materialType as "syllabus" | "lecture" | "assignment" | "resource" | "reading" | "exam",
      weekNumber: parseInt(weekNumber),
      fileName: file.name,
      contentUrl: uploadResult.s3Url,
      fileSize: file.size,
      mimeType: file.type,
      uploadedById: session.user.id,
    });

    const publicUrl = `/api/files/${insertedMaterial.id}`;
    await pgAcademicRepository.updateCourseMaterial(insertedMaterial.id, { publicUrl });

    return NextResponse.json({
      message: "File uploaded successfully",
      materialId: insertedMaterial.id,
      filename: file.name,
      publicUrl,
    });
  } catch (error) {
    console.error("Faculty upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload content" },
      { status: 500 }
    );
  }
}
