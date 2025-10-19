"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PDFViewer } from "@/components/media/PDFViewer";
import { VideoPlayer } from "@/components/media/VideoPlayer";
import { Button } from "@/components/ui/button";
import { Download, FileText, Video, Music, File } from "lucide-react";

type CourseMaterialProps = {
  material_id?: string;
  title: string;
  file_url: string;
  material_type?: "resource" | "assignment" | "lecture" | "quiz" | "video" | "audio";
  week_number?: number;
  course_code?: string;
  course_name?: string;
  ai_summary?: string;
  key_concepts?: string[];
  description?: string;
  upload_date?: string;
};

export function CourseMaterial(props: CourseMaterialProps) {
  const getFileType = () => props.file_url.split('.').pop()?.toLowerCase() || '';
  const fileType = getFileType();

  const getIcon = () => {
    switch (fileType) {
      case 'pdf':
        return <FileText className="w-5 h-5" />;
      case 'mp4':
      case 'avi':
      case 'mov':
        return <Video className="w-5 h-5" />;
      case 'mp3':
      case 'wav':
      case 'm4a':
        return <Music className="w-5 h-5" />;
      default:
        return <File className="w-5 h-5" />;
    }
  };

  const renderContent = () => {
    switch (fileType) {
      case 'pdf':
        return (
          <div className="h-[600px] w-full">
            <PDFViewer url={props.file_url} title={props.title} />
          </div>
        );
      
      case 'mp4':
      case 'avi':
      case 'mov':
        return (
          <div className="w-full">
            <VideoPlayer url={props.file_url} title={props.title} />
          </div>
        );
      
      case 'mp3':
      case 'wav':
      case 'm4a':
        return (
          <div className="flex items-center justify-center py-8 bg-secondary/40 rounded-lg">
            <div className="text-center max-w-md px-6">
              <Music className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-4">{props.title}</h3>
              <audio 
                controls 
                className="w-full mb-4"
                src={`/api/files/stream?url=${encodeURIComponent(props.file_url)}`}
              >
                Your browser does not support the audio element.
              </audio>
              <p className="text-sm text-muted-foreground">
                Use the audio controls to play, pause, and adjust volume.
              </p>
            </div>
          </div>
        );
      
      case 'docx':
      case 'doc':
        return (
          <div className="flex items-center justify-center py-12 bg-secondary/40 rounded-lg">
            <div className="text-center max-w-md px-6">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-4">{props.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Word documents need to be downloaded to view their full content.
              </p>
              <Button
                onClick={() => window.open(`/api/files/stream?url=${encodeURIComponent(props.file_url)}`, '_blank')}
              >
                <Download className="w-4 h-4 mr-2" />
                Download & Open
              </Button>
            </div>
          </div>
        );
      
      case 'pptx':
      case 'ppt':
        return (
          <div className="flex items-center justify-center py-12 bg-secondary/40 rounded-lg">
            <div className="text-center max-w-md px-6">
              <File className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-4">{props.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                PowerPoint presentations need to be downloaded to view their full content.
              </p>
              <Button
                onClick={() => window.open(`/api/files/stream?url=${encodeURIComponent(props.file_url)}`, '_blank')}
              >
                <Download className="w-4 h-4 mr-2" />
                Download & Open
              </Button>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="flex items-center justify-center py-12 bg-secondary/40 rounded-lg">
            <div className="text-center max-w-md px-6">
              <File className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-4">{props.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Preview not available for this file type ({fileType?.toUpperCase()}).
              </p>
              <Button
                onClick={() => window.open(`/api/files/stream?url=${encodeURIComponent(props.file_url)}`, '_blank')}
              >
                <Download className="w-4 h-4 mr-2" />
                Download File
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className="mt-1">
                {getIcon()}
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">{props.title}</CardTitle>
                <CardDescription className="mt-1">
                  {props.course_code && <span className="font-medium">{props.course_code}</span>}
                  {props.course_name && props.course_code && " • "}
                  {props.course_name && <span>{props.course_name}</span>}
                  {props.week_number && (
                    <>
                      {(props.course_name || props.course_code) && " • "}
                      <span>Week {props.week_number}</span>
                    </>
                  )}
                  {props.material_type && (
                    <>
                      {(props.course_name || props.course_code || props.week_number) && " • "}
                      <span className="capitalize">{props.material_type}</span>
                    </>
                  )}
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/api/files/stream?url=${encodeURIComponent(props.file_url)}`, '_blank')}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>

      {(props.ai_summary || (props.key_concepts && props.key_concepts.length > 0)) && (
        <Card className="bg-secondary/40">
          <CardContent className="p-4 space-y-4">
            {props.ai_summary && (
              <div>
                <h4 className="font-medium text-sm mb-2">📋 AI Summary:</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {props.ai_summary}
                </p>
              </div>
            )}

            {props.key_concepts && props.key_concepts.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">🔑 Key Concepts:</h4>
                <div className="flex flex-wrap gap-2">
                  {props.key_concepts.map((concept, index) => (
                    <span 
                      key={index}
                      className="px-2 py-1 rounded-full text-xs bg-card border"
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
