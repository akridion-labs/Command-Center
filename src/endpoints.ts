// Endpoint types for Vyom Command Center

export interface Me {
  options?: {
    role: 'cto' | 'coo';
  };
  verified: boolean;
  config_problem?: string;
}

export interface Health {
  model: string;
  index_freshness: string;
  answer_quality: number;
  attention_items: string[];
}

export interface Task {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface Tasks {
  items: Task[];
}

export interface Agent {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  last_seen: string;
  version: string;
}

export interface Agents {
  items: Agent[];
}

export interface Quota {
  storage: {
    total: number;
    used: number;
    free: number;
  };
  usage: {
    chunks: number;
    files: number;
    documents: number;
  };
}

export interface Container {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'paused';
  image: string;
  created_at: string;
}

export interface Containers {
  items: Container[];
}

// Endpoint constants
export const ENDPOINTS = {
  ME: '/vyom/me',
  HEALTH: '/vyom/health',
  TASKS: '/vyom/tasks',
  AGENTS: '/vyom/agents',
  QUOTA: '/vyom/quota',
  CONTAINERS: '/vyom/containers',
  ASK: '/vyom/ask',
};