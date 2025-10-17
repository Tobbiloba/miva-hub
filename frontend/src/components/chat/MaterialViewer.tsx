"use client";

import { PDFViewer } from '../media/PDFViewer';
import { VideoPlayer } from '../media/VideoPlayer';
import { Button } from 'ui/button';
import { X, Download, MessageCircle, BookOpen, Target } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader } from 'ui/dialog';

interface MaterialViewerProps {
  material: any;
  isOpen: boolean;
  onClose: () => void;
  onGenerateStudyGuide?: () => void;
  onCreateFlashcards?: () => void;
  onAskQuestion?: () => void;
}

export function MaterialViewer({ 
  material, 
  isOpen, 
  onClose, 
  onGenerateStudyGuide,
  onCreateFlashcards,
  onAskQuestion
}: MaterialViewerProps) {
  if (!material) return null;

  const getFileType = () => material.file_url.split('.').pop()?.toLowerCase();
  
  const renderContent = () => {
    const fileType = getFileType();
    
    switch (fileType) {
      case 'pdf':
        return <PDFViewer url={material.file_url} title={material.title} />;
      case 'mp4':
      case 'avi':
      case 'mov':
        return <VideoPlayer url={material.file_url} title={material.title} />;
      case 'mp3':
      case 'wav':
      case 'm4a':
        return (
          <div className="h-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-4">🎵</div>
              <h3 className="text-xl font-semibold mb-4">{material.title}</h3>
              <audio 
                controls 
                className="w-full mb-4"
                src={`/api/files/stream?url=${encodeURIComponent(material.file_url)}`}
              >
                Your browser does not support the audio element.
              </audio>
              <p className="text-gray-600 text-sm">
                Use the audio controls to play, pause, and adjust volume.
              </p>
            </div>
          </div>
        );
      case 'docx':
        return (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-xl font-semibold mb-4">{material.title}</h3>
              <p className="text-gray-600 mb-4">
                Word documents need to be downloaded to view their full content.
              </p>
              <Button
                onClick={() => window.open(`/api/files/stream?url=${encodeURIComponent(material.file_url)}`, '_blank')}
                className="mb-2"
              >
                <Download className="w-4 h-4 mr-2" />
                Download & Open
              </Button>
            </div>
          </div>
        );
      case 'pptx':
        return (
          <div className="h-full flex items-center justify-center bg-orange-50">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-4">{material.title}</h3>
              <p className="text-gray-600 mb-4">
                PowerPoint presentations need to be downloaded to view their full content.
              </p>
              <Button
                onClick={() => window.open(`/api/files/stream?url=${encodeURIComponent(material.file_url)}`, '_blank')}
                className="mb-2"
              >
                <Download className="w-4 h-4 mr-2" />
                Download & Open
              </Button>
            </div>
          </div>
        );
      default:
        return (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-4">📁</div>
              <h3 className="text-xl font-semibold mb-4">{material.title}</h3>
              <p className="text-gray-600 mb-4">
                Preview not available for this file type ({fileType?.toUpperCase()}).
              </p>
              <div className="space-y-2">
                <Button
                  onClick={() => window.open(`/api/files/stream?url=${encodeURIComponent(material.file_url)}`, '_blank')}
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download File
                </Button>
                <p className="text-xs text-gray-500">
                  File will open in a new tab or download to your device
                </p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full h-[90vh] p-0 flex flex-col">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between p-4 border-b bg-white rounded-t-lg">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate">{material.title}</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
              <span>Week {material.week_number}</span>
              <span>•</span>
              <span>{getFileType()?.toUpperCase()}</span>
              <span>•</span>
              <span>{material.material_type}</span>
            </div>
          </div>
          
          <Button 
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="ml-2"
          >
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>
        
        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
        
        {/* Footer with AI Summary and Actions */}
        <div className="border-t bg-gray-50 p-4 rounded-b-lg max-h-48 overflow-y-auto">
          {/* AI Summary */}
          {material.ai_summary && (
            <div className="mb-4">
              <h4 className="font-medium text-sm text-gray-700 mb-2">📋 AI Summary:</h4>
              <p className="text-sm text-gray-600 leading-relaxed bg-white p-3 rounded border">
                {material.ai_summary}
              </p>
            </div>
          )}

          {/* Key Concepts */}
          {material.key_concepts && material.key_concepts.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-sm text-gray-700 mb-2">🔑 Key Concepts:</h4>
              <div className="flex flex-wrap gap-1">
                {material.key_concepts.slice(0, 12).map((concept: string, index: number) => (
                  <span 
                    key={index}
                    className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs"
                  >
                    {concept}
                  </span>
                ))}
                {material.key_concepts.length > 12 && (
                  <span className="text-xs text-gray-500 px-2 py-1">
                    +{material.key_concepts.length - 12} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => window.open(`/api/files/stream?url=${encodeURIComponent(material.file_url)}`, '_blank')}
              size="sm"
              variant="outline"
              className="hover:bg-gray-100"
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
            
            {onGenerateStudyGuide && (
              <Button
                onClick={onGenerateStudyGuide}
                size="sm"
                variant="outline"
                className="hover:bg-green-50 hover:text-green-700 hover:border-green-300"
              >
                <BookOpen className="w-4 h-4 mr-1" />
                Study Guide
              </Button>
            )}
            
            {onCreateFlashcards && (
              <Button
                onClick={onCreateFlashcards}
                size="sm"
                variant="outline"
                className="hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300"
              >
                <Target className="w-4 h-4 mr-1" />
                Flashcards
              </Button>
            )}
            
            {onAskQuestion && (
              <Button
                onClick={onAskQuestion}
                size="sm"
                variant="outline"
                className="hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                Ask Question
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}