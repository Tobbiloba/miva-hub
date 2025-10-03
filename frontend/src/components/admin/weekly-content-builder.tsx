"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileUploadZone } from "@/components/admin/file-upload-zone";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Upload,
  FileText,
  Video,
  Image,
  Download,
  Trash2,
  Edit,
  Save,
  X,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  BookOpen,
  PenTool,
  Target,
  List,
  Paperclip
} from "lucide-react";
import { CourseWeekEntity, CourseMaterialEntity } from "@/lib/db/pg/schema.pg";

interface WeeklyContentBuilderProps {
  courseId: string;
  courseTitle: string;
  weekData: CourseWeekEntity;
  onWeekUpdate: (updatedWeek: CourseWeekEntity) => void;
}

interface ContentItem {
  id: string;
  title: string;
  type: 'video' | 'pdf' | 'image' | 'document' | 'quiz' | 'assignment';
  fileName: string;
  fileSize: number;
  uploadedAt: Date;
  isProcessed: boolean;
}

const MATERIAL_TYPES = [
  { value: "syllabus", label: "Syllabus", icon: FileText },
  { value: "lecture", label: "Lecture Notes", icon: BookOpen },
  { value: "assignment", label: "Assignment", icon: PenTool },
  { value: "resource", label: "Resource Material", icon: Paperclip },
  { value: "reading", label: "Required Reading", icon: FileText },
  { value: "exam", label: "Exam Material", icon: Target },
];

export function WeeklyContentBuilder({ 
  courseId, 
  courseTitle, 
  weekData, 
  onWeekUpdate 
}: WeeklyContentBuilderProps) {
  const [isEditingWeek, setIsEditingWeek] = useState(false);
  const [weekTitle, setWeekTitle] = useState(weekData.title);
  const [weekDescription, setWeekDescription] = useState(weekData.description || "");
  const [learningObjectives, setLearningObjectives] = useState<string[]>(
    weekData.learningObjectives ? JSON.parse(weekData.learningObjectives) : []
  );
  const [topics, setTopics] = useState<string[]>(
    weekData.topics ? JSON.parse(weekData.topics) : []
  );
  const [newObjective, setNewObjective] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const { toast } = useToast();

  // Load existing content for this week
  useEffect(() => {
    const loadWeekContent = async () => {
      try {
        const response = await fetch(`/api/admin/course-materials?courseId=${courseId}&weekNumber=${weekData.weekNumber}`);
        const data = await response.json();
        
        if (data.success) {
          const items: ContentItem[] = data.data.map((material: CourseMaterialEntity) => ({
            id: material.id,
            title: material.title,
            type: getContentType(material.materialType, material.fileName),
            fileName: material.fileName || "Unknown file",
            fileSize: material.fileSize || 0,
            uploadedAt: new Date(material.uploadedAt),
            isProcessed: material.isProcessed || false
          }));
          setContentItems(items);
        }
      } catch (error) {
        console.error('Error loading week content:', error);
        toast({
          title: "Error",
          description: "Failed to load week content",
          variant: "destructive"
        });
      } finally {
        setIsLoadingContent(false);
      }
    };

    loadWeekContent();
  }, [courseId, weekData.weekNumber]);

  const getContentType = (materialType: string, fileName: string): ContentItem['type'] => {
    if (materialType === 'assignment') return 'assignment';
    if (materialType === 'quiz') return 'quiz';
    
    const ext = fileName?.split('.').pop()?.toLowerCase();
    if (ext === 'mp4' || ext === 'avi' || ext === 'mov') return 'video';
    if (ext === 'pdf') return 'pdf';
    if (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'gif') return 'image';
    return 'document';
  };

  const getContentIcon = (type: ContentItem['type']) => {
    switch (type) {
      case 'video': return Video;
      case 'pdf': return FileText;
      case 'image': return Image;
      case 'quiz': return Target;
      case 'assignment': return PenTool;
      default: return FileText;
    }
  };

  const saveWeekDetails = async () => {
    try {
      const response = await fetch(`/api/admin/course-weeks/${weekData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: weekTitle,
          description: weekDescription,
          learningObjectives: JSON.stringify(learningObjectives),
          topics: JSON.stringify(topics)
        }),
      });

      const data = await response.json();
      if (data.success) {
        onWeekUpdate(data.data);
        setIsEditingWeek(false);
        toast({
          title: "Success",
          description: "Week details updated successfully"
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error updating week:', error);
      toast({
        title: "Error",
        description: "Failed to update week details",
        variant: "destructive"
      });
    }
  };

  const addLearningObjective = () => {
    if (newObjective.trim()) {
      setLearningObjectives([...learningObjectives, newObjective.trim()]);
      setNewObjective("");
    }
  };

  const removeLearningObjective = (index: number) => {
    setLearningObjectives(learningObjectives.filter((_, i) => i !== index));
  };

  const addTopic = () => {
    if (newTopic.trim()) {
      setTopics([...topics, newTopic.trim()]);
      setNewTopic("");
    }
  };

  const removeTopic = (index: number) => {
    setTopics(topics.filter((_, i) => i !== index));
  };

  const handleFilesSelected = async (files: File[]) => {
    setUploadingFiles(true);

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('courseId', courseId);
        formData.append('materialType', 'resource'); // Default type, can be changed later
        formData.append('weekNumber', weekData.weekNumber.toString());
        formData.append('title', file.name.split('.')[0]); // Use filename without extension as title

        const response = await fetch('/api/content/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        await response.json();
      }

      toast({
        title: "Success",
        description: `${files.length} file(s) uploaded successfully`
      });

      // Reload content
      window.location.reload();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload some files",
        variant: "destructive"
      });
    } finally {
      setUploadingFiles(false);
    }
  };

  const deleteContentItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/admin/course-materials/${itemId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setContentItems(contentItems.filter(item => item.id !== itemId));
        toast({
          title: "Success",
          description: "Content deleted successfully"
        });
      } else {
        throw new Error('Failed to delete content');
      }
    } catch (error) {
      console.error('Error deleting content:', error);
      toast({
        title: "Error",
        description: "Failed to delete content",
        variant: "destructive"
      });
    }
  };

  const contentProgress = Math.round((contentItems.filter(item => item.isProcessed).length / Math.max(contentItems.length, 1)) * 100);

  return (
    <div className="space-y-6">
      {/* Week Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {isEditingWeek ? (
                  <Input
                    value={weekTitle}
                    onChange={(e) => setWeekTitle(e.target.value)}
                    className="text-lg font-semibold"
                    placeholder="Week title..."
                  />
                ) : (
                  `Week ${weekData.weekNumber}: ${weekTitle}`
                )}
              </CardTitle>
              <CardDescription>
                {courseTitle} • {contentItems.length} content item(s)
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {isEditingWeek ? (
                <>
                  <Button onClick={saveWeekDetails} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsEditingWeek(false);
                      setWeekTitle(weekData.title);
                      setWeekDescription(weekData.description || "");
                    }} 
                    size="sm"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setIsEditingWeek(true)} size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Week
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        {(isEditingWeek || weekDescription) && (
          <CardContent>
            {isEditingWeek ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="week-description">Week Description</Label>
                  <Textarea
                    id="week-description"
                    value={weekDescription}
                    onChange={(e) => setWeekDescription(e.target.value)}
                    placeholder="Describe what students will learn this week..."
                    rows={3}
                  />
                </div>

                {/* Learning Objectives */}
                <div>
                  <Label>Learning Objectives</Label>
                  <div className="space-y-2">
                    {learningObjectives.map((objective, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Badge variant="secondary" className="flex-1 justify-start">
                          {objective}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLearningObjective(index)}
                            className="ml-2 h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        value={newObjective}
                        onChange={(e) => setNewObjective(e.target.value)}
                        placeholder="Add learning objective..."
                        onKeyPress={(e) => e.key === 'Enter' && addLearningObjective()}
                      />
                      <Button onClick={addLearningObjective} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Topics */}
                <div>
                  <Label>Topics Covered</Label>
                  <div className="space-y-2">
                    {topics.map((topic, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Badge variant="outline" className="flex-1 justify-start">
                          {topic}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTopic(index)}
                            className="ml-2 h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        value={newTopic}
                        onChange={(e) => setNewTopic(e.target.value)}
                        placeholder="Add topic..."
                        onKeyPress={(e) => e.key === 'Enter' && addTopic()}
                      />
                      <Button onClick={addTopic} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {weekDescription && (
                  <p className="text-muted-foreground">{weekDescription}</p>
                )}
                
                {learningObjectives.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Learning Objectives</h4>
                    <div className="flex flex-wrap gap-2">
                      {learningObjectives.map((objective, index) => (
                        <Badge key={index} variant="secondary">{objective}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {topics.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Topics Covered</h4>
                    <div className="flex flex-wrap gap-2">
                      {topics.map((topic, index) => (
                        <Badge key={index} variant="outline">{topic}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Content Management */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* File Upload */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Content
              </CardTitle>
              <CardDescription>
                Add materials for Week {weekData.weekNumber}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUploadZone
                onFilesSelected={handleFilesSelected}
                disabled={uploadingFiles}
              />
            </CardContent>
          </Card>
        </div>

        {/* Content Progress */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Content Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Processing Progress</span>
                    <span>{contentProgress}%</span>
                  </div>
                  <Progress value={contentProgress} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Items</span>
                    <span>{contentItems.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Processed</span>
                    <span>{contentItems.filter(item => item.isProcessed).length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Pending</span>
                    <span>{contentItems.filter(item => !item.isProcessed).length}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Content Items List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            Week Content ({contentItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingContent ? (
            <div className="flex items-center justify-center py-8">
              <Clock className="h-8 w-8 animate-spin" />
            </div>
          ) : contentItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No content uploaded for this week yet.</p>
              <p className="text-sm">Upload files using the form above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {contentItems.map((item) => {
                const IconComponent = getContentIcon(item.type);
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        item.isProcessed ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                      }`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.fileName} • {(item.fileSize / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {item.isProcessed ? (
                        <Badge variant="success">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Processed
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" />
                          Processing
                        </Badge>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteContentItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}