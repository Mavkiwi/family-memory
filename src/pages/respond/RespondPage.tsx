import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Heart } from 'lucide-react';
import { QuestionCard } from '@/components/QuestionCard';
import { ResponseTabs } from '@/components/ResponseTabs';
import { respondApi, ApiError } from '@/lib/api';

export function RespondPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['respond', token],
    queryFn: () => respondApi.getQuestion(token!),
    enabled: !!token,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    const apiError = error as ApiError;
    if (apiError.code === 'TOKEN_ERROR' || apiError.status === 410) {
      return <ExpiredView />;
    }
    if (apiError.code === 'ALREADY_COMPLETED') {
      return <AlreadyCompletedView />;
    }
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <p className="text-destructive font-medium">Something went wrong</p>
          <p className="text-sm text-muted-foreground">{apiError.message}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Heart className="w-4 h-4 text-primary" />
          <span>Family Memory</span>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 space-y-6">
          <QuestionCard
            text={data.question.text}
            theme={data.question.theme}
            followUp={data.question.follow_up}
            recipientName={data.recipient_name}
          />

          <div className="border-t border-border pt-6">
            <ResponseTabs
              token={token!}
              onComplete={() => navigate(`/respond/${token}/thanks`)}
              onSkip={() => navigate(`/respond/${token}/thanks?skipped=true`)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ExpiredView() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center">
          <span className="text-2xl">&#9203;</span>
        </div>
        <h1 className="text-2xl font-bold">Link Expired</h1>
        <p className="text-muted-foreground">
          This question link has expired. Please ask for a new link to be sent.
        </p>
      </div>
    </div>
  );
}

function AlreadyCompletedView() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
          <span className="text-2xl">&#10003;</span>
        </div>
        <h1 className="text-2xl font-bold">Already Answered</h1>
        <p className="text-muted-foreground">
          You've already submitted your response to this question. Thank you!
        </p>
      </div>
    </div>
  );
}
