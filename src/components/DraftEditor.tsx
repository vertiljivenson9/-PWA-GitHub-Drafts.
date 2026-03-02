import { useState, useRef } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Send, 
  CircleDot, 
  GitBranch,
  Image as ImageIcon,
  ChevronDown,
  X,
  Eye,
  Edit3,
  Trash2,
  Copy,
  Plus
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useDrafts, useTemplates } from '@/hooks';
import type { Draft, DraftType, Template } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface DraftEditorProps {
  draft: Draft | null;
  type: DraftType;
  isAuthenticated: boolean;
  onClose: () => void;
}

const COMMON_LABELS = ['bug', 'enhancement', 'documentation', 'good first issue', 'help wanted', 'question'];

export function DraftEditor({ draft: initialDraft, type, isAuthenticated, onClose }: DraftEditorProps) {
  const [draft, setDraft] = useState<Draft>(() => {
    if (initialDraft) return initialDraft;
    return {
      id: '',
      type,
      repo: '',
      title: '',
      body: '',
      labels: [],
      assignees: [],
      attachments: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'draft' as const,
    };
  });

  const [isNew, setIsNew] = useState(!initialDraft);
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [labelInput, setLabelInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { updateDraft, deleteDraft, duplicateDraft, applyTemplate } = useDrafts();
  const { templates } = useTemplates();

  const handleSave = async () => {
    try {
      await updateDraft(draft);
      toast.success('Draft saved');
      if (isNew) setIsNew(false);
    } catch (error) {
      toast.error('Failed to save draft');
    }
  };

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to submit');
      return;
    }

    if (!draft.repo || !draft.title) {
      toast.error('Please fill in repository and title');
      return;
    }

    setIsSubmitting(true);
    toast.info('Submitting to GitHub...');
    
    // For now, just save as draft (GitHub submission would need Octokit instance)
    await handleSave();
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!initialDraft) {
      onClose();
      return;
    }

    if (confirm('Are you sure you want to delete this draft?')) {
      await deleteDraft(draft.id);
      toast.success('Draft deleted');
      onClose();
    }
  };

  const handleDuplicate = async () => {
    await duplicateDraft(draft);
    toast.success('Draft duplicated');
    onClose();
  };

  const handleApplyTemplate = async (template: Template) => {
    const updated = await applyTemplate(draft, template.id);
    setDraft(updated);
    setShowTemplateMenu(false);
    toast.success(`Applied template: ${template.name}`);
  };

  const handleAddLabel = (label: string) => {
    if (!draft.labels.includes(label)) {
      setDraft(prev => ({ ...prev, labels: [...prev.labels, label] }));
    }
    setLabelInput('');
  };

  const handleRemoveLabel = (label: string) => {
    setDraft(prev => ({ ...prev, labels: prev.labels.filter(l => l !== label) }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setDraft(prev => ({
          ...prev,
          attachments: [
            ...prev.attachments,
            {
              id: Math.random().toString(36).substr(2, 9),
              name: file.name,
              data: base64,
              type: file.type,
              size: file.size,
            },
          ],
        }));
        toast.success('Image attached');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Failed to attach image');
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setDraft(prev => ({
      ...prev,
      attachments: prev.attachments.filter(a => a.id !== id),
    }));
  };

  const updateField = (field: keyof Draft, value: unknown) => {
    setDraft(prev => ({ ...prev, [field]: value }));
  };

  const availableTemplates = templates.filter(t => t.type === type);

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
          <div className="flex items-center gap-2">
            {type === 'issue' ? (
              <CircleDot className="w-5 h-5 text-accent-fg" />
            ) : (
              <GitBranch className="w-5 h-5 text-success-fg" />
            )}
            <span className="font-medium text-default">
              {isNew ? `New ${type === 'issue' ? 'Issue' : 'PR'}` : 'Edit Draft'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDuplicate}
            className="w-8 h-8"
            title="Duplicate"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            className="w-8 h-8 text-danger-fg"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollable">
        <div className="p-4 space-y-4">
          {/* Repository */}
          <div className="space-y-2">
            <Label className="text-sm text-muted">Repository</Label>
            <div className="relative">
              <Input
                value={draft.repo}
                onChange={(e) => updateField('repo', e.target.value)}
                placeholder="owner/repo"
                className="input-ios"
              />
            </div>
          </div>

          {/* Template Selector */}
          {availableTemplates.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted">Template</Label>
              <div className="relative">
                <button
                  onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-canvas-subtle border border-border-default text-left"
                >
                  <span className="text-sm text-muted">Choose a template...</span>
                  <ChevronDown className="w-4 h-4 text-muted" />
                </button>
                
                {showTemplateMenu && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-canvas-subtle border border-border-default rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                    {availableTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleApplyTemplate(template)}
                        className="w-full px-4 py-3 text-left hover:bg-canvas-inset transition-colors border-b border-border-muted last:border-0"
                      >
                        <div className="font-medium text-sm text-default">{template.name}</div>
                        {template.isDefault && (
                          <span className="text-xs text-accent-fg">Default</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label className="text-sm text-muted">Title</Label>
            <Input
              value={draft.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Title"
              className="input-ios"
            />
          </div>

          {/* Body with Preview Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted">Description</Label>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-1 text-xs text-accent-fg"
              >
                {showPreview ? (
                  <>
                    <Edit3 className="w-3 h-3" />
                    Edit
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3" />
                    Preview
                  </>
                )}
              </button>
            </div>
            
            {showPreview ? (
              <div className="min-h-[200px] p-4 bg-canvas-subtle border border-border-default rounded-lg markdown-preview">
                {draft.body ? (
                  <ReactMarkdown>{draft.body}</ReactMarkdown>
                ) : (
                  <span className="text-subtle italic">No description</span>
                )}
              </div>
            ) : (
              <Textarea
                value={draft.body}
                onChange={(e) => updateField('body', e.target.value)}
                placeholder="Write your description... (Markdown supported)"
                className="min-h-[200px] input-ios resize-none"
              />
            )}
          </div>

          {/* Labels */}
          <div className="space-y-2">
            <Label className="text-sm text-muted">Labels</Label>
            <div className="flex flex-wrap gap-2">
              {draft.labels.map((label) => (
                <Badge
                  key={label}
                  variant="secondary"
                  className="flex items-center gap-1 cursor-pointer"
                  onClick={() => handleRemoveLabel(label)}
                >
                  {label}
                  <X className="w-3 h-3" />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddLabel(labelInput);
                  }
                }}
                placeholder="Add label..."
                className="input-ios flex-1"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleAddLabel(labelInput)}
                disabled={!labelInput.trim()}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {/* Common labels */}
            <div className="flex flex-wrap gap-1">
              {COMMON_LABELS.filter(l => !draft.labels.includes(l)).map((label) => (
                <button
                  key={label}
                  onClick={() => handleAddLabel(label)}
                  className="text-xs px-2 py-1 rounded-full bg-canvas-inset text-muted border border-border-muted hover:border-border-default transition-colors"
                >
                  + {label}
                </button>
              ))}
            </div>
          </div>

          {/* PR-specific fields */}
          {type === 'pr' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted">Branch</Label>
                <Input
                  value={draft.branch || ''}
                  onChange={(e) => updateField('branch', e.target.value)}
                  placeholder="feature-branch"
                  className="input-ios"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted">Base Branch</Label>
                <Input
                  value={draft.baseBranch || 'main'}
                  onChange={(e) => updateField('baseBranch', e.target.value)}
                  placeholder="main"
                  className="input-ios"
                />
              </div>
            </div>
          )}

          {/* Attachments */}
          <div className="space-y-2">
            <Label className="text-sm text-muted">Attachments</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Add Image
            </Button>
            
            {draft.attachments.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {draft.attachments.map((attachment) => (
                  <div key={attachment.id} className="relative aspect-square">
                    <img
                      src={attachment.data}
                      alt={attachment.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      onClick={() => handleRemoveAttachment(attachment.id)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-danger-emphasis rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status */}
          {draft.status !== 'draft' && (
            <div className="p-3 rounded-lg bg-canvas-subtle border border-border-default">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted">Status:</span>
                <Badge 
                  variant={draft.status === 'created' ? 'default' : draft.status === 'error' ? 'destructive' : 'secondary'}
                >
                  {draft.status}
                </Badge>
              </div>
              {draft.githubUrl && (
                <a
                  href={draft.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent-fg hover:underline mt-2 inline-block"
                >
                  View on GitHub →
                </a>
              )}
            </div>
          )}
        </div>

        {/* Bottom padding for safe area */}
        <div className="h-24" />
      </div>

      {/* Bottom Actions */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-canvas-subtle border-t border-border-default safe-area-bottom">
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={handleSave}
            className="flex-1"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !isAuthenticated}
            className="flex-1 bg-success-emphasis hover:bg-success-emphasis/90 text-white"
          >
            {isSubmitting ? (
              <div className="spinner w-4 h-4 mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}
