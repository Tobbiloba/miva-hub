import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Database,
  Search,
  Filter,
  Download,
  Upload,
  Edit,
  Trash2,
  Eye,
  FileText,
  Image,
  Video,
  FileIcon,
  MoreHorizontal,
  Calendar,
  User,
  FolderOpen,
  Plus
} from "lucide-react";
import { getSession } from "@/lib/auth/server";
import { requireAdmin } from "@/lib/auth/admin";

export default async function ContentManagePage() {
  const session = await getSession();
  const adminAccess = await requireAdmin();

  if (adminAccess instanceof Response) {
    return <div>Access denied. Admin privileges required.</div>;
  }

  // Mock content data (in real app, this would come from database)
  const contentItems = [
    {
      id: "1",
      title: "Introduction to Computer Science - Lecture 1",
      type: "video",
      size: "245 MB",
      format: "MP4",
      uploadedBy: "Dr. Sarah Johnson",
      uploadedAt: "2024-03-15",
      course: "CS101",
      downloads: 127,
      status: "published",
      category: "lecture"
    },
    {
      id: "2", 
      title: "Database Design Assignment Guidelines",
      type: "document",
      size: "2.3 MB",
      format: "PDF",
      uploadedBy: "Prof. Michael Chen",
      uploadedAt: "2024-03-14",
      course: "CS301",
      downloads: 89,
      status: "published",
      category: "assignment"
    },
    {
      id: "3",
      title: "Python Programming Examples",
      type: "document",
      size: "156 KB",
      format: "ZIP",
      uploadedBy: "Dr. Sarah Johnson",
      uploadedAt: "2024-03-13",
      course: "CS101",
      downloads: 234,
      status: "draft",
      category: "resource"
    },
    {
      id: "4",
      title: "Mathematical Foundations Slides",
      type: "document",
      size: "8.7 MB",
      format: "PPTX",
      uploadedBy: "Prof. David Wilson",
      uploadedAt: "2024-03-12",
      course: "MATH201",
      downloads: 67,
      status: "published",
      category: "lecture"
    },
    {
      id: "5",
      title: "Course Syllabus - Software Engineering",
      type: "document",
      size: "1.2 MB",
      format: "PDF",
      uploadedBy: "Dr. Emily Rodriguez",
      uploadedAt: "2024-03-10",
      course: "CS405",
      downloads: 156,
      status: "published",
      category: "syllabus"
    }
  ];

  const getFileIcon = (type: string) => {
    switch (type) {
      case "video": return Video;
      case "image": return Image;
      case "document": return FileText;
      default: return FileIcon;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published": return "bg-green-100 text-green-800 border-green-200";
      case "draft": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "archived": return "bg-gray-100 text-gray-800 border-gray-200";
      default: return "";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "lecture": return "bg-blue-100 text-blue-800";
      case "assignment": return "bg-purple-100 text-purple-800";
      case "resource": return "bg-orange-100 text-orange-800";
      case "syllabus": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Calculate statistics
  const totalSize = contentItems.reduce((sum, item) => {
    const size = parseFloat(item.size);
    const unit = item.size.split(' ')[1];
    if (unit === 'GB') return sum + (size * 1024);
    if (unit === 'MB') return sum + size;
    if (unit === 'KB') return sum + (size / 1024);
    return sum;
  }, 0);

  const totalDownloads = contentItems.reduce((sum, item) => sum + item.downloads, 0);
  const publishedCount = contentItems.filter(item => item.status === 'published').length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="h-8 w-8 text-green-600" />
            Content Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage all course content, files, and digital resources
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export List
          </Button>
          <Button asChild>
            <a href="/admin/content/upload">
              <Upload className="mr-2 h-4 w-4" />
              Upload Content
            </a>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{contentItems.length}</p>
                <p className="text-xs text-muted-foreground">Total Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{publishedCount}</p>
                <p className="text-xs text-muted-foreground">Published</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{totalDownloads}</p>
                <p className="text-xs text-muted-foreground">Total Downloads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{totalSize.toFixed(1)} MB</p>
                <p className="text-xs text-muted-foreground">Storage Used</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search content by title, course, or uploader..." className="pl-10" />
              </div>
            </div>
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Content Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="image">Images</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="lecture">Lectures</SelectItem>
                <SelectItem value="assignment">Assignments</SelectItem>
                <SelectItem value="resource">Resources</SelectItem>
                <SelectItem value="syllabus">Syllabus</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Content Table */}
      <Card>
        <CardHeader>
          <CardTitle>Content Library</CardTitle>
          <CardDescription>
            All uploaded course content and digital resources
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Content</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Downloads</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contentItems.map((item) => {
                  const FileIconComponent = getFileIcon(item.type);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                            <FileIconComponent className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{item.title}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{item.size}</span>
                              <span>•</span>
                              <span>{item.format}</span>
                              <span>•</span>
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(item.uploadedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="outline">{item.course}</Badge>
                      </TableCell>
                      
                      <TableCell>
                        <span className="capitalize">{item.type}</span>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="secondary" className={getCategoryColor(item.category)}>
                          {item.category}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{item.uploadedBy}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(item.status)}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Download className="h-4 w-4 text-muted-foreground" />
                          <span>{item.downloads}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}