"use client";

import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileSpreadsheet,
  Search,
  Table2,
} from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "lib/utils";
import { Checkbox } from "ui/checkbox";
import { JsonViewPopup } from "../json-view-popup";
import { ToolCard, joinMeta } from "./tool-card";

// Column configuration interface
interface Column {
  key: string;
  label: string;
  type?: "string" | "number" | "date" | "boolean";
}

// Table component props interface
export interface InteractiveTableProps {
  title: string;
  description?: string;
  columns: Column[];
  data: Array<Record<string, any>>;
}

// Sort direction type
type SortDirection = "asc" | "desc" | null;

// Lazy load XLSX library from CDN
const loadXLSX = async () => {
  if (typeof window === "undefined") {
    throw new Error("XLSX can only be loaded in browser environment");
  }

  // Check if XLSX is already loaded
  if ((window as any).XLSX) {
    return (window as any).XLSX;
  }

  // Load XLSX from CDN
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
    script.onload = () => {
      if ((window as any).XLSX) {
        resolve((window as any).XLSX);
      } else {
        reject(new Error("Failed to load XLSX library"));
      }
    };
    script.onerror = () => reject(new Error("Failed to load XLSX script"));
    document.head.appendChild(script);
  });
};

export function InteractiveTable(props: InteractiveTableProps) {
  const { title, data, columns, description } = props;

  // Fixed settings for simplicity
  const pageSize = 20;
  const searchable = true;
  const exportable = true;

  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(columns.map((col) => col.key)),
  );

  // Helper function to format cell values based on column type
  const formatCellValue = (value: any, columnType: string = "string") => {
    if (value === null || value === undefined) return "";

    switch (columnType) {
      case "number":
        return typeof value === "number" ? value.toLocaleString() : value;
      case "boolean":
        return value ? "Yes" : "No";
      case "date":
        try {
          return new Date(value).toLocaleDateString();
        } catch {
          return value;
        }
      default:
        return String(value);
    }
  };

  // Highlight search terms in text
  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm || !text) return text;

    const regex = new RegExp(`(${searchTerm})`, "gi");
    const parts = String(text).split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="rounded-sm bg-brand/15 text-foreground">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = [...data];

    // Apply global search
    if (searchTerm && searchable) {
      filtered = filtered.filter((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase()),
        ),
      );
    }

    // Apply sorting based on column type
    if (sortColumn && sortDirection) {
      filtered.sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];
        const column = columns.find((col) => col.key === sortColumn);
        const columnType = column?.type || "string";

        let comparison = 0;

        switch (columnType) {
          case "number":
            comparison = Number(aValue || 0) - Number(bValue || 0);
            break;
          case "date":
            comparison =
              new Date(aValue || 0).getTime() - new Date(bValue || 0).getTime();
            break;
          case "boolean":
            comparison = (aValue ? 1 : 0) - (bValue ? 1 : 0);
            break;
          default:
            comparison = String(aValue || "").localeCompare(
              String(bValue || ""),
            );
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return filtered;
  }, [data, searchTerm, sortColumn, sortDirection]);

  // Pagination
  const totalPages =
    pageSize > 0 ? Math.ceil(processedData.length / pageSize) : 1;
  const paginatedData =
    pageSize > 0
      ? processedData.slice(
          (currentPage - 1) * pageSize,
          currentPage * pageSize,
        )
      : processedData;

  // Handle sorting (all columns are sortable by default)
  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(
        sortDirection === "asc"
          ? "desc"
          : sortDirection === "desc"
            ? null
            : "asc",
      );
      if (sortDirection === "desc") {
        setSortColumn(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection("asc");
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const visibleCols = columns.filter((col) => visibleColumns.has(col.key));
    const csvContent = [
      // Header
      visibleCols
        .map((col) => col.label)
        .join(","),
      // Data rows
      ...processedData.map((row) =>
        visibleCols
          .map((col) => `"${formatCellValue(row[col.key], col.type)}"`)
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.replace(/\s+/g, "_")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export to Excel (lazy load XLSX library)
  const exportToExcel = async () => {
    try {
      // Dynamically load XLSX from CDN
      const XLSX = await loadXLSX();

      const visibleCols = columns.filter((col) => visibleColumns.has(col.key));

      // Prepare data for Excel
      const excelData = [
        // Header row
        visibleCols.map((col) => col.label),
        // Data rows
        ...processedData.map((row) =>
          visibleCols.map((col) => {
            const value = row[col.key];
            // Convert formatted values back to raw values for Excel
            switch (col.type) {
              case "number":
                return typeof value === "number"
                  ? value
                  : Number(value) || value;
              case "date":
                return value instanceof Date ? value : new Date(value);
              case "boolean":
                return typeof value === "boolean" ? value : value;
              default:
                return value;
            }
          }),
        ),
      ];

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(excelData);

      // Auto-size columns
      const colWidths = visibleCols.map((col) => {
        const maxLength = Math.max(
          col.label.length,
          ...processedData.map(
            (row) =>
              String(formatCellValue(row[col.key], col.type) || "").length,
          ),
        );
        return { wch: Math.min(Math.max(maxLength + 2, 10), 50) };
      });
      worksheet["!cols"] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

      // Save file
      XLSX.writeFile(workbook, `${title.replace(/\s+/g, "_")}.xlsx`);
    } catch (error) {
      console.error("Failed to export Excel:", error);
      // Fallback to CSV if Excel export fails
      exportToCSV();
    }
  };

  const visibleColumnsArray = columns.filter((col) =>
    visibleColumns.has(col.key),
  );

  const isCentered = (type?: Column["type"]) =>
    type === "number" || type === "date" || type === "boolean";

  return (
    <ToolCard
      icon={<Table2 />}
      eyebrow="Table"
      title={title}
      meta={joinMeta(
        description,
        `${data.length} ${data.length === 1 ? "row" : "rows"}`,
      )}
      action={<JsonViewPopup data={props} />}
      bodyClassName="px-0 pb-0"
      footer={
        pageSize > 0 && totalPages > 1 ? (
          <div className="flex w-full items-center justify-between">
            <span className="text-xs text-muted-foreground tabular-nums">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full"
                aria-label="Previous page"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full"
                aria-label="Next page"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        ) : undefined
      }
    >
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-5 pb-3">
        {searchable && (
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 rounded-lg pl-9 text-sm"
            />
          </div>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground data-[state=open]:bg-accent"
            >
              <Eye />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {columns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.key}
                checked={visibleColumns.has(column.key)}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const newVisible = new Set(visibleColumns);
                  if (newVisible.has(column.key)) {
                    newVisible.delete(column.key);
                  } else {
                    newVisible.add(column.key);
                  }
                  setVisibleColumns(newVisible);
                }}
              >
                {column.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {exportable && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-muted-foreground data-[state=open]:bg-accent"
              >
                <Download />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToCSV}>
                <Download />
                CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToExcel}>
                <FileSpreadsheet />
                Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Table>
        <TableHeader className="border-t border-border bg-secondary/60">
          <TableRow className="hover:bg-transparent">
            {visibleColumnsArray.map((column) => {
              const active = sortColumn === column.key;
              return (
                <TableHead
                  key={column.key}
                  aria-sort={
                    active && sortDirection
                      ? sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                  className={cn(
                    "select-none first:pl-5 last:pr-5",
                    isCentered(column.type) && "text-center",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleSort(column.key)}
                    className={cn(
                      "inline-flex items-center gap-1 transition-colors hover:text-foreground",
                      active && "text-foreground",
                    )}
                  >
                    {column.label}
                    {active && sortDirection === "asc" ? (
                      <ArrowUp className="size-3" />
                    ) : active && sortDirection === "desc" ? (
                      <ArrowDown className="size-3" />
                    ) : (
                      <ArrowDownUp className="size-3 opacity-30" />
                    )}
                  </button>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>

        <TableBody>
          {paginatedData.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={visibleColumnsArray.length}
                className="h-32 text-center text-sm text-muted-foreground"
              >
                {searchTerm ? `Nothing matches "${searchTerm}"` : "No rows"}
              </TableCell>
            </TableRow>
          ) : (
            paginatedData.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {visibleColumnsArray.map((column) => (
                  <TableCell
                    key={column.key}
                    className={cn(
                      "first:pl-5 last:pr-5",
                      isCentered(column.type) && "text-center tabular-nums",
                    )}
                  >
                    {column.type === "boolean" ? (
                      <Checkbox
                        checked={Boolean(row[column.key])}
                        className="pointer-events-none"
                        aria-label={column.label}
                      />
                    ) : searchTerm && searchable ? (
                      highlightText(
                        formatCellValue(row[column.key], column.type),
                        searchTerm,
                      )
                    ) : (
                      formatCellValue(row[column.key], column.type)
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </ToolCard>
  );
}
