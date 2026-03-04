import { cn } from '@/lib/utils';

interface QuestionCardProps {
  text: string;
  theme: string;
  followUp: string | null;
  recipientName: string;
}

const themeConfig: Record<string, { color: string; label: string; emoji: string }> = {
  childhood: { color: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Childhood', emoji: '' },
  family: { color: 'bg-pink-100 text-pink-800 border-pink-200', label: 'Family', emoji: '' },
  career: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Career', emoji: '' },
  wisdom: { color: 'bg-violet-100 text-violet-800 border-violet-200', label: 'Wisdom', emoji: '' },
  traditions: { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Traditions', emoji: '' },
};

export function QuestionCard({ text, theme, followUp, recipientName }: QuestionCardProps) {
  const config = themeConfig[theme] || themeConfig.family;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full border', config.color)}>
          {config.emoji} {config.label}
        </span>
      </div>

      <p className="text-sm text-muted-foreground">
        Hi {recipientName}, we'd love to hear your story:
      </p>

      <h2 className="text-xl sm:text-2xl font-semibold leading-snug text-foreground">
        {text}
      </h2>

      {followUp && (
        <p className="text-sm text-muted-foreground italic">
          Follow-up: {followUp}
        </p>
      )}
    </div>
  );
}
