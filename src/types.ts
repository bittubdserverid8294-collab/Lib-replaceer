export interface RootApp {
  id: string;
  name: string;
  version: string;
  developer: string;
  description: string;
  category: 'System' | 'Utility' | 'Lib' | 'Kernel';
  icon: string;
  downloadCount: string;
  size: string;
  isRootRequired: boolean;
}

export interface LibVersion {
  version: string;
  hash: string;
  timestamp: string;
  notes: string;
  size: string;
}

export interface Library {
  id: string;
  name: string;
  targetPath: string;
  downloadUrl: string;
  version: string;
  notes?: string;
  createdAt: string;
}

export interface SystemPath {
  id: string;
  path: string;
  description: string;
  createdAt: string;
}

export type AppMode = 'root' | 'shizuku' | null;

export interface GamePatch {
  id: string;
  name: string;
  packageName: string;
  fileName: string;
  status: 'idle' | 'downloading' | 'extracting' | 'replacing' | 'completed' | 'error';
  progress: number;
}

export interface AppPermission {
  id: string;
  name: string;
  description: string;
  isGranted: boolean;
  category: 'System' | 'Lib' | 'Shell';
}

export interface LibModule {
  id: string;
  targetLib: string;
  replacementName: string;
  currentVersion: string;
  status: 'active' | 'inactive' | 'pending';
  lastModified: string;
  history: LibVersion[];
  requiredPermissionId?: string;
}
