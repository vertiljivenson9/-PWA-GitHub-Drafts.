import { useState } from 'react';
import { 
  ArrowLeft, 
  Github, 
  LogOut, 
  Download, 
  Upload, 
  FileText,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { useDataExport } from '@/hooks';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface SettingsProps {
  isAuthenticated: boolean;
  user: { login: string; avatar_url: string } | null;
  onLogin: () => void;
  onLogout: () => void;
  onClose: () => void;
}

export function Settings({ isAuthenticated, user, onLogin, onLogout, onClose }: SettingsProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { downloadBackup, loadFromFile, isExporting } = useDataExport();

  const handleExport = async () => {
    try {
      await downloadBackup();
      toast.success('Backup downloaded');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await loadFromFile(file);
      if (result.success) {
        toast.success(`Imported ${result.imported} items`);
      } else {
        toast.error('Failed to import data');
      }
    } catch (error) {
      toast.error('Failed to read file');
    }
    
    // Reset input
    e.target.value = '';
  };

  const handleLogout = async () => {
    await onLogout();
    setShowLogoutConfirm(false);
    toast.success('Signed out');
    onClose();
  };

  return (
    <div className="flex flex-col h-full bg-canvas">
      {/* Header */}
      <header className="header safe-area-top">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="w-8 h-8"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-default">Settings</h1>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollable p-4">
        {/* Account Section */}
        <div className="mb-6">
          <h2 className="text-xs font-medium text-subtle uppercase tracking-wide mb-3 px-1">
            Account
          </h2>
          
          {isAuthenticated && user ? (
            <div className="card p-4">
              <div className="flex items-center gap-4">
                <img
                  src={user.avatar_url}
                  alt={user.login}
                  className="w-14 h-14 rounded-full"
                />
                <div className="flex-1">
                  <h3 className="font-medium text-default">{user.login}</h3>
                  <p className="text-sm text-muted">Signed in with GitHub</p>
                </div>
              </div>
              
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full mt-4 flex items-center justify-center gap-2 p-3 rounded-lg bg-danger-emphasis/10 text-danger-fg hover:bg-danger-emphasis/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="card p-4">
              <p className="text-sm text-muted mb-4">
                Sign in with GitHub to submit drafts directly to your repositories.
              </p>
              <Button
                onClick={onLogin}
                className="w-full bg-canvas-inset hover:bg-canvas-inset/80 text-default border border-border-default"
              >
                <Github className="w-4 h-4 mr-2" />
                Sign in with GitHub
              </Button>
            </div>
          )}
        </div>

        {/* Data Management */}
        <div className="mb-6">
          <h2 className="text-xs font-medium text-subtle uppercase tracking-wide mb-3 px-1">
            Data Management
          </h2>
          
          <div className="card overflow-hidden">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full flex items-center justify-between p-4 hover:bg-canvas-inset transition-colors border-b border-border-default"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent-emphasis/20 flex items-center justify-center">
                  <Download className="w-4 h-4 text-accent-fg" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-default">Export Backup</div>
                  <div className="text-xs text-muted">Download all drafts as JSON</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted" />
            </button>
            
            <label className="w-full flex items-center justify-between p-4 hover:bg-canvas-inset transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-success-emphasis/20 flex items-center justify-center">
                  <Upload className="w-4 h-4 text-success-fg" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-default">Import Backup</div>
                  <div className="text-xs text-muted">Restore from JSON file</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted" />
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* About */}
        <div className="mb-6">
          <h2 className="text-xs font-medium text-subtle uppercase tracking-wide mb-3 px-1">
            About
          </h2>
          
          <div className="card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-success-emphasis flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-default">GitHub Drafts</h3>
                <p className="text-xs text-muted">Version 1.0.0</p>
              </div>
            </div>
            <p className="text-sm text-muted">
              A PWA for creating GitHub Issues and PRs from your iPhone. 
              Draft offline, submit when connected.
            </p>
          </div>
        </div>

        {/* GitHub Credentials Notice */}
        <div className="p-4 rounded-lg bg-attention-emphasis/10 border border-attention-emphasis/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-attention-fg flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-attention-fg text-sm">Setup Required</h4>
              <p className="text-xs text-attention-fg/80 mt-1">
                To use GitHub integration, add your GitHub App credentials in 
                <code className="bg-canvas-inset px-1 py-0.5 rounded mx-1">src/hooks/useAuth.ts</code>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-canvas-subtle rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-default mb-2">Sign Out?</h3>
            <p className="text-sm text-muted mb-6">
              Your drafts will remain saved locally. You'll need to sign in again to submit to GitHub.
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleLogout}
                variant="destructive"
                className="flex-1"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
