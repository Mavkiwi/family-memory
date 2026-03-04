import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Loader2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '@/lib/api';

interface Recipient {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  relationship: string;
  generation: string;
  active: number;
  created_at: string;
}

export function RecipientsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('family');
  const [generation, setGeneration] = useState('parent');

  const { data: recipients, isLoading } = useQuery({
    queryKey: ['admin', 'recipients'],
    queryFn: adminApi.getRecipients,
  });

  const createMutation = useMutation({
    mutationFn: adminApi.createRecipient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'recipients'] });
      setShowForm(false);
      setName('');
      setEmail('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteRecipient,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'recipients'] }),
  });

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold flex-1">Family Members</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate({ name, email: email || undefined, relationship, generation });
          }}
          className="bg-card border border-border rounded-xl p-4 space-y-3"
        >
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border border-input rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="email"
            placeholder="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-input rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="border border-input rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="family">Family</option>
              <option value="parent">Parent</option>
              <option value="grandparent">Grandparent</option>
              <option value="sibling">Sibling</option>
              <option value="aunt/uncle">Aunt/Uncle</option>
              <option value="cousin">Cousin</option>
              <option value="friend">Friend</option>
            </select>
            <select
              value={generation}
              onChange={(e) => setGeneration(e.target.value)}
              className="border border-input rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="grandparent">Grandparent</option>
              <option value="parent">Parent</option>
              <option value="sibling">Sibling</option>
              <option value="child">Child</option>
              <option value="extended">Extended</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={!name.trim() || createMutation.isPending}
            className="w-full bg-primary text-primary-foreground py-2 rounded-md text-sm font-medium disabled:opacity-50"
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Add Member'}
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-2">
          {(recipients as Recipient[] || []).map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.relationship} &middot; {r.generation}{r.email ? ` &middot; ${r.email}` : ''}</p>
              </div>
              <button
                onClick={() => { if (confirm(`Delete ${r.name}?`)) deleteMutation.mutate(r.id); }}
                className="text-muted-foreground hover:text-destructive transition-colors p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {(recipients as Recipient[] || []).length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No family members yet. Add one above.</p>
          )}
        </div>
      )}
    </div>
  );
}
