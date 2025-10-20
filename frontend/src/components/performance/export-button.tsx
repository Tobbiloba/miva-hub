"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet, FileJson, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { exportService, type PerformanceData, type ExportFormat } from "@/lib/services/export-service";

interface ExportButtonProps {
  data: PerformanceData;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ExportButton({ data, variant = "default", size = "default" }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    setExportingFormat(format);

    try {
      await exportService.exportAllData(data, format);
      toast.success(`Performance data exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error(`Failed to export as ${format.toUpperCase()}`);
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  };

  const handleConceptsExport = async () => {
    setIsExporting(true);
    setExportingFormat("csv");

    try {
      await exportService.exportConceptMasteryCSV(
        data.conceptMastery,
        data.studentName,
        data.courseCode
      );
      toast.success("Concept mastery data exported");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export concepts");
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  };

  const handleSessionsExport = async () => {
    setIsExporting(true);
    setExportingFormat("csv");

    try {
      await exportService.exportStudySessionsCSV(
        data.studySessions,
        data.studentName,
        data.courseCode
      );
      toast.success("Study sessions exported");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export sessions");
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isExporting}>
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Export Full Report</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleExport("pdf")}>
          <FileText className="mr-2 h-4 w-4" />
          <span>Export as PDF</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          <span>Export as CSV</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("json")}>
          <FileJson className="mr-2 h-4 w-4" />
          <span>Export as JSON</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel>Export Specific Data</DropdownMenuLabel>
        <DropdownMenuItem onClick={handleConceptsExport}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          <span>Concept Mastery (CSV)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSessionsExport}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          <span>Study Sessions (CSV)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ExportButton;
