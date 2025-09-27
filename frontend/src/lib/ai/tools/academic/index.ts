/**
 * Academic Tools Bundle
 * Core MCP tools for academic success at MIVA University
 */

import { courseContentTool } from './course-content.tool';
import { assignmentTrackerTool } from './assignment-tracker.tool';
import { facultyDirectoryTool } from './faculty-directory.tool';
import { academicScheduleTool } from './academic-schedule.tool';

// Academic Tools Bundle - All core academic tools
export const academicTools = {
  'get-course-materials': courseContentTool,
  'get-upcoming-assignments': assignmentTrackerTool,
  'find-faculty': facultyDirectoryTool,
  'get-academic-schedule': academicScheduleTool,
} as const;

// Tool names for easy reference
export const AcademicToolNames = {
  COURSE_MATERIALS: 'get-course-materials',
  ASSIGNMENTS: 'get-upcoming-assignments', 
  FACULTY: 'find-faculty',
  SCHEDULE: 'get-academic-schedule',
} as const;

// Export individual tools
export { 
  courseContentTool,
  assignmentTrackerTool, 
  facultyDirectoryTool,
  academicScheduleTool 
};

// Tool metadata for display and organization
export const academicToolsMetadata = {
  'get-course-materials': {
    category: 'Content',
    displayName: 'Course Materials',
    description: 'Access course materials by week, type, or topic',
    icon: '📚',
    priority: 1
  },
  'get-upcoming-assignments': {
    category: 'Planning',
    displayName: 'Assignment Tracker',
    description: 'Track upcoming assignments with urgency prioritization',
    icon: '📝',
    priority: 2
  },
  'find-faculty': {
    category: 'Contact',
    displayName: 'Faculty Directory',
    description: 'Find faculty contact info and office hours',
    icon: '👩‍🏫',
    priority: 3
  },
  'get-academic-schedule': {
    category: 'Schedule',
    displayName: 'Academic Schedule',
    description: 'View class schedules and important academic dates',
    icon: '🗓️',
    priority: 4
  }
} as const;

// Academic tool preset configuration
export const academicToolPreset = {
  id: 'miva-academic-assistant',
  name: 'MIVA Academic Assistant',
  description: 'Essential tools for academic success at MIVA University',
  tools: Object.keys(academicTools),
  categories: ['Content', 'Planning', 'Contact', 'Schedule'],
  isDefault: true,
  requiredForStudents: true,
  icon: '🎓'
};

/**
 * Validate that a user has the required academic tools
 */
export function validateAcademicToolsAccess(userTools: string[]): {
  hasAllRequired: boolean;
  missingTools: string[];
  suggestions: string[];
} {
  const requiredTools = Object.keys(academicTools);
  const missingTools = requiredTools.filter(tool => !userTools.includes(tool));
  
  return {
    hasAllRequired: missingTools.length === 0,
    missingTools,
    suggestions: missingTools.length > 0 ? [
      'Contact your academic advisor to enable missing academic tools',
      'Visit the IT help desk for tool activation assistance',
      'Check your enrollment status - tools are activated upon course enrollment'
    ] : []
  };
}

/**
 * Get academic tools organized by category
 */
export function getAcademicToolsByCategory() {
  const categories: Record<string, any[]> = {};
  
  Object.entries(academicToolsMetadata).forEach(([toolName, metadata]) => {
    if (!categories[metadata.category]) {
      categories[metadata.category] = [];
    }
    
    categories[metadata.category].push({
      name: toolName,
      ...metadata,
      tool: academicTools[toolName as keyof typeof academicTools]
    });
  });
  
  // Sort tools within each category by priority
  Object.keys(categories).forEach(category => {
    categories[category].sort((a, b) => a.priority - b.priority);
  });
  
  return categories;
}

/**
 * Get academic tools usage statistics structure
 * (Implementation would connect to analytics system)
 */
export function getAcademicToolsUsageTemplate() {
  return {
    totalTools: Object.keys(academicTools).length,
    toolCategories: Object.keys(getAcademicToolsByCategory()),
    mostUsedTools: [
      AcademicToolNames.COURSE_MATERIALS,
      AcademicToolNames.ASSIGNMENTS
    ],
    recommendedWorkflow: [
      {
        step: 1,
        tool: AcademicToolNames.SCHEDULE,
        description: 'Check your daily/weekly schedule'
      },
      {
        step: 2, 
        tool: AcademicToolNames.ASSIGNMENTS,
        description: 'Review upcoming assignments and deadlines'
      },
      {
        step: 3,
        tool: AcademicToolNames.COURSE_MATERIALS,
        description: 'Access materials for current week'
      },
      {
        step: 4,
        tool: AcademicToolNames.FACULTY,
        description: 'Contact instructors when needed'
      }
    ]
  };
}