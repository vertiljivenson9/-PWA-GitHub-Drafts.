import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Settings, 
  GitBranch, 
  CircleDot, 
  Filter,
  Github
} from 'lucide-react';
import { useDrafts } from '@/hooks';
import type { Draft, DraftType, DraftStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DraftCard } from './DraftCard';
import { EmptyState } from './EmptyState';
import { NewDraftMenu } from './NewDraftMenu';

interface HomeScreenProps {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { login: string; avatar_url: string } | null;
  onLogin: () => void;
  onCreateDraft: (type: DraftType) => void;
  onEditDraft: (draft: Draft) => void;
  onOpenSettings: () => void;
}

export function HomeScreen({
  isAuthenticated,
  isLoading,
  user,
  onLogin,
  onCreateDraft,
  onEditDraft,
  onOpenSettings,
}: HomeScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<DraftType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<DraftStatus | 'all'>('all');
  const [showNewMenu, setShowNewMenu] = useState(false);
  
  const { drafts, isLoading: draftsLoading } = useDrafts();

  const filteredDrafts = useMemo(() => {
    let filtered = [...drafts];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d => 
        d.title.toLowerCase().includes(query) ||
        d.repo.toLowerCase().includes(query) ||
        d.body.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(d => d.type === typeFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(d => d.status === statusFilter);
    }

    return filtered;
  }, [drafts, searchQuery, typeFilter, statusFilter]);

  const handleCreateIssue = () => {
    setShowNewMenu(false);
    onCreateDraft('issue');
  };

  const handleCreatePR = () => {
    setShowNewMenu(false);
    onCreateDraft('pr');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-canvas">
      {/* Header */}
      <header className="header">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-success-emphasis rounded-lg flex items-center justify-center">
            <Github className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-semibold text-default">GitHub Drafts</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {isAuthenticated && user ? (
            <button
              onClick={onOpenSettings}
              className="w-8 h-8 rounded-full overflow-hidden border border-border-default"
            >
              <img 
                src={user.avatar_url} 
                alt={user.login}
                className="w-full h-full object-cover"
              />
            </button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenSettings}
              className="w-8 h-8"
            >
              <Settings className="w-5 h-5 text-muted" />
            </Button>
          )}
        </div>
      </header>

      {/* Not authenticated banner */}
      {!isAuthenticated && (
        <div className="bg-attention-emphasis/20 border-b border-attention-emphasis/30 px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-attention-fg">
              Sign in to submit drafts to GitHub
            </p>
            <Button
              size="sm"
              onClick={onLogin}
              className="bg-attention-emphasis hover:bg-attention-emphasis/90 text-white text-xs"
            >
              <Github className="w-4 h-4 mr-1" />
              Sign In
            </Button>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="px-4 py-3 space-y-3 border-b border-border-default bg-canvas-subtle">
        {/* Search */}
        <div className="search-bar">
          <Search className="w-5 h-5 text-subtle flex-shrink-0" />
          <Input
            type="text"
            placeholder="Search drafts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 text-default placeholder:text-subtle"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Filter className="w-4 h-4 text-subtle flex-shrink-0" />
          
          <button
            onClick={() => setTypeFilter('all')}
            className={`filter-chip ${typeFilter === 'all' ? 'active' : ''}`}
          >
            All
          </button>
          <button
            onClick={() => setTypeFilter('issue')}
            className={`filter-chip ${typeFilter === 'issue' ? 'active' : ''}`}
          >
            <CircleDot className="w-3 h-3 mr-1" />
            Issues
          </button>
          <button
            onClick={() => setTypeFilter('pr')}
            className={`filter-chip ${typeFilter === 'pr' ? 'active' : ''}`}
          >
            <GitBranch className="w-3 h-3 mr-1" />
            PRs
          </button>
          
          <div className="w-px h-4 bg-border-default mx-1" />
          
          <button
            onClick={() => setStatusFilter('all')}
            className={`filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
          >
            All Status
          </button>
          <button
            onClick={() => setStatusFilter('draft')}
            className={`filter-chip ${statusFilter === 'draft' ? 'active' : ''}`}
          >
            Drafts
          </button>
          <button
            onClick={() => setStatusFilter('created')}
            className={`filter-chip ${statusFilter === 'created' ? 'active' : ''}`}
          >
            Created
          </button>
        </div>
      </div>

      {/* Drafts List */}
      <div className="flex-1 overflow-y-auto p-4 scrollable">
        {draftsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="spinner" />
          </div>
        ) : filteredDrafts.length === 0 ? (
          <EmptyState 
            hasFilters={searchQuery !== '' || typeFilter !== 'all' || statusFilter !== 'all'}
            onCreateIssue={handleCreateIssue}
          />
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3 pb-20"
          >
            {filteredDrafts.map((draft, index) => (
              <motion.div
                key={draft.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <DraftCard 
                  draft={draft} 
                  onClick={() => onEditDraft(draft)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowNewMenu(true)}
        className="fab"
        aria-label="Create new draft"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* New Draft Menu */}
      <NewDraftMenu
        isOpen={showNewMenu}
        onClose={() => setShowNewMenu(false)}
        onCreateIssue={handleCreateIssue}
        onCreatePR={handleCreatePR}
      />
    </div>
  );
}
