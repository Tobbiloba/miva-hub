"use client";

import { useState } from "react";
import { FileText, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PDFViewerProps {
  src: string;
  title?: string;
  className?: string;
}

export function PDFViewer({ src, title, className = "" }: PDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setError("Failed to load PDF. The file might be corrupted or unavailable.");
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = title || 'document.pdf';
    link.click();
  };

  const handleOpenInNewTab = () => {
    window.open(src, '_blank');
  };

  if (error) {
    return (
      <div className={`border rounded-lg p-4 bg-muted/50 ${className}`}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <FileText className="h-4 w-4" />
          <span>{title || "Course Document"}</span>
        </div>
        <p className="text-sm text-destructive mb-3">{error}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleOpenInNewTab}>
            <ExternalLink className="h-3 w-3 mr-1" />
            Open in New Tab
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${className}`}>
      {title && (
        <div className="px-3 py-2 bg-muted/50 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="text-sm font-medium">{title}</span>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={handleOpenInNewTab}>
              <ExternalLink className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDownload}>
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
      
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50 h-96">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              Loading PDF...
            </div>
          </div>
        )}
        
        <iframe
          src={`${src}#toolbar=1&navpanes=1&scrollbar=1`}
          className="w-full h-96 border-0"
          onLoad={handleLoad}
          onError={handleError}
          title={title || "PDF Viewer"}
        />
      </div>
    </div>
  );
}