import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { 
  Download, 
  Shield, 
  Cpu, 
  Settings, 
  Search, 
  Terminal, 
  Package, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCcw,
  Zap,
  Menu,
  X,
  ChevronRight,
  History,
  RotateCcw,
  FileCode,
  Lock,
  Unlock,
  Key,
  Plus,
  Trash2,
  ExternalLink,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RootApp, LibModule, LibVersion, AppPermission, Library, SystemPath, AppMode, GamePatch } from './types';
import { db, auth } from './firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc, 
  doc, 
  Timestamp,
  getDocFromServer,
  setDoc
} from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsedError = JSON.parse(this.state.error?.message || "");
        if (parsedError.error) {
          errorMessage = `Firestore Error: ${parsedError.error} during ${parsedError.operationType} on ${parsedError.path}`;
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-4">
          <div className="glass-panel p-8 max-w-md w-full text-center space-y-6">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold">Application Error</h2>
            <p className="text-text-muted">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-accent text-bg font-bold py-3 rounded-xl hover:scale-105 transition-transform"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const MOCK_APPS: RootApp[] = [
  {
    id: '1',
    name: 'LibReplacer Pro',
    version: '2.4.1',
    developer: 'KernelDev',
    description: 'Advanced system library swapper for rooted devices. Supports dynamic linking overrides.',
    category: 'Lib',
    icon: 'https://picsum.photos/seed/lib/100/100',
    downloadCount: '50K+',
    size: '4.2 MB',
    isRootRequired: true
  },
  {
    id: '2',
    name: 'System Optimizer',
    version: '1.0.5',
    developer: 'RootMasters',
    description: 'Optimize background processes and system daemons for maximum performance.',
    category: 'System',
    icon: 'https://picsum.photos/seed/opt/100/100',
    downloadCount: '120K+',
    size: '12 MB',
    isRootRequired: true
  },
  {
    id: '3',
    name: 'Kernel Tuner',
    version: '3.2.0',
    developer: 'LowLevel',
    description: 'Modify CPU governors, I/O schedulers, and voltage offsets on the fly.',
    category: 'Kernel',
    icon: 'https://picsum.photos/seed/kernel/100/100',
    downloadCount: '85K+',
    size: '8.5 MB',
    isRootRequired: true
  },
  {
    id: '4',
    name: 'BusyBox Installer',
    version: '1.36.1',
    developer: 'Stephen Stericson',
    description: 'The Swiss Army Knife of Embedded Linux. Essential for any rooted device.',
    category: 'Utility',
    icon: 'https://picsum.photos/seed/busy/100/100',
    downloadCount: '10M+',
    size: '2.1 MB',
    isRootRequired: true
  },
  {
    id: '5',
    name: 'Magisk Manager',
    version: '26.1',
    developer: 'topjohnwu',
    description: 'The universal systemless interface. Root your device and manage modules with ease.',
    category: 'System',
    icon: 'https://picsum.photos/seed/magisk/100/100',
    downloadCount: '50M+',
    size: '15 MB',
    isRootRequired: true
  },
  {
    id: '6',
    name: 'Viper4Android FX',
    version: '2.7.2',
    developer: 'Team ViPER',
    description: 'The ultimate audio enhancement tool. Requires specialized driver libraries.',
    category: 'Lib',
    icon: 'https://picsum.photos/seed/audio/100/100',
    downloadCount: '5M+',
    size: '4.8 MB',
    isRootRequired: true
  }
];

const MOCK_LIBS: LibModule[] = [
  { 
    id: 'l1', 
    targetLib: 'libc.so', 
    replacementName: 'libc_optimized.so', 
    currentVersion: '1.2.0',
    status: 'active', 
    lastModified: '2026-03-25',
    requiredPermissionId: 'p1',
    history: [
      { version: '1.2.0', hash: 'sha256:a1b2c3...', timestamp: '2026-03-25 14:20', notes: 'Initial optimized build', size: '854 KB' },
      { version: '1.1.5', hash: 'sha256:d4e5f6...', timestamp: '2026-03-20 09:15', notes: 'Beta performance patch', size: '850 KB' },
      { version: '1.0.0', hash: 'sha256:g7h8i9...', timestamp: '2026-03-10 18:45', notes: 'Stock library backup', size: '842 KB' },
    ]
  },
  { 
    id: 'l2', 
    targetLib: 'libart.so', 
    replacementName: 'libart_patched.so', 
    currentVersion: '2.0.1',
    status: 'inactive', 
    lastModified: '2026-03-20',
    requiredPermissionId: 'p2',
    history: [
      { version: '2.0.1', hash: 'sha256:j0k1l2...', timestamp: '2026-03-20 11:30', notes: 'ART runtime patch for Android 14', size: '124 KB' },
      { version: '1.9.8', hash: 'sha256:m3n4o5...', timestamp: '2026-03-15 16:00', notes: 'Stability improvements', size: '122 KB' },
    ]
  },
  { 
    id: 'l3', 
    targetLib: 'libgui.so', 
    replacementName: 'libgui_vulkan.so', 
    currentVersion: '0.9.5',
    status: 'pending', 
    lastModified: '2026-03-27',
    requiredPermissionId: 'p3',
    history: [
      { version: '0.9.5', hash: 'sha256:p6q7r8...', timestamp: '2026-03-27 08:00', notes: 'Experimental Vulkan backend', size: '98 KB' },
    ]
  },
];

const INITIAL_PERMISSIONS: AppPermission[] = [
  { id: 'p1', name: 'Lib Modification', description: 'Allows replacing core system libraries like libc.so', isGranted: true, category: 'Lib' },
  { id: 'p2', name: 'Runtime Patching', description: 'Allows patching the ART runtime and system daemons', isGranted: false, category: 'System' },
  { id: 'p3', name: 'Graphics Overrides', description: 'Allows modifying GPU drivers and display libraries', isGranted: true, category: 'Lib' },
  { id: 'p4', name: 'Shell Execution', description: 'Allows executing arbitrary commands with root privileges', isGranted: true, category: 'Shell' },
];

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState<'store' | 'lib' | 'terminal' | 'native' | 'permissions' | 'admin' | 'patches'>('store');
  const [appMode, setAppMode] = useState<AppMode>(null);
  const [gamePatches, setGamePatches] = useState<GamePatch[]>([
    { id: 'ff', name: 'Free Fire (Standard)', packageName: 'com.dts.freefireth', fileName: 'ff.zip', status: 'idle', progress: 0 },
    { id: 'ffmax', name: 'Free Fire MAX', packageName: 'com.dts.freefiremax', fileName: 'ffmax.zip', status: 'idle', progress: 0 },
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<RootApp | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedLibForHistory, setSelectedLibForHistory] = useState<LibModule | null>(null);
  const [revertingVersion, setRevertingVersion] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<AppPermission[]>(INITIAL_PERMISSIONS);
  const [showRootPopup, setShowRootPopup] = useState<'magisk' | 'apatch' | 'kernelsu' | null>(null);
  const [rootGranted, setRootGranted] = useState(false);

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState(false);

  // Firebase State
  const [remoteLibs, setRemoteLibs] = useState<Library[]>([]);
  const [remoteSystemPaths, setRemoteSystemPaths] = useState<SystemPath[]>([]);
  const [newSystemPath, setNewSystemPath] = useState({
    path: '',
    description: ''
  });
  const [newLib, setNewLib] = useState({
    name: '',
    targetPath: '',
    downloadUrl: '',
    version: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Firestore Listener
    const q = query(collection(db, 'libraries'), orderBy('createdAt', 'desc'));
    const unsubscribeLibs = onSnapshot(q, (snapshot) => {
      const libs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Library[];
      setRemoteLibs(libs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'libraries');
    });

    // System Paths Listener
    const qPaths = query(collection(db, 'system_paths'), orderBy('createdAt', 'desc'));
    const unsubscribePaths = onSnapshot(qPaths, (snapshot) => {
      const paths = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SystemPath[];
      setRemoteSystemPaths(paths);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'system_paths');
    });

    // Connection Test
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. This might be due to incorrect project ID or database ID in firebase-applet-config.json.");
        }
      }
    };
    testConnection();

    // Simulate initial root request
    const timer = setTimeout(() => {
      setShowRootPopup('magisk');
    }, 2000);

    return () => {
      unsubscribeLibs();
      unsubscribePaths();
      clearTimeout(timer);
    };
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'Rajnish@123') {
      setIsAdminAuthenticated(true);
      setAdminLoginError(false);
    } else {
      setAdminLoginError(true);
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    setAdminPassword('');
  };

  const handleAddLib = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminAuthenticated) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'libraries'), {
        ...newLib,
        createdAt: new Date().toISOString()
      });
      setNewLib({ name: '', targetPath: '', downloadUrl: '', version: '', notes: '' });
      alert("Library added successfully!");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'libraries');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLib = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this library?")) return;
    try {
      await deleteDoc(doc(db, 'libraries', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `libraries/${id}`);
    }
  };

  const handleAddSystemPath = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminAuthenticated) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'system_paths'), {
        ...newSystemPath,
        createdAt: new Date().toISOString()
      });
      setNewSystemPath({ path: '', description: '' });
      alert("System path added successfully!");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'system_paths');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSystemPath = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this system path?")) return;
    try {
      await deleteDoc(doc(db, 'system_paths', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `system_paths/${id}`);
    }
  };

  const togglePermission = (id: string) => {
    setPermissions(prev => prev.map(p => p.id === id ? { ...p, isGranted: !p.isGranted } : p));
  };

  const handleRootGrant = () => {
    setRootGranted(true);
    setAppMode('root');
    setShowRootPopup(null);
  };

  const handleShizukuGrant = () => {
    setRootGranted(false);
    setAppMode('shizuku');
    setShowRootPopup(null);
  };

  const runGamePatch = async (patchId: string) => {
    const patch = gamePatches.find(p => p.id === patchId);
    if (!patch) return;

    setGamePatches(prev => prev.map(p => p.id === patchId ? { ...p, status: 'downloading', progress: 0 } : p));
    
    try {
      // Check if running in Android WebView with our bridge
      if ((window as any).Android) {
        console.log("Native Bridge Detected: Starting real patch for", patchId);
        
        // Call Java to start the hidden download and replacement
        // This is the "Hidden URL" logic - Java knows the secret URL for this ID
        (window as any).Android.startPatch(patchId, patch.packageName, patch.fileName);
        
        // We'll listen for progress updates from Java (simulated here for UI)
        for (let i = 0; i <= 100; i += 5) {
          await new Promise(r => setTimeout(r, 200));
          setGamePatches(prev => prev.map(p => p.id === patchId ? { ...p, progress: i } : p));
          if (i === 50) setGamePatches(prev => prev.map(p => p.id === patchId ? { ...p, status: 'extracting' } : p));
          if (i === 80) setGamePatches(prev => prev.map(p => p.id === patchId ? { ...p, status: 'replacing' } : p));
        }
      } else {
        // Fallback for browser testing (Simulation)
        for (let i = 0; i <= 100; i += 10) {
          await new Promise(r => setTimeout(r, 300));
          setGamePatches(prev => prev.map(p => p.id === patchId ? { ...p, progress: i } : p));
        }
        setGamePatches(prev => prev.map(p => p.id === patchId ? { ...p, status: 'extracting', progress: 0 } : p));
        await new Promise(r => setTimeout(r, 1500));
        setGamePatches(prev => prev.map(p => p.id === patchId ? { ...p, status: 'replacing', progress: 0 } : p));
        await new Promise(r => setTimeout(r, 1000));
      }

      setGamePatches(prev => prev.map(p => p.id === patchId ? { ...p, status: 'completed', progress: 100 } : p));
      if ((window as any).Android) (window as any).Android.showToast(`Successfully patched ${patch.name}`);
      else alert(`Successfully replaced assets for ${patch.name}`);
      
    } catch (error) {
      console.error("Patch error:", error);
      setGamePatches(prev => prev.map(p => p.id === patchId ? { ...p, status: 'error' } : p));
      if ((window as any).Android) (window as any).Android.showToast("Patch failed! Check Root/Shizuku.");
      else alert("Failed to replace assets. Check server connection.");
    }
  };

  const filteredApps = MOCK_APPS.filter(app => 
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden relative">
      <div className="scanline pointer-events-none" />
      
      {/* Sidebar Navigation */}
      <nav className={`
        fixed inset-0 z-50 md:relative md:flex md:w-64 flex-col bg-surface border-r border-border transition-transform duration-300
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center border border-accent/30">
              <Zap className="text-accent w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tighter uppercase">Rajnish<span className="text-accent">Modz</span></h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-text-muted">
            <X />
          </button>
        </div>

        <div className="flex-1 px-4 space-y-2 mt-4">
          <NavButton 
            active={activeTab === 'store'} 
            onClick={() => { setActiveTab('store'); setIsMobileMenuOpen(false); }}
            icon={<Package size={20} />}
            label="App Store"
          />
          <NavButton 
            active={activeTab === 'lib'} 
            onClick={() => { setActiveTab('lib'); setIsMobileMenuOpen(false); }}
            icon={<Cpu size={20} />}
            label="Lib Manager"
          />
          <NavButton 
            active={activeTab === 'terminal'} 
            onClick={() => { setActiveTab('terminal'); setIsMobileMenuOpen(false); }}
            icon={<Terminal size={20} />}
            label="Root Shell"
          />
          <NavButton 
            active={activeTab === 'native'} 
            onClick={() => { setActiveTab('native'); setIsMobileMenuOpen(false); }}
            icon={<FileCode size={20} />}
            label="Native Source"
          />
          <NavButton 
            active={activeTab === 'permissions'} 
            onClick={() => { setActiveTab('permissions'); setIsMobileMenuOpen(false); }}
            icon={<Key size={20} />}
            label="Permissions"
          />
          <NavButton 
            active={activeTab === 'patches'} 
            onClick={() => { setActiveTab('patches'); setIsMobileMenuOpen(false); }}
            icon={<Zap size={20} />}
            label="Game Patches"
          />
          <NavButton 
            active={activeTab === 'admin'} 
            onClick={() => { setActiveTab('admin'); setIsMobileMenuOpen(false); }}
            icon={<Shield size={20} />}
            label="Admin Panel"
          />
        </div>

        <div className="p-6 border-t border-border">
          {isAdminAuthenticated ? (
            <div className="flex items-center gap-3 p-3 bg-accent/10 rounded-lg border border-accent/20 mb-4">
              <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-bg">
                <Shield size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">Admin Session</p>
                <button onClick={handleAdminLogout} className="text-[10px] text-accent hover:underline">Sign Out</button>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => { setActiveTab('admin'); setIsMobileMenuOpen(false); }}
              className="w-full flex items-center justify-center gap-2 p-3 bg-white/5 rounded-lg border border-border mb-4 hover:bg-white/10 transition-colors"
            >
              <Lock size={16} />
              <span className="text-xs font-bold">Admin Login</span>
            </button>
          )}
          <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${appMode === 'root' ? 'bg-accent/5 border-accent/10' : appMode === 'shizuku' ? 'bg-blue-500/5 border-blue-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
            <Shield className={`${appMode === 'root' ? 'text-accent' : appMode === 'shizuku' ? 'text-blue-500' : 'text-red-500'} w-5 h-5`} />
            <div>
              <p className={`text-xs font-mono uppercase tracking-widest ${appMode === 'root' ? 'text-accent' : appMode === 'shizuku' ? 'text-blue-500' : 'text-red-500'}`}>Mode</p>
              <p className="text-sm font-bold">{appMode === 'root' ? 'ROOT' : appMode === 'shizuku' ? 'SHIZUKU' : 'UNAUTHORIZED'}</p>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 border-bottom border-border bg-surface/50 backdrop-blur-md flex items-center justify-between px-6 z-10">
          <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-text-muted">
            <Menu />
          </button>
          
          <div className="flex-1 max-w-xl mx-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search root apps, modules, libs..."
              className="w-full bg-bg border border-border rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-accent/50 transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-4">
            <button className="text-text-muted hover:text-white transition-colors">
              <Settings size={20} />
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent to-blue-500" />
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'store' && (
              <motion.div 
                key="store"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <section>
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    Featured <span className="text-accent italic">Root Tools</span>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredApps.map(app => (
                      <AppCard 
                        key={app.id} 
                        app={app} 
                        onClick={() => setSelectedApp(app)}
                      />
                    ))}
                  </div>
                </section>

                <section className="glass-panel p-8 relative overflow-hidden">
                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                    <div className="flex-1">
                      <h3 className="text-3xl font-bold mb-4">LibReplacer <span className="text-accent">Engine</span></h3>
                      <p className="text-text-muted mb-6 max-w-lg">
                        Our proprietary engine allows you to swap system libraries without modifying the /system partition directly, using a virtual overlay.
                      </p>
                      <button className="bg-accent text-bg font-bold px-6 py-3 rounded-lg flex items-center gap-2 hover:scale-105 transition-transform">
                        <Zap size={20} />
                        Launch Engine
                      </button>
                    </div>
                    <div className="w-full md:w-64 h-48 bg-bg/50 rounded-xl border border-border flex items-center justify-center">
                      <Cpu className="text-accent/20 w-32 h-32 animate-pulse" />
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'lib' && (
              <motion.div 
                key="lib"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold">Library Manager</h2>
                    <p className="text-text-muted">Manage system library overrides and patches.</p>
                  </div>
                  <button className="bg-accent/10 border border-accent/20 text-accent px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-accent/20 transition-colors">
                    <RefreshCcw size={18} />
                    Rescan System
                  </button>
                </div>

                {/* Remote Libraries from Firebase */}
                {remoteLibs.length > 0 && (
                  <section className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <ExternalLink size={18} className="text-accent" />
                      Remote Modules (Firebase)
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {remoteLibs.map(lib => (
                        <div key={lib.id} className="glass-panel p-4 flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center border border-accent/20">
                              <FileCode className="text-accent" />
                            </div>
                            <div>
                              <h4 className="font-bold">{lib.name} <span className="text-xs text-text-muted font-mono ml-2">v{lib.version}</span></h4>
                              <p className="text-xs text-text-muted font-mono">{lib.targetPath}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <a 
                              href={lib.downloadUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-2 text-text-muted hover:text-accent transition-colors"
                              title="Download Source"
                            >
                              <Download size={18} />
                            </a>
                            <button className="bg-accent text-bg text-xs font-bold px-3 py-1.5 rounded hover:scale-105 transition-transform">
                              Deploy to System
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <div className="glass-panel overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface/50 border-b border-border">
                        <th className="p-4 font-mono text-xs text-text-muted uppercase tracking-widest">Target Lib</th>
                        <th className="p-4 font-mono text-xs text-text-muted uppercase tracking-widest">Replacement</th>
                        <th className="p-4 font-mono text-xs text-text-muted uppercase tracking-widest">Version</th>
                        <th className="p-4 font-mono text-xs text-text-muted uppercase tracking-widest">Status</th>
                        <th className="p-4 font-mono text-xs text-text-muted uppercase tracking-widest">Last Modified</th>
                        <th className="p-4"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {MOCK_LIBS.map(lib => (
                        <tr key={lib.id} className="border-b border-border hover:bg-white/5 transition-colors group">
                          <td className="p-4 font-mono text-sm">{lib.targetLib}</td>
                          <td className="p-4 font-mono text-sm text-accent">{lib.replacementName}</td>
                          <td className="p-4 font-mono text-sm text-text-muted">v{lib.currentVersion}</td>
                          <td className="p-4">
                            <StatusBadge status={lib.status} />
                          </td>
                          <td className="p-4 text-sm text-text-muted">{lib.lastModified}</td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => setSelectedLibForHistory(lib)}
                                className="p-2 text-text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
                                title="View History"
                              >
                                <History size={18} />
                              </button>
                              <button className="p-2 text-text-muted hover:text-white">
                                <ChevronRight size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="glass-panel p-6 border-l-4 border-l-yellow-500">
                    <div className="flex gap-4">
                      <AlertTriangle className="text-yellow-500 shrink-0" />
                      <div>
                        <h4 className="font-bold mb-1">System Integrity Warning</h4>
                        <p className="text-sm text-text-muted">
                          Replacing core libraries like <code className="text-accent">libc.so</code> can lead to bootloops if the replacement is incompatible. Always keep a recovery backup.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="glass-panel p-6 border-l-4 border-l-accent">
                    <div className="flex gap-4">
                      <CheckCircle2 className="text-accent shrink-0" />
                      <div>
                        <h4 className="font-bold mb-1">Backup Active</h4>
                        <p className="text-sm text-text-muted">
                          Automatic rollback is enabled. If the system fails to boot 3 times, original libraries will be restored.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'native' && (
              <motion.div 
                key="native"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold">AIDE Native Source</h2>
                    <p className="text-text-muted">Copy this code into AIDE to build the native APK.</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="bg-blue-500/10 text-blue-500 text-[10px] font-bold px-2 py-1 rounded border border-blue-500/20 uppercase">Java</span>
                    <span className="bg-orange-500/10 text-orange-500 text-[10px] font-bold px-2 py-1 rounded border border-orange-500/20 uppercase">XML</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="glass-panel overflow-hidden flex flex-col h-[500px]">
                    <div className="p-3 bg-white/5 border-b border-border flex items-center justify-between">
                      <span className="text-xs font-mono text-text-muted">MainActivity.java</span>
                      <button className="text-accent text-xs hover:underline">Copy Code</button>
                    </div>
                    <pre className="flex-1 p-4 font-mono text-xs text-text-muted overflow-auto bg-black/50">
{`package com.rajnish.modz;

import android.os.Bundle;
import android.app.Activity;
import android.widget.TextView;
import android.widget.Button;
import android.view.View;
import android.widget.Toast;
import java.io.DataOutputStream;

public class MainActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        // Root logic implementation...
        // Use Runtime.getRuntime().exec("su")
    }
}`}
                    </pre>
                  </div>

                  <div className="glass-panel overflow-hidden flex flex-col h-[300px]">
                    <div className="p-3 bg-white/5 border-b border-border flex items-center justify-between">
                      <span className="text-xs font-mono text-text-muted">activity_main.xml</span>
                      <button className="text-accent text-xs hover:underline">Copy Code</button>
                    </div>
                    <pre className="flex-1 p-4 font-mono text-xs text-text-muted overflow-auto bg-black/50">
{`<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#0A0A0B">
    <!-- UI Layout... -->
</RelativeLayout>`}
                    </pre>
                  </div>
                </div>
              </motion.div>
            )}
            {activeTab === 'patches' && (
              <motion.div 
                key="patches"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-2xl font-bold mb-2">Game Auto-Replace</h2>
                  <p className="text-text-muted">Download and automatically replace game assets in specific package directories.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {gamePatches.map(patch => (
                    <div key={patch.id} className="glass-panel p-6 flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center border border-accent/20">
                            <Zap className="text-accent" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg">{patch.name}</h3>
                            <p className="text-xs text-text-muted font-mono">{patch.packageName}</p>
                          </div>
                        </div>
                        <StatusBadge status={patch.status === 'completed' ? 'active' : patch.status === 'idle' ? 'inactive' : 'pending'} />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-text-muted uppercase">{patch.status}</span>
                          <span className="text-accent">{patch.progress}%</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-border">
                          <motion.div 
                            className="h-full bg-accent"
                            initial={{ width: 0 }}
                            animate={{ width: `${patch.progress}%` }}
                          />
                        </div>
                      </div>

                      <button 
                        onClick={() => runGamePatch(patch.id)}
                        disabled={patch.status !== 'idle' && patch.status !== 'completed' && patch.status !== 'error'}
                        className="w-full bg-accent text-bg font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform disabled:opacity-50"
                      >
                        <RefreshCcw size={18} className={patch.status !== 'idle' && patch.status !== 'completed' ? 'animate-spin' : ''} />
                        {patch.status === 'idle' ? 'Start Replace' : patch.status === 'completed' ? 'Re-apply' : 'Processing...'}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="glass-panel p-6 border-l-4 border-l-blue-500">
                  <div className="flex gap-4">
                    <Shield className="text-blue-500 shrink-0" />
                    <div>
                      <h4 className="font-bold mb-1">Permission Context</h4>
                      <p className="text-sm text-text-muted">
                        Using {appMode === 'root' ? 'Superuser' : 'Shizuku'} mode to access <code className="text-accent">/data/data/</code> directories. 
                        Ensure the target game is installed before starting.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'admin' && (
              <motion.div 
                key="admin"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Admin Dashboard</h2>
                    <p className="text-text-muted">
                      {isAdminAuthenticated 
                        ? `Logged in as ${appMode === 'root' ? 'Root' : 'Non-Root'} Administrator` 
                        : 'Manage the global library repository and system paths.'}
                    </p>
                  </div>
                  {isAdminAuthenticated && (
                    <button 
                      onClick={handleAdminLogout}
                      className="flex items-center gap-2 text-red-500 bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-colors"
                    >
                      <Lock size={18} />
                      <span className="text-sm font-bold">Logout</span>
                    </button>
                  )}
                </div>

                {!isAdminAuthenticated ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="glass-panel p-8 max-w-md w-full space-y-6">
                      <div className="text-center space-y-2">
                        <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto border border-accent/20">
                          <Key className="text-accent" size={32} />
                        </div>
                        <h3 className="text-xl font-bold">Admin Login</h3>
                        <p className="text-sm text-text-muted">Enter password to access {appMode === 'root' ? 'Root' : 'Non-Root'} Admin Panel</p>
                      </div>

                      <form onSubmit={handleAdminLogin} className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs text-text-muted uppercase tracking-widest">Password</label>
                          <input 
                            type="password" 
                            required
                            className={`w-full bg-bg border ${adminLoginError ? 'border-red-500' : 'border-border'} rounded-xl px-4 py-3 focus:border-accent outline-none transition-colors`}
                            placeholder="••••••••"
                            value={adminPassword}
                            onChange={e => {
                              setAdminPassword(e.target.value);
                              setAdminLoginError(false);
                            }}
                          />
                          {adminLoginError && <p className="text-xs text-red-500">Incorrect password. Please try again.</p>}
                        </div>
                        <button 
                          type="submit"
                          className="w-full bg-accent text-bg font-bold py-3 rounded-xl hover:scale-[1.02] transition-transform"
                        >
                          Unlock Dashboard
                        </button>
                      </form>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Conditional Admin Panels based on AppMode */}
                    <div className="lg:col-span-1 space-y-8">
                      {appMode === 'root' ? (
                        <div className="glass-panel p-6 border-l-4 border-l-accent">
                          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <Shield size={20} className="text-accent" />
                            Root Admin: Lib Swapper
                          </h3>
                          <form onSubmit={handleAddLib} className="space-y-4">
                            <div>
                              <label className="block text-xs text-text-muted uppercase tracking-widest mb-1">Library Name</label>
                              <input 
                                type="text" 
                                required
                                className="w-full bg-bg border border-border rounded-lg px-4 py-2 text-sm focus:border-accent outline-none"
                                placeholder="e.g. Optimized LibC"
                                value={newLib.name}
                                onChange={e => setNewLib({...newLib, name: e.target.value})}
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-text-muted uppercase tracking-widest mb-1">System Target Path</label>
                              <input 
                                type="text" 
                                required
                                className="w-full bg-bg border border-border rounded-lg px-4 py-2 text-sm focus:border-accent outline-none"
                                placeholder="e.g. /system/lib/libc.so"
                                value={newLib.targetPath}
                                onChange={e => setNewLib({...newLib, targetPath: e.target.value})}
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-text-muted uppercase tracking-widest mb-1">Download URL</label>
                              <input 
                                type="url" 
                                required
                                className="w-full bg-bg border border-border rounded-lg px-4 py-2 text-sm focus:border-accent outline-none"
                                placeholder="https://server.com/lib.so"
                                value={newLib.downloadUrl}
                                onChange={e => setNewLib({...newLib, downloadUrl: e.target.value})}
                              />
                            </div>
                            <button 
                              type="submit"
                              disabled={isSubmitting}
                              className="w-full bg-accent text-bg font-bold py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                              {isSubmitting ? 'Adding...' : 'Add Root Library'}
                            </button>
                          </form>
                        </div>
                      ) : (
                        <div className="glass-panel p-6 border-l-4 border-l-blue-500">
                          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <Zap size={20} className="text-blue-500" />
                            Non-Root Admin: Game Patches
                          </h3>
                          <div className="space-y-4">
                            <p className="text-xs text-text-muted">Manage game asset replacement configurations for Shizuku mode.</p>
                            <div className="p-4 bg-white/5 rounded-lg border border-border">
                              <span className="text-xs font-mono text-accent">Config: ff.zip {'->'} com.dts.freefireth</span>
                            </div>
                            <div className="p-4 bg-white/5 rounded-lg border border-border">
                              <span className="text-xs font-mono text-accent">Config: ffmax.zip {'->'} com.dts.freefiremax</span>
                            </div>
                            <button className="w-full bg-blue-500 text-white font-bold py-2 rounded-lg hover:opacity-90 transition-opacity">
                              Update Patch Configs
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="glass-panel p-6">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                          <Terminal size={20} className="text-accent" />
                          System Paths
                        </h3>
                        <form onSubmit={handleAddSystemPath} className="space-y-4">
                          <div>
                            <label className="block text-xs text-text-muted uppercase tracking-widest mb-1">Path</label>
                            <input 
                              type="text" 
                              required
                              className="w-full bg-bg border border-border rounded-lg px-4 py-2 text-sm focus:border-accent outline-none"
                              placeholder="/system/bin/..."
                              value={newSystemPath.path}
                              onChange={e => setNewSystemPath({...newSystemPath, path: e.target.value})}
                            />
                          </div>
                          <button 
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-white/10 text-white font-bold py-2 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
                          >
                            {isSubmitting ? 'Adding...' : 'Add Path'}
                          </button>
                        </form>
                      </div>
                    </div>

                    {/* Library List */}
                    <div className="lg:col-span-2 space-y-6">
                      <div className="glass-panel overflow-hidden">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-white/5 border-b border-border">
                            <tr>
                              <th className="px-6 py-4 font-bold">Library</th>
                              <th className="px-6 py-4 font-bold">Target Path</th>
                              <th className="px-6 py-4 font-bold">Version</th>
                              <th className="px-6 py-4 font-bold text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {remoteLibs.map(lib => (
                              <tr key={lib.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 font-medium">{lib.name}</td>
                                <td className="px-6 py-4 font-mono text-xs text-text-muted">{lib.targetPath}</td>
                                <td className="px-6 py-4 text-accent">{lib.version}</td>
                                <td className="px-6 py-4 text-right">
                                  <button 
                                    onClick={() => handleDeleteLib(lib.id)}
                                    className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Startup Screen */}
      <AnimatePresence>
        {!appMode && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-bg/90 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md glass-panel p-8 text-center space-y-8"
            >
              <div className="w-20 h-20 bg-accent/20 rounded-2xl flex items-center justify-center border border-accent/30 mx-auto">
                <Shield className="text-accent w-10 h-10" />
              </div>
              
              <div>
                <h2 className="text-3xl font-bold mb-2">Welcome to <span className="text-accent italic">RootLibHub</span></h2>
                <p className="text-text-muted">Select your device access mode to continue.</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <button 
                  onClick={() => setShowRootPopup('magisk')}
                  className="group p-6 bg-white/5 border border-border rounded-2xl hover:border-accent transition-all text-left flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center group-hover:bg-accent group-hover:text-bg transition-colors">
                    <Zap size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">Root Mode</h4>
                    <p className="text-xs text-text-muted">Requires Magisk, APatch, or KernelSU</p>
                  </div>
                </button>

                <button 
                  onClick={() => {
                    // Simulate Shizuku request
                    setAppMode('shizuku');
                    alert("Shizuku permission granted!");
                  }}
                  className="group p-6 bg-white/5 border border-border rounded-2xl hover:border-blue-500 transition-all text-left flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <Cpu size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">Non-Root Mode</h4>
                    <p className="text-xs text-text-muted">Requires Shizuku APK & Wireless Debugging</p>
                  </div>
                </button>
              </div>

              <p className="text-[10px] text-text-muted uppercase tracking-widest">
                System Version 2.4.1-STABLE
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Root Grant Popups */}
      <AnimatePresence>
        {showRootPopup && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            {showRootPopup === 'magisk' && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 50 }}
                className="relative w-full max-w-sm bg-[#1a1a1a] rounded-xl overflow-hidden shadow-2xl border border-white/10"
              >
                <div className="p-6 text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-white rounded-full flex items-center justify-center overflow-hidden">
                    <img src="https://picsum.photos/seed/magisk/100/100" alt="Magisk" className="w-16 h-16" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Magisk</h3>
                  <p className="text-sm text-gray-400 mb-6">
                    <span className="text-white font-bold">RootLib Hub</span> (com.rajnish.modz) is requesting superuser access.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setShowRootPopup(null)}
                      className="py-3 text-red-500 font-bold hover:bg-white/5 rounded-lg transition-colors"
                    >
                      DENY
                    </button>
                    <button 
                      onClick={handleRootGrant}
                      className="py-3 text-blue-500 font-bold hover:bg-white/5 rounded-lg transition-colors"
                    >
                      GRANT
                    </button>
                  </div>
                </div>
                <div className="bg-black/20 p-3 text-[10px] text-gray-500 text-center border-t border-white/5">
                  Fingerprint: SHA256:A1:B2:C3:D4...
                </div>
              </motion.div>
            )}

            {showRootPopup === 'apatch' && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 50 }}
                className="relative w-full max-w-sm bg-[#0a0a0a] rounded-2xl overflow-hidden shadow-2xl border border-accent/20"
              >
                <div className="p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center border border-accent/30">
                      <Zap className="text-accent w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">APatch Manager</h3>
                      <p className="text-xs text-accent font-mono">Superuser Request</p>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 rounded-xl p-4 mb-8 border border-white/10">
                    <p className="text-sm text-gray-300">App: <span className="text-white font-bold">RootLib Hub</span></p>
                    <p className="text-xs text-gray-500 mt-1">UID: 10245 | PID: 4521</p>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => setShowRootPopup(null)}
                      className="flex-1 py-3 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-colors"
                    >
                      Reject
                    </button>
                    <button 
                      onClick={handleRootGrant}
                      className="flex-1 py-3 bg-accent text-bg font-bold rounded-xl hover:scale-105 transition-transform"
                    >
                      Authorize
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {showRootPopup === 'kernelsu' && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 50 }}
                className="relative w-full max-w-sm bg-[#121212] rounded-lg overflow-hidden shadow-2xl border-t-4 border-t-blue-500"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white">KernelSU</h3>
                    <Shield className="text-blue-500 w-6 h-6" />
                  </div>
                  
                  <p className="text-sm text-gray-400 mb-8">
                    Allow <span className="text-white">RootLib Hub</span> to access root privileges? This grants full control over the kernel and system.
                  </p>

                  <div className="flex justify-end gap-4">
                    <button 
                      onClick={() => setShowRootPopup(null)}
                      className="px-6 py-2 text-gray-400 font-bold hover:text-white transition-colors"
                    >
                      CANCEL
                    </button>
                    <button 
                      onClick={handleRootGrant}
                      className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-500 transition-colors"
                    >
                      ALLOW
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* App Detail Modal */}
      <AnimatePresence>
        {selectedApp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedApp(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-surface border border-border rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="h-32 bg-gradient-to-r from-accent/20 to-blue-500/20 relative">
                <button 
                  onClick={() => setSelectedApp(null)}
                  className="absolute top-4 right-4 bg-black/50 p-2 rounded-full hover:bg-black transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="px-8 pb-8 -mt-12 relative">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <img 
                    src={selectedApp.icon} 
                    alt={selectedApp.name} 
                    className="w-24 h-24 rounded-2xl border-4 border-surface shadow-lg"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 pt-12 md:pt-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-3xl font-bold">{selectedApp.name}</h3>
                      {selectedApp.isRootRequired && (
                        <span className="bg-accent/10 text-accent text-[10px] font-bold px-2 py-0.5 rounded border border-accent/20 uppercase">Root</span>
                      )}
                    </div>
                    <p className="text-accent font-mono text-sm mb-4">v{selectedApp.version} by {selectedApp.developer}</p>
                    
                    <div className="flex gap-8 mb-6 border-y border-border py-4">
                      <div>
                        <p className="text-xs text-text-muted uppercase tracking-widest mb-1">Downloads</p>
                        <p className="font-bold">{selectedApp.downloadCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-text-muted uppercase tracking-widest mb-1">Size</p>
                        <p className="font-bold">{selectedApp.size}</p>
                      </div>
                      <div>
                        <p className="text-xs text-text-muted uppercase tracking-widest mb-1">Category</p>
                        <p className="font-bold">{selectedApp.category}</p>
                      </div>
                    </div>

                    <p className="text-text-muted leading-relaxed mb-8">
                      {selectedApp.description}
                    </p>

                    <div className="flex gap-4">
                      <button className="flex-1 bg-accent text-bg font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform">
                        <Download size={20} />
                        Install Module
                      </button>
                      <button className="p-3 border border-border rounded-xl hover:bg-white/5 transition-colors">
                        <Terminal size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Library History Modal */}
      <AnimatePresence>
        {selectedLibForHistory && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLibForHistory(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-3xl bg-surface border border-border rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-border flex items-center justify-between bg-bg/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center border border-accent/20">
                    <History className="text-accent w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Version Control: <span className="text-accent">{selectedLibForHistory.targetLib}</span></h3>
                    <p className="text-sm text-text-muted">Select a version to restore or view details.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedLibForHistory(null)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {selectedLibForHistory.history.map((version, idx) => (
                  <div 
                    key={version.hash}
                    className={`
                      glass-panel p-5 flex items-center justify-between group transition-all
                      ${version.version === selectedLibForHistory.currentVersion ? 'border-accent/50 bg-accent/5' : 'hover:border-white/20'}
                    `}
                  >
                    <div className="flex items-center gap-5">
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center border
                        ${version.version === selectedLibForHistory.currentVersion ? 'bg-accent text-bg border-accent' : 'bg-bg text-text-muted border-border'}
                      `}>
                        {version.version === selectedLibForHistory.currentVersion ? <CheckCircle2 size={20} /> : <FileCode size={20} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-bold text-lg">v{version.version}</span>
                          {version.version === selectedLibForHistory.currentVersion && (
                            <span className="text-[10px] font-bold bg-accent text-bg px-2 py-0.5 rounded uppercase tracking-tighter">Current</span>
                          )}
                          <span className="text-xs font-mono text-text-muted">{version.hash.substring(0, 15)}...</span>
                        </div>
                        <p className="text-sm text-white/80 mb-1">{version.notes}</p>
                        <div className="flex items-center gap-4 text-xs text-text-muted">
                          <span className="flex items-center gap-1"><RefreshCcw size={10} /> {version.timestamp}</span>
                          <span className="flex items-center gap-1"><Package size={10} /> {version.size}</span>
                        </div>
                      </div>
                    </div>

                    {version.version !== selectedLibForHistory.currentVersion && (
                      <button 
                        onClick={() => {
                          setRevertingVersion(version.version);
                          setTimeout(() => {
                            setRevertingVersion(null);
                            setSelectedLibForHistory({
                              ...selectedLibForHistory,
                              currentVersion: version.version,
                              lastModified: new Date().toISOString().split('T')[0]
                            });
                          }, 1500);
                        }}
                        disabled={revertingVersion !== null}
                        className={`
                          px-4 py-2 rounded-lg border border-border flex items-center gap-2 text-sm font-bold transition-all
                          ${revertingVersion === version.version ? 'bg-accent text-bg border-accent' : 'hover:bg-accent hover:text-bg hover:border-accent'}
                        `}
                      >
                        {revertingVersion === version.version ? (
                          <>
                            <RefreshCcw size={16} className="animate-spin" />
                            Restoring...
                          </>
                        ) : (
                          <>
                            <RotateCcw size={16} />
                            Restore
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-6 bg-bg/50 border-t border-border flex items-center justify-between">
                <p className="text-xs text-text-muted flex items-center gap-2">
                  <Shield size={14} className="text-accent" />
                  All versions are cryptographically signed by RootLibHub
                </p>
                <button className="text-sm font-bold text-accent hover:underline">
                  Export Version Log
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
        ${active ? 'bg-accent text-bg font-bold shadow-lg shadow-accent/20' : 'text-text-muted hover:bg-white/5 hover:text-white'}
      `}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function AppCard({ app, onClick }: { app: RootApp, onClick: () => void, key?: string }) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      onClick={onClick}
      className="glass-panel p-4 cursor-pointer group hover:border-accent/30 transition-colors"
    >
      <div className="flex gap-4 mb-4">
        <img 
          src={app.icon} 
          alt={app.name} 
          className="w-14 h-14 rounded-xl object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-bold truncate group-hover:text-accent transition-colors">{app.name}</h4>
          <p className="text-xs text-text-muted truncate">{app.developer}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-text-muted">{app.category}</span>
            <span className="text-[10px] text-accent font-mono">{app.size}</span>
          </div>
        </div>
      </div>
      <p className="text-xs text-text-muted line-clamp-2 mb-4 h-8">
        {app.description}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[10px] text-text-muted">
          <Download size={10} />
          {app.downloadCount}
        </div>
        <button className="text-accent hover:bg-accent/10 p-1.5 rounded-lg transition-colors">
          <Download size={18} />
        </button>
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: LibModule['status'] }) {
  const styles = {
    active: 'bg-accent/10 text-accent border-accent/20',
    inactive: 'bg-red-500/10 text-red-500 border-red-500/20',
    pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
  };

  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${styles[status]}`}>
      {status}
    </span>
  );
}
