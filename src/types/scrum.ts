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
  velocity?: number | null;
  deliveredPoints?: number | null;
  plannedPoints?: number | null;
}

export interface TaskComment {
  id: number;
  taskId: number;
  authorId: number;
  authorName: string;
  authorEmail?: string;
  content: string;
  createdAt: string;
}

export type AuditAction =
  | 'USER_CREATED'
  | 'USER_LOGIN'
  | 'ROLE_CHANGED'
  | 'SPRINT_STARTED'
  | 'SPRINT_CLOSED'
  | 'IMPEDIMENT_REPORTED'
  | 'IMPEDIMENT_RESOLVED'
  | 'TASK_COMMENT_ADDED';

export interface AuditLog {
  id: number;
  userId: number | null;
  userName: string;
  userEmail: string;
  action: AuditAction;
  entityType: 'USER' | 'PROJECT' | 'SPRINT' | 'USER_STORY' | 'TASK' | 'IMPEDIMENT' | 'COMMENT';
  entityId: number | string;
  details: string;
  timestamp: string;
}

export interface Epic {
  id: number;
  projectId: number;
  name: string;
  description: string;
  colorHex: string;
  createdAt: string;
}

export type ImpedimentStatus = 'OPEN' | 'RESOLVED';

export interface Impediment {
  id: number;
  taskId: number;
  description: string;
  status: ImpedimentStatus;
  createdById: number;
  creatorName: string;
  createdAt: string;
  resolvedById?: number | null;
  resolverName?: string | null;
  resolvedAt?: string | null;
  resolutionComment?: string | null;
}

export interface UserStory {
  id: number;
  projectId: number;
  epicId?: number | null;
  epic?: Epic | null;
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
  hasActiveImpediment?: boolean;
  impediments?: Impediment[];
  commentsCount?: number;
  comments?: TaskComment[];
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
  velocity: number;
  targetDestination?: string;
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
  hasActiveImpediment?: boolean;
  impediments?: Impediment[];
}
