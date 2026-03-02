import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth, useDrafts } from '@/hooks';
import { HomeScreen } from '@/components/HomeScreen';
import { DraftEditor } from '@/components/DraftEditor';
import { AuthCallback } from '@/components/AuthCallback';
import { Settings } from '@/components/Settings';
import { Toaster } from '@/components/ui/sonner';
import type { Draft, DraftType } from '@/types';
import './App.css';

type Screen = 'home' | 'editor' | 'settings' | 'callback';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [editingDraft, setEditingDraft] = useState<Draft | null>(null);
  const [editorType, setEditorType] = useState<DraftType>('issue');
  
  const { isAuthenticated, isLoading, user, login, logout } = useAuth();
  const { refreshDrafts } = useDrafts();

  // Check for OAuth callback
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    
    if (code && state) {
      setCurrentScreen('callback');
    }
  }, []);

  const handleCreateDraft = (type: DraftType) => {
    setEditorType(type);
    setEditingDraft(null);
    setCurrentScreen('editor');
  };

  const handleEditDraft = (draft: Draft) => {
    setEditingDraft(draft);
    setEditorType(draft.type);
    setCurrentScreen('editor');
  };

  const handleCloseEditor = () => {
    setCurrentScreen('home');
    setEditingDraft(null);
    refreshDrafts();
  };

  const handleOpenSettings = () => {
    setCurrentScreen('settings');
  };

  const handleCloseSettings = () => {
    setCurrentScreen('home');
  };

  const handleAuthSuccess = () => {
    setCurrentScreen('home');
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  // Render current screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'callback':
        return (
          <AuthCallback 
            onSuccess={handleAuthSuccess} 
            onError={() => setCurrentScreen('home')} 
          />
        );
      
      case 'editor':
        return (
          <DraftEditor
            draft={editingDraft}
            type={editorType}
            isAuthenticated={isAuthenticated}
            onClose={handleCloseEditor}
          />
        );
      
      case 'settings':
        return (
          <Settings
            isAuthenticated={isAuthenticated}
            user={user}
            onLogin={login}
            onLogout={logout}
            onClose={handleCloseSettings}
          />
        );
      
      case 'home':
      default:
        return (
          <HomeScreen
            isAuthenticated={isAuthenticated}
            isLoading={isLoading}
            user={user}
            onLogin={login}
            onCreateDraft={handleCreateDraft}
            onEditDraft={handleEditDraft}
            onOpenSettings={handleOpenSettings}
          />
        );
    }
  };

  return (
    <div className="app">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="screen-container"
        >
          {renderScreen()}
        </motion.div>
      </AnimatePresence>
      <Toaster position="top-center" />
    </div>
  );
}

export default App;
