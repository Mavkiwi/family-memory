import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Mic, PenLine, Image } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ResponseRow {
  id: number;
  type: string;
  text_content: string | null;
  transcription_text: string | null;
  transcription_status: string;
  recipient_name: string;
  question_text: string;
  theme: string;
  created_at: string;
  admin_notes: string | null;
  flagged: number;
}

const themeColors: Record<string, string> = {
  childhood: 'bg-amber-100 text-amber-800',
  family: 'bg-pink-100 text-pink-800',
  career: 'bg-blue-100 text-blue-800',
  wisdom: 'bg-violet-100 text-violet-800',
  traditions: 'bg-emerald-100 text-emerald-800',
};

const typeIcons = {
  audio: Mic,
  text: PenLine,
  photo: Image,
};

export function ResponsesPage() {
  const navigate = useNavigate();

  const { data: responses, isLoading } = useQuery({
    queryKey: ['admin', 'responses'],
    queryFn: adminApi.getResponses,
  });

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Responses</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-2">
          {(responses as ResponseRow[] || []).map((r) => {
            const Icon = typeIcons[r.type as keyof typeof typeIcons] || PenLine;
            return (
              <div key={r.id} className="bg-card border border-border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{r.recipient_name}</span>
                  </div>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', themeColors[r.theme] || 'bg-gray-100')}>
                    {r.theme}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">{r.question_text}</p>

                {r.type === 'text' && r.text_content && (
                  <div className="bg-secondary rounded-md p-3 text-sm">
                    {r.text_content.length > 200 ? r.text_content.slice(0, 200) + '...' : r.text_content}
                  </div>
                )}

                {r.type === 'audio' && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Transcription: {r.transcription_status}</span>
                  </div>
                )}

                {r.transcription_text && (
                  <div className="bg-secondary rounded-md p-3 text-sm italic">
                    {r.transcription_text.length > 200 ? r.transcription_text.slice(0, 200) + '...' : r.transcription_text}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            );
          })}
          {(responses as ResponseRow[] || []).length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No responses yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
