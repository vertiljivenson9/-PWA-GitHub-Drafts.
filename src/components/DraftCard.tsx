import { CircleDot, GitBranch, Clock, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import type { Draft } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface DraftCardProps {
  draft: Draft;
  onClick: () => void;
}

export function DraftCard({ draft, onClick }: DraftCardProps) {
  const getStatusIcon = () => {
    switch (draft.status) {
      case 'draft':
        return <Clock className="w-4 h-4" />;
      case 'pending':
        return <div className="spinner w-4 h-4" />;
      case 'created':
        return <CheckCircle className="w-4 h-4" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getStatusClass = () => {
    switch (draft.status) {
      case 'draft':
        return 'badge-draft';
      case 'pending':
        return 'badge-pending';
      case 'created':
        return 'badge-created';
      case 'error':
        return 'badge-error';
      default:
        return 'badge-draft';
    }
  };

  const getTypeIcon = () => {
    if (draft.type === 'issue') {
      return <CircleDot className="w-4 h-4 text-accent-fg" />;
    }
    return <GitBranch className="w-4 h-4 text-success-fg" />;
  };

  return (
    <div 
      onClick={onClick}
      className="draft-card cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            {getTypeIcon()}
            <span className="text-xs text-muted truncate">
              {draft.repo || 'No repository'}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-default font-medium text-sm mb-2 line-clamp-2">
            {draft.title || 'Untitled Draft'}
          </h3>

          {/* Labels */}
          {draft.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {draft.labels.slice(0, 3).map((label) => (
                <span 
                  key={label}
                  className="text-xs px-2 py-0.5 rounded-full bg-canvas-inset text-muted border border-border-muted"
                >
                  {label}
                </span>
              ))}
              {draft.labels.length > 3 && (
                <span className="text-xs text-subtle">
                  +{draft.labels.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between">
            <span className={`badge ${getStatusClass()}`}>
              {getStatusIcon()}
              <span className="ml-1 capitalize">{draft.status}</span>
            </span>
            <span className="text-xs text-subtle">
              {formatDistanceToNow(draft.updatedAt, { addSuffix: true })}
            </span>
          </div>

          {/* Error message */}
          {draft.status === 'error' && draft.errorMessage && (
            <p className="text-xs text-danger-fg mt-2 line-clamp-2">
              {draft.errorMessage}
            </p>
          )}

          {/* GitHub link */}
          {draft.githubUrl && (
            <a
              href={draft.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs text-accent-fg mt-2 hover:underline"
            >
              View on GitHub
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
