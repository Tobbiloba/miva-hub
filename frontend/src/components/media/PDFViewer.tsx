"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from 'ui/button';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Download,
  RotateCw,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface PDFViewerProps {
  url: string;
  title?: string;
}

export function PDFViewer({ url, title }: PDFViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string>('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (!url) return;
      
      if (url.startsWith('s3://')) {
        try {
          setIsLoadingUrl(true);
          const response = await fetch(`/api/files/signed-url?url=${encodeURIComponent(url)}`);
          const data = await response.json();
          
          if (data.signedUrl) {
            setResolvedUrl(data.signedUrl);
          } else {
            console.error('Failed to get signed URL:', data.error);
            setResolvedUrl(url);
          }
        } catch (error) {
          console.error('Error fetching signed URL:', error);
          setResolvedUrl(url);
        } finally {
          setIsLoadingUrl(false);
        }
      } else {
        setResolvedUrl(url);
        setIsLoadingUrl(false);
      }
    };
    
    fetchSignedUrl();
  }, [url]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(200, prev + 25));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(50, prev - 25));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleDownload = () => {
    const downloadLink = document.createElement('a');
    downloadLink.href = resolvedUrl;
    downloadLink.download = title || 'document.pdf';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const pdfUrl = resolvedUrl ? `${resolvedUrl}#page=${currentPage}&zoom=${zoom}&rotate=${rotation}` : '';

  return (
    <div className={`h-full flex flex-col bg-card ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* PDF Controls */}
      <div className="bg-card border-b p-2 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Page Navigation */}
          <div className="flex items-center space-x-2">
            <Button 
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              size="sm"
              variant="outline"
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={currentPage}
                onChange={(e) => setCurrentPage(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 px-2 py-1 text-sm border rounded text-center"
                min="1"
              />
              <span className="text-sm text-gray-600">/ ?</span>
            </div>
            <Button 
              onClick={() => setCurrentPage(currentPage + 1)}
              size="sm"
              variant="outline"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="h-6 w-px bg-gray-300" />

          {/* Zoom Controls */}
          <div className="flex items-center space-x-2">
            <Button 
              onClick={handleZoomOut}
              size="sm"
              variant="outline"
              disabled={zoom <= 50}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium w-12 text-center">{zoom}%</span>
            <Button 
              onClick={handleZoomIn}
              size="sm"
              variant="outline"
              disabled={zoom >= 200}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          <div className="h-6 w-px bg-gray-300" />

          {/* Rotation */}
          <Button 
            onClick={handleRotate}
            size="sm"
            variant="outline"
            title="Rotate 90°"
          >
            <RotateCw className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          {title && (
            <span className="text-sm font-medium text-gray-700 max-w-xs truncate">
              {title}
            </span>
          )}
          
          <Button 
            onClick={handleDownload}
            size="sm"
            variant="outline"
            className="hover:bg-green-50"
          >
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>

          <Button 
            onClick={toggleFullscreen}
            size="sm"
            variant="outline"
          >
            {isFullscreen ? 
              <Minimize2 className="w-4 h-4" /> : 
              <Maximize2 className="w-4 h-4" />
            }
          </Button>
        </div>
      </div>
      
      {/* PDF Embed */}
      <div className="flex-1 overflow-hidden bg-card">
        <iframe
          ref={iframeRef}
          src={pdfUrl}
          className="w-full h-full border-0"
          title={title || "PDF Viewer"}
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: 'center center'
          }}
        />
      </div>

      {/* Loading overlay */}
      <div className={`absolute inset-0 bg-card flex items-center justify-center ${isLoadingUrl ? '' : 'hidden'}`} id="pdf-loading">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading PDF...</p>
        </div>
      </div>
    </div>
  );
}