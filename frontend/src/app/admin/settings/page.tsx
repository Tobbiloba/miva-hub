import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  Database,
  Mail,
  Shield,
  Calendar,
  Users,
  BookOpen,
  Bell,
  Key,
  Server,
  Download,
  Upload,
  RefreshCw,
  Save,
  AlertTriangle,
  CheckCircle,
  Globe,
  Clock,
  Zap
} from "lucide-react";
import { getSession } from "@/lib/auth/server";
import { requireAdmin } from "@/lib/auth/admin";
import { SystemSettingsClient } from "@/components/admin/system-settings-client";

export default async function SystemSettingsPage() {
  const session = await getSession();
  const adminAccess = await requireAdmin();

  if (adminAccess instanceof Response) {
    return <div>Access denied. Admin privileges required.</div>;
  }

  // Mock current settings - in a real app, these would come from a database
  const currentSettings = {
    university: {
      name: "MIVA University",
      shortName: "MIVA",
      address: "Lagos, Nigeria",
      phone: "+234-xxx-xxx-xxxx",
      email: "admin@miva.edu.ng",
      website: "https://miva.edu.ng",
      logoUrl: "/logo.png"
    },
    academic: {
      currentSemester: "2024-fall",
      semesterStartDate: "2024-08-15",
      semesterEndDate: "2024-12-15",
      gradeScale: "4.0",
      passingGrade: "60",
      maxCreditsPerSemester: "24",
      dropDeadline: "2024-09-30"
    },
    email: {
      enabled: true,
      smtpHost: "smtp.miva.edu.ng",
      smtpPort: "587",
      smtpUser: "system@miva.edu.ng",
      enableNotifications: true,
      enableWelcomeEmails: true,
      enableGradeNotifications: true
    },
    security: {
      sessionTimeout: "30",
      passwordMinLength: "8",
      requireEmailVerification: true,
      enableTwoFactor: false,
      maxLoginAttempts: "5",
      lockoutDuration: "15"
    },
    features: {
      enableChatbot: true,
      enableAnalytics: true,
      enableContentUpload: true,
      enableStudentPortal: true,
      enableFacultyPortal: true,
      enableMobileApp: false
    },
    system: {
      maintenanceMode: false,
      debugMode: false,
      logLevel: "info",
      backupFrequency: "daily",
      maxFileSize: "50",
      allowedFileTypes: "pdf,doc,docx,ppt,pptx,xls,xlsx"
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8 text-blue-600" />
            System Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure university information, academic policies, and system features
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Config
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset to Defaults
          </Button>
        </div>
      </div>

      {/* System Status Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">System Status</p>
                <p className="text-xs text-muted-foreground">All systems operational</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Database</p>
                <p className="text-xs text-muted-foreground">Connected • 45ms</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Email Service</p>
                <p className="text-xs text-muted-foreground">Active • 156 sent today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium">AI Services</p>
                <p className="text-xs text-muted-foreground">Running • 23 queries/min</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="university" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="university" className="flex items-center gap-1">
            <Globe className="h-4 w-4" />
            University
          </TabsTrigger>
          <TabsTrigger value="academic" className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            Academic
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-1">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-1">
            <Zap className="h-4 w-4" />
            Features
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-1">
            <Server className="h-4 w-4" />
            System
          </TabsTrigger>
        </TabsList>

        {/* University Information */}
        <TabsContent value="university" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>University Information</CardTitle>
              <CardDescription>
                Basic information about the university that appears throughout the system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SystemSettingsClient category="university" currentSettings={currentSettings.university}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="universityName">University Name</Label>
                    <Input id="universityName" defaultValue={currentSettings.university.name} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shortName">Short Name</Label>
                    <Input id="shortName" defaultValue={currentSettings.university.shortName} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" defaultValue={currentSettings.university.address} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" defaultValue={currentSettings.university.phone} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" defaultValue={currentSettings.university.email} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input id="website" defaultValue={currentSettings.university.website} />
                  </div>
                </div>
                <Button className="mt-4">
                  <Save className="mr-2 h-4 w-4" />
                  Save University Information
                </Button>
              </SystemSettingsClient>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Academic Settings */}
        <TabsContent value="academic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Academic Settings</CardTitle>
              <CardDescription>
                Configure academic calendar, grading scale, and enrollment policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SystemSettingsClient category="academic" currentSettings={currentSettings.academic}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="currentSemester">Current Semester</Label>
                    <Select defaultValue={currentSettings.academic.currentSemester}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024-fall">Fall 2024</SelectItem>
                        <SelectItem value="2025-spring">Spring 2025</SelectItem>
                        <SelectItem value="2025-summer">Summer 2025</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gradeScale">Grade Scale</Label>
                    <Select defaultValue={currentSettings.academic.gradeScale}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4.0">4.0 Scale</SelectItem>
                        <SelectItem value="5.0">5.0 Scale</SelectItem>
                        <SelectItem value="100">100 Point Scale</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passingGrade">Minimum Passing Grade</Label>
                    <Input id="passingGrade" defaultValue={currentSettings.academic.passingGrade} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxCredits">Max Credits per Semester</Label>
                    <Input id="maxCredits" defaultValue={currentSettings.academic.maxCreditsPerSemester} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="semesterStart">Semester Start Date</Label>
                    <Input id="semesterStart" type="date" defaultValue={currentSettings.academic.semesterStartDate} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="semesterEnd">Semester End Date</Label>
                    <Input id="semesterEnd" type="date" defaultValue={currentSettings.academic.semesterEndDate} />
                  </div>
                </div>
                <Button className="mt-4">
                  <Save className="mr-2 h-4 w-4" />
                  Save Academic Settings
                </Button>
              </SystemSettingsClient>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Configuration</CardTitle>
              <CardDescription>
                Configure email server settings and notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Email Service</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow the system to send emails
                  </p>
                </div>
                <Switch defaultChecked={currentSettings.email.enabled} />
              </div>
              
              <Separator />
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>SMTP Host</Label>
                  <Input defaultValue={currentSettings.email.smtpHost} />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Port</Label>
                  <Input defaultValue={currentSettings.email.smtpPort} />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Username</Label>
                  <Input defaultValue={currentSettings.email.smtpUser} />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Password</Label>
                  <Input type="password" placeholder="••••••••" />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="font-medium">Notification Settings</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Welcome Emails</Label>
                    <p className="text-sm text-muted-foreground">
                      Send welcome emails to new users
                    </p>
                  </div>
                  <Switch defaultChecked={currentSettings.email.enableWelcomeEmails} />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Grade Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify students when grades are posted
                    </p>
                  </div>
                  <Switch defaultChecked={currentSettings.email.enableGradeNotifications} />
                </div>
              </div>
              
              <Button className="mt-4">
                <Save className="mr-2 h-4 w-4" />
                Save Email Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Configuration</CardTitle>
              <CardDescription>
                Manage authentication, password policies, and security features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Session Timeout (minutes)</Label>
                  <Input defaultValue={currentSettings.security.sessionTimeout} />
                </div>
                <div className="space-y-2">
                  <Label>Password Min Length</Label>
                  <Input defaultValue={currentSettings.security.passwordMinLength} />
                </div>
                <div className="space-y-2">
                  <Label>Max Login Attempts</Label>
                  <Input defaultValue={currentSettings.security.maxLoginAttempts} />
                </div>
                <div className="space-y-2">
                  <Label>Lockout Duration (minutes)</Label>
                  <Input defaultValue={currentSettings.security.lockoutDuration} />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Email Verification</Label>
                    <p className="text-sm text-muted-foreground">
                      Users must verify their email before accessing the system
                    </p>
                  </div>
                  <Switch defaultChecked={currentSettings.security.requireEmailVerification} />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable 2FA for all user accounts
                    </p>
                  </div>
                  <Switch defaultChecked={currentSettings.security.enableTwoFactor} />
                </div>
              </div>
              
              <Button className="mt-4">
                <Save className="mr-2 h-4 w-4" />
                Save Security Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feature Toggles */}
        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Management</CardTitle>
              <CardDescription>
                Enable or disable system features and modules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label>AI Chatbot</Label>
                    <p className="text-sm text-muted-foreground">
                      Academic assistant and study buddy
                    </p>
                  </div>
                  <Switch defaultChecked={currentSettings.features.enableChatbot} />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Analytics Dashboard</Label>
                    <p className="text-sm text-muted-foreground">
                      Performance metrics and insights
                    </p>
                  </div>
                  <Switch defaultChecked={currentSettings.features.enableAnalytics} />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Content Upload</Label>
                    <p className="text-sm text-muted-foreground">
                      Faculty can upload course materials
                    </p>
                  </div>
                  <Switch defaultChecked={currentSettings.features.enableContentUpload} />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Student Portal</Label>
                    <p className="text-sm text-muted-foreground">
                      Student dashboard and features
                    </p>
                  </div>
                  <Switch defaultChecked={currentSettings.features.enableStudentPortal} />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Faculty Portal</Label>
                    <p className="text-sm text-muted-foreground">
                      Faculty dashboard and tools
                    </p>
                  </div>
                  <Switch defaultChecked={currentSettings.features.enableFacultyPortal} />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Mobile App</Label>
                    <p className="text-sm text-muted-foreground">
                      Mobile application access
                    </p>
                  </div>
                  <Switch defaultChecked={currentSettings.features.enableMobileApp} />
                </div>
              </div>
              
              <Button className="mt-4">
                <Save className="mr-2 h-4 w-4" />
                Save Feature Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
              <CardDescription>
                Advanced system settings and maintenance options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <div className="space-y-0.5">
                    <Label>Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Temporarily disable user access for maintenance
                    </p>
                  </div>
                </div>
                <Switch defaultChecked={currentSettings.system.maintenanceMode} />
              </div>
              
              <Separator />
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Log Level</Label>
                  <Select defaultValue={currentSettings.system.logLevel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="warn">Warning</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="debug">Debug</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Backup Frequency</Label>
                  <Select defaultValue={currentSettings.system.backupFrequency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Max File Size (MB)</Label>
                  <Input defaultValue={currentSettings.system.maxFileSize} />
                </div>
                
                <div className="space-y-2">
                  <Label>Allowed File Types</Label>
                  <Input defaultValue={currentSettings.system.allowedFileTypes} />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Debug Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable detailed logging and error messages
                  </p>
                </div>
                <Switch defaultChecked={currentSettings.system.debugMode} />
              </div>
              
              <Button className="mt-4">
                <Save className="mr-2 h-4 w-4" />
                Save System Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}