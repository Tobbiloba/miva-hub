import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/server";
import { getFacultyInfo } from "@/lib/auth/faculty";
import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";
import { FacultySidebar } from "@/components/faculty/faculty-sidebar";
import { FacultyHeader } from "@/components/faculty/faculty-header";

export default async function FacultyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const facultyInfo = getFacultyInfo(session);

  // Redirect if not faculty
  if (!facultyInfo) {
    redirect("/sign-in");
  }

  // Get faculty database record for additional info
  let facultyRecord;
  try {
    facultyRecord = await pgAcademicRepository.getFacultyByUserId(facultyInfo.id);
    
    // If no faculty record exists, redirect to unauthorized
    if (!facultyRecord || !facultyRecord.isActive) {
      redirect("/unauthorized");
    }
  } catch (error) {
    console.error("Error fetching faculty record:", error);
    redirect("/unauthorized");
  }
  
  // At this point facultyRecord is guaranteed to exist and be active
  const activeFacultyRecord = facultyRecord!

  return (
    <div className="min-h-screen bg-background">
      <FacultyHeader 
        facultyInfo={facultyInfo} 
        facultyRecord={activeFacultyRecord} 
      />
      
      <div className="flex">
        <FacultySidebar 
          facultyInfo={facultyInfo}
          facultyRecord={activeFacultyRecord}
        />
        
        <main className="flex-1 p-6 ml-64">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}