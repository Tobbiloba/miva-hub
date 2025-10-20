import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import Papa from "papaparse";

export type ExportFormat = "pdf" | "csv" | "json";

export interface PerformanceData {
  studentName: string;
  studentId: string;
  courseName: string;
  courseCode: string;
  semester: string;
  generatedAt: Date;
  weeklyPerformance: Array<{
    week: number;
    averageGrade: number;
    assignmentsCompleted: number;
    assignmentsTotal: number;
    studyTimeMinutes: number;
  }>;
  conceptMastery: Array<{
    concept: string;
    masteryLevel: number;
    attempts: number;
    lastPracticed: Date;
  }>;
  studySessions: Array<{
    type: string;
    duration: number;
    date: Date;
  }>;
  predictions: Array<{
    predictedGrade: number;
    confidence: number;
    date: Date;
  }>;
  summary: {
    overallGrade: number;
    completionRate: number;
    totalStudyTime: number;
    trend: "improving" | "declining" | "stable";
  };
}

export const exportService = {
  exportToPDF: async (data: PerformanceData): Promise<void> => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = 20;

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Student Performance Report", pageWidth / 2, yPos, { align: "center" });
    yPos += 15;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, yPos, {
      align: "center",
    });
    yPos += 15;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Student Information", margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${data.studentName}`, margin, yPos);
    yPos += 6;
    doc.text(`Student ID: ${data.studentId}`, margin, yPos);
    yPos += 6;
    doc.text(`Course: ${data.courseName} (${data.courseCode})`, margin, yPos);
    yPos += 6;
    doc.text(`Semester: ${data.semester}`, margin, yPos);
    yPos += 12;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Performance Summary", margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Overall Grade: ${data.summary.overallGrade.toFixed(2)}%`, margin, yPos);
    yPos += 6;
    doc.text(
      `Completion Rate: ${data.summary.completionRate.toFixed(2)}%`,
      margin,
      yPos
    );
    yPos += 6;
    doc.text(
      `Total Study Time: ${Math.round(data.summary.totalStudyTime / 60)} hours`,
      margin,
      yPos
    );
    yPos += 6;
    doc.text(
      `Trend: ${data.summary.trend.charAt(0).toUpperCase() + data.summary.trend.slice(1)}`,
      margin,
      yPos
    );
    yPos += 12;

    if (data.weeklyPerformance.length > 0) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Weekly Performance", margin, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [["Week", "Avg Grade", "Assignments", "Study Time (min)"]],
        body: data.weeklyPerformance.map((w) => [
          w.week,
          `${w.averageGrade.toFixed(2)}%`,
          `${w.assignmentsCompleted}/${w.assignmentsTotal}`,
          w.studyTimeMinutes,
        ]),
        theme: "striped",
        headStyles: { fillColor: [66, 66, 66] },
        margin: { left: margin, right: margin },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    if (data.conceptMastery.length > 0) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Concept Mastery", margin, yPos);
      yPos += 8;

      const top10Concepts = data.conceptMastery.slice(0, 10);

      autoTable(doc, {
        startY: yPos,
        head: [["Concept", "Mastery", "Attempts", "Last Practiced"]],
        body: top10Concepts.map((c) => [
          c.concept,
          `${(c.masteryLevel * 100).toFixed(0)}%`,
          c.attempts,
          new Date(c.lastPracticed).toLocaleDateString(),
        ]),
        theme: "striped",
        headStyles: { fillColor: [66, 66, 66] },
        margin: { left: margin, right: margin },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    if (data.predictions.length > 0 && yPos < 250) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Grade Predictions", margin, yPos);
      yPos += 8;

      const latestPrediction = data.predictions[0];
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Predicted Final Grade: ${latestPrediction.predictedGrade.toFixed(2)}%`,
        margin,
        yPos
      );
      yPos += 6;
      doc.text(
        `Confidence: ${(latestPrediction.confidence * 100).toFixed(0)}%`,
        margin,
        yPos
      );
      yPos += 6;
      doc.text(
        `Predicted on: ${new Date(latestPrediction.date).toLocaleDateString()}`,
        margin,
        yPos
      );
    }

    const fileName = `${data.studentName.replace(/\s+/g, "_")}_Performance_${data.courseCode}_${Date.now()}.pdf`;
    doc.save(fileName);
  },

  exportToCSV: async (data: PerformanceData): Promise<void> => {
    const csvData = data.weeklyPerformance.map((w) => ({
      Week: w.week,
      "Average Grade": w.averageGrade.toFixed(2),
      "Assignments Completed": w.assignmentsCompleted,
      "Total Assignments": w.assignmentsTotal,
      "Study Time (minutes)": w.studyTimeMinutes,
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const fileName = `${data.studentName.replace(/\s+/g, "_")}_Performance_${data.courseCode}_${Date.now()}.csv`;
    saveAs(blob, fileName);
  },

  exportToJSON: async (data: PerformanceData): Promise<void> => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const fileName = `${data.studentName.replace(/\s+/g, "_")}_Performance_${data.courseCode}_${Date.now()}.json`;
    saveAs(blob, fileName);
  },

  exportConceptMasteryCSV: async (
    conceptMastery: PerformanceData["conceptMastery"],
    studentName: string,
    courseCode: string
  ): Promise<void> => {
    const csvData = conceptMastery.map((c) => ({
      Concept: c.concept,
      "Mastery Level": (c.masteryLevel * 100).toFixed(2) + "%",
      Attempts: c.attempts,
      "Last Practiced": new Date(c.lastPracticed).toLocaleDateString(),
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const fileName = `${studentName.replace(/\s+/g, "_")}_Concepts_${courseCode}_${Date.now()}.csv`;
    saveAs(blob, fileName);
  },

  exportStudySessionsCSV: async (
    studySessions: PerformanceData["studySessions"],
    studentName: string,
    courseCode: string
  ): Promise<void> => {
    const csvData = studySessions.map((s) => ({
      Type: s.type,
      "Duration (minutes)": s.duration,
      Date: new Date(s.date).toLocaleString(),
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const fileName = `${studentName.replace(/\s+/g, "_")}_StudySessions_${courseCode}_${Date.now()}.csv`;
    saveAs(blob, fileName);
  },

  async exportAllData(data: PerformanceData, format: ExportFormat): Promise<void> {
    switch (format) {
      case "pdf":
        await this.exportToPDF(data);
        break;
      case "csv":
        await this.exportToCSV(data);
        break;
      case "json":
        await this.exportToJSON(data);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  },
};

export default exportService;
