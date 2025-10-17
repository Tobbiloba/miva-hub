"use client";
import { useCallback, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  Upload, 
  X, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  File,
  Video,
  Music
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadItem {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
}

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  maxSize?: number; // in MB
  disabled?: boolean;
}

const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'video/mp4': ['.mp4'],
  'video/quicktime': ['.mov'],
  'video/x-msvideo': ['.avi'],
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/x-m4a': ['.m4a'],
};

export function FileUploadZone({ 
  onFilesSelected, 
  accept = Object.keys(ACCEPTED_FILE_TYPES).join(','),
  maxSize = 100, // 100MB default
  disabled = false 
}: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<FileUploadItem[]>([]);

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('video/')) return Video;
    if (file.type.startsWith('audio/')) return Music;
    if (file.type === 'application/pdf') return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return `File size exceeds ${maxSize}MB limit`;
    }

    // Check file type
    const isValidType = Object.keys(ACCEPTED_FILE_TYPES).includes(file.type);
    if (!isValidType) {
      return 'File type not supported';
    }

    return null;
  };

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const newUploadItems: FileUploadItem[] = [];

    fileArray.forEach((file) => {
      const error = validateFile(file);
      const id = `${file.name}-${Date.now()}`;
      
      if (error) {
        newUploadItems.push({
          file,
          id,
          status: 'error',
          progress: 0,
          error,
        });
      } else {
        validFiles.push(file);
        newUploadItems.push({
          file,
          id,
          status: 'pending',
          progress: 0,
        });
      }
    });

    setUploadedFiles((prev) => [...prev, ...newUploadItems]);
    
    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  }, [onFilesSelected, maxSize]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    handleFiles(files);
  }, [handleFiles, disabled]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFiles(files);
    }
  }, [handleFiles]);

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((item) => item.id !== id));
  };

  // const updateFileStatus = (id: string, status: FileUploadItem['status'], progress = 0, error?: string) => {
  //   setUploadedFiles((prev) => prev.map(item => 
  //     item.id === id ? { ...item, status, progress, error } : item
  //   ));
  // };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <Card
        className={cn(
          "border-2 border-dashed transition-all duration-200",
          isDragOver && !disabled && "border-primary bg-primary/5 scale-[1.02]",
          !disabled && "cursor-pointer hover:border-primary/50 hover:bg-muted/30",
          disabled && "opacity-50 cursor-not-allowed border-muted-foreground/30"
        )}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onClick={() => {
          if (!disabled) {
            document.getElementById('file-input')?.click();
          }
        }}
      >
        <CardContent className="p-8 text-center">
          <Upload className={cn(
            "mx-auto h-12 w-12 mb-4 transition-colors",
            disabled ? "text-muted-foreground/50" : "text-primary"
          )} />
          <h3 className={cn(
            "text-lg font-semibold mb-2",
            disabled && "text-muted-foreground"
          )}>
            {disabled ? "Complete form to upload" : "Upload Course Materials"}
          </h3>
          <p className={cn(
            "mb-4",
            disabled ? "text-muted-foreground/70" : "text-muted-foreground"
          )}>
            {disabled 
              ? "Please fill in all required fields above" 
              : "Drag and drop files here, or click to browse"
            }
          </p>
          
          {!disabled && (
            <Button 
              variant="outline" 
              className="mb-4"
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Choose Files
            </Button>
          )}
          
          <p className="text-sm text-muted-foreground">
            Supports PDF, DOCX, PPTX, MP4, MOV, AVI, MP3, WAV files up to {maxSize}MB
          </p>
          <input
            id="file-input"
            type="file"
            multiple
            accept={accept}
            onChange={handleFileInput}
            className="hidden"
            disabled={disabled}
          />
        </CardContent>
      </Card>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h4 className="text-lg font-semibold mb-4">Uploaded Files</h4>
            <div className="space-y-3">
              {uploadedFiles.map((item) => {
                const Icon = getFileIcon(item.file);
                return (
                  <div key={item.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Icon className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(item.file.size)}
                      </p>
                      {item.status === 'uploading' || item.status === 'processing' ? (
                        <Progress value={item.progress} className="mt-2" />
                      ) : null}
                      {item.error && (
                        <p className="text-xs text-destructive mt-1">{item.error}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {item.status === 'pending' && (
                        <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                      )}
                      {item.status === 'uploading' && (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      )}
                      {item.status === 'processing' && (
                        <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                      )}
                      {item.status === 'completed' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {item.status === 'error' && (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(item.id)}
                        className="h-6 w-6"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}