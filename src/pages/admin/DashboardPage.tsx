import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Users, MessageCircle, HelpCircle, Link2, Loader2, LogOut } from 'lucide-react';
import { adminApi } from '@/lib/api';

export function DashboardPage() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: adminApi.getDashboard,
  });

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_name');
    navigate('/admin/login');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = [
    { label: 'Family Members', value: data?.recipients ?? 0, icon: Users, href: '/admin/recipients' },
    { label: 'Questions', value: data?.questions ?? 0, icon: HelpCircle, href: '/admin/questions' },
    { label: 'Assignments', value: Object.values(data?.assignments ?? {}).reduce((a: number, b: unknown) => a + (b as number), 0), icon: Link2, href: '/admin/assignments' },
    { label: 'Responses', value: data?.responses ?? 0, icon: MessageCircle, href: '/admin/responses' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {localStorage.getItem('admin_name') || 'Admin'}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => (
          <button
            key={stat.label}
            onClick={() => navigate(stat.href)}
            className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Assignment status breakdown */}
      {data?.assignments && Object.keys(data.assignments).length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="font-semibold mb-3">Assignment Status</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.assignments).map(([status, count]) => (
              <span key={status} className="text-xs bg-secondary px-2.5 py-1 rounded-full">
                {status}: <strong>{count as number}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick nav */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/admin/recipients')}
          className="bg-card border border-border rounded-lg p-3 text-sm font-medium hover:border-primary/50 transition-colors"
        >
          Manage Family Members
        </button>
        <button
          onClick={() => navigate('/admin/questions')}
          className="bg-card border border-border rounded-lg p-3 text-sm font-medium hover:border-primary/50 transition-colors"
        >
          Manage Questions
        </button>
        <button
          onClick={() => navigate('/admin/assignments')}
          className="bg-card border border-border rounded-lg p-3 text-sm font-medium hover:border-primary/50 transition-colors"
        >
          Assign Questions
        </button>
        <button
          onClick={() => navigate('/admin/responses')}
          className="bg-card border border-border rounded-lg p-3 text-sm font-medium hover:border-primary/50 transition-colors"
        >
          View Responses
        </button>
      </div>
    </div>
  );
}
