import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Question {
  id: number;
  text: string;
  theme: string;
  follow_up: string | null;
  sort_order: number;
  active: number;
}

const themeColors: Record<string, string> = {
  childhood: 'bg-amber-100 text-amber-800',
  family: 'bg-pink-100 text-pink-800',
  career: 'bg-blue-100 text-blue-800',
  wisdom: 'bg-violet-100 text-violet-800',
  traditions: 'bg-emerald-100 text-emerald-800',
};

export function QuestionsPage() {
  const navigate = useNavigate();

  const { data: questions, isLoading } = useQuery({
    queryKey: ['admin', 'questions'],
    queryFn: adminApi.getQuestions,
  });

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Question Bank</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-2">
          {(questions as Question[] || []).map((q) => (
            <div key={q.id} className="bg-card border border-border rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2">
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', themeColors[q.theme] || 'bg-gray-100')}>
                  {q.theme}
                </span>
                <span className="text-xs text-muted-foreground">#{q.sort_order}</span>
              </div>
              <p className="text-sm font-medium">{q.text}</p>
              {q.follow_up && <p className="text-xs text-muted-foreground italic">Follow-up: {q.follow_up}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
