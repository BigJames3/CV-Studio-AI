import { Badge } from './badge';
import { Sparkles } from 'lucide-react';

export function AiSuggestionBadge({ className }: { className?: string }) {
  return (
    <Badge variant="secondary" className={className}>
      <Sparkles className="mr-1 h-3 w-3" aria-hidden />
      AI suggestion
    </Badge>
  );
}
