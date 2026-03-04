import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Loader2, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '@/lib/api';

interface Recipient { id: number; name: string; }
interface Question { id: number; text: string; theme: string; }
interface Assignment {
  id: number;
  recipient_name: string;
  question_text: string;
  theme: string;
  status: string;
  token: string;
  created_at: string;
}

export function AssignmentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [recipientId, setRecipientId] = useState('');
  const [questionId, setQuestionId] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['admin', 'assignments'],
    queryFn: adminApi.getAssignments,
  });

  const { data: recipients } = useQuery({
    queryKey: ['admin', 'recipients'],
    queryFn: adminApi.getRecipients,
    enabled: showForm,
  });

  const { data: questions } = useQuery({
    queryKey: ['admin', 'questions'],
    queryFn: adminApi.getQuestions,
    enabled: showForm,
  });

  const createMutation = useMutation({
    mutationFn: adminApi.createAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'assignments'] });
      setShowForm(false);
    },
  });

  const copyLink = useCallback((assignment: Assignment) => {
    const url = `${window.location.origin}/respond/${assignment.token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(assignment.id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const statusColors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    sent: 'bg-blue-100 text-blue-700',
    opened: 'bg-amber-100 text-amber-700',
    completed: 'bg-emerald-100 text-emerald-700',
    skipped: 'bg-orange-100 text-orange-700',
    expired: 'bg-red-100 text-red-700',
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold flex-1">Assignments</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Assign
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate({ recipient_id: Number(recipientId), question_id: Number(questionId) });
          }}
          className="bg-card border border-border rounded-xl p-4 space-y-3"
        >
          <select
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            required
            className="w-full border border-input rounded-md p-2 text-sm"
          >
            <option value="">Select family member...</option>
            {(recipients as Recipient[] || []).map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <select
            value={questionId}
            onChange={(e) => setQuestionId(e.target.value)}
            required
            className="w-full border border-input rounded-md p-2 text-sm"
          >
            <option value="">Select question...</option>
            {(questions as Question[] || []).map((q) => (
              <option key={q.id} value={q.id}>[{q.theme}] {q.text}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!recipientId || !questionId || createMutation.isPending}
            className="w-full bg-primary text-primary-foreground py-2 rounded-md text-sm font-medium disabled:opacity-50"
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Create Assignment & Link'}
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-2">
          {(assignments as Assignment[] || []).map((a) => (
            <div key={a.id} className="bg-card border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">{a.recipient_name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[a.status] || ''}`}>
                  {a.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">{a.question_text}</p>
              <button
                onClick={() => copyLink(a)}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                {copiedId === a.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedId === a.id ? 'Copied!' : 'Copy link'}
              </button>
            </div>
          ))}
          {(assignments as Assignment[] || []).length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No assignments yet. Create one above.</p>
          )}
        </div>
      )}
    </div>
  );
}
