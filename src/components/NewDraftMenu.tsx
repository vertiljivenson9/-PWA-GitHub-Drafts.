import { motion, AnimatePresence } from 'framer-motion';
import { CircleDot, GitBranch, X } from 'lucide-react';

interface NewDraftMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateIssue: () => void;
  onCreatePR: () => void;
}

export function NewDraftMenu({ isOpen, onClose, onCreateIssue, onCreatePR }: NewDraftMenuProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50"
          />

          {/* Menu */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-canvas-subtle rounded-t-2xl z-50 safe-area-bottom"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-border-default rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-border-default">
              <h2 className="text-lg font-semibold text-default">Create New</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-canvas-inset transition-colors"
              >
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>

            {/* Options */}
            <div className="p-4 space-y-3">
              <button
                onClick={onCreateIssue}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-canvas hover:bg-canvas-inset border border-border-default transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-accent-emphasis/20 flex items-center justify-center flex-shrink-0">
                  <CircleDot className="w-6 h-6 text-accent-fg" />
                </div>
                <div>
                  <h3 className="font-medium text-default">New Issue</h3>
                  <p className="text-sm text-muted">Create a bug report, feature request, or task</p>
                </div>
              </button>

              <button
                onClick={onCreatePR}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-canvas hover:bg-canvas-inset border border-border-default transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-success-emphasis/20 flex items-center justify-center flex-shrink-0">
                  <GitBranch className="w-6 h-6 text-success-fg" />
                </div>
                <div>
                  <h3 className="font-medium text-default">New Pull Request</h3>
                  <p className="text-sm text-muted">Propose changes to a repository</p>
                </div>
              </button>
            </div>

            {/* Safe area padding */}
            <div className="h-4" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
