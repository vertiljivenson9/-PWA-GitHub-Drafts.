import { FileText, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  hasFilters: boolean;
  onCreateIssue: () => void;
}

export function EmptyState({ hasFilters, onCreateIssue }: EmptyStateProps) {
  if (hasFilters) {
    return (
      <div className="empty-state">
        <div className="w-16 h-16 rounded-full bg-canvas-inset flex items-center justify-center mb-4">
          <Search className="w-8 h-8 text-subtle" />
        </div>
        <h3 className="text-default font-medium mb-2">No results found</h3>
        <p className="text-sm text-muted">
          Try adjusting your search or filters
        </p>
      </div>
    );
  }

  return (
    <div className="empty-state">
      <div className="w-16 h-16 rounded-full bg-canvas-inset flex items-center justify-center mb-4">
        <FileText className="w-8 h-8 text-subtle" />
      </div>
      <h3 className="text-default font-medium mb-2">No drafts yet</h3>
      <p className="text-sm text-muted mb-6">
        Create your first draft to get started
      </p>
      <Button
        onClick={onCreateIssue}
        className="bg-success-emphasis hover:bg-success-emphasis/90 text-white"
      >
        <Plus className="w-4 h-4 mr-2" />
        Create Issue
      </Button>
    </div>
  );
}
