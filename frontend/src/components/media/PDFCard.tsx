"use client";

import { useState, useMemo } from 'react';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  getVideoDisplayName, 
  formatVideoDate 
} from 'lib/video-utils';
import { AnimatePresence, motion } from 'framer-motion';
import { PDFViewer } from './PDFViewer';

interface PDFMaterial {
  id: string;
  title: string;
  file_url: string;
  upload_date: string;
  material_type?: string;
  description?: string;
  ai_summary?: string;
}

interface PDFCardProps {
  material: PDFMaterial;
  className?: string;
}

const variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    marginTop: 0,
    marginBottom: 0,
  },
  expanded: {
    height: "auto",
    opacity: 1,
    marginTop: "0.5rem",
    marginBottom: "0.5rem",
  },
};

export function PDFCard({ material, className }: PDFCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const pdfUrl = material.file_url;
  
  const displayName = useMemo(() => {
    return getVideoDisplayName(material);
  }, [material]);
  
  const formattedDate = useMemo(() => {
    return formatVideoDate(material.upload_date);
  }, [material.upload_date]);
  
  return (
    <div className={className}>
      <div
        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border cursor-pointer hover:bg-muted/70 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-background rounded-md">
            <FileText className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <div className="font-medium text-sm">{displayName}</div>
            <div className="text-xs text-muted-foreground">
              PDF • {formattedDate} • Click to {isExpanded ? 'collapse' : 'expand'}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {!isExpanded && (
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded-full">
              <FileText className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            </div>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="pdf-content"
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            variants={variants}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="mt-2 rounded-lg border bg-background p-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-1">{displayName}</h4>
                  <p className="text-xs text-muted-foreground">
                    Uploaded: {formattedDate}
                  </p>
                  {material.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {material.description}
                    </p>
                  )}
                </div>
                
                {material.ai_summary && (
                  <div className="border-t pt-3">
                    <h5 className="text-xs font-medium mb-2 text-muted-foreground">Summary</h5>
                    <p className="text-xs text-foreground leading-relaxed">
                      {material.ai_summary.length > 200 
                        ? `${material.ai_summary.substring(0, 200)}...` 
                        : material.ai_summary}
                    </p>
                  </div>
                )}
                
                <div className="h-[600px] border-t pt-2">
                  <PDFViewer url={pdfUrl} title={displayName} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
