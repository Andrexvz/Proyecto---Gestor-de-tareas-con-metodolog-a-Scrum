export type GlobalRole = 'ADMIN' | 'USER';
export type ScrumRole = 'PRODUCT_OWNER' | 'SCRUM_MASTER' | 'DEVELOPER';
export type SprintStatus = 'PLANNING' | 'ACTIVE' | 'CLOSED';
export type StoryPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'TESTING' | 'DONE';

export interface User {
  id: number;
  email: string;
  fullName: string;
  globalRole: GlobalRole;
  title?: string;
}

export interface ProjectMembership {
  id: number;
  userId: number;
  projectId: number;
  scrumRole: ScrumRole;
  user?: User;
}

export interface Project {
  id: number;
  code: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface ProjectSummary extends Project {
  myRole: ScrumRole | 'ADMIN';
  activeSprint: Sprint | null;
  totalStories: number;
  completedStories: number;
  totalPoints: number;
  completedPoints: number;
  members: ProjectMembership[];
}

export interface Sprint {
  id: number;
  projectId: number;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  closedAt?: string | null;
}

export interface UserStory {
  id: number;
  projectId: number;
  sprintId: number | null;
  code: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  priority: StoryPriority;
  storyPoints: number;
  isCompleted: boolean;
  createdAt: string;
}

export interface TaskItem {
  id: number;
  userStoryId: number;
  assignedToId: number | null;
  code: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
}

export interface AppNotification {
  id: number;
  userId: number;
  message: string;
  readStatus: boolean;
  createdAt: string;
}

export interface AiGeneratedStory {
  role: string;
  action: string;
  benefit: string;
  acceptanceCriteria: string[];
}

export interface SprintCloseSummary {
  sprintId: number;
  sprintName: string;
  completedStoriesCount: number;
  returnedStoriesCount: number;
  deliveredPoints: number;
  plannedPoints: number;
}

export interface SprintMetricRow {
  sprintId: number;
  sprintName: string;
  status: SprintStatus;
  startDate: string;
  endDate: string;
  plannedPoints: number;
  completedPoints: number;
  totalStories: number;
  completedStories: number;
}

export interface AssignedTaskDetail {
  id: number;
  code: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
  assignedToId: number | null;
  assignee?: {
    id: number;
    fullName: string;
    email: string;
  };
  story: {
    id: number;
    code: string;
    title: string;
    priority: StoryPriority;
    storyPoints: number;
    isCompleted: boolean;
  };
  project: {
    id: number;
    code: string;
    name: string;
    myRole: ScrumRole | 'ADMIN';
  };
  sprint: {
    id: number;
    name: string;
    status: SprintStatus;
    startDate: string;
    endDate: string;
  } | null;
}
