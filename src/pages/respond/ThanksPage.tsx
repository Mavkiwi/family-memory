import { useSearchParams } from 'react-router-dom';
import { Heart, PartyPopper } from 'lucide-react';

export function ThanksPage() {
  const [searchParams] = useSearchParams();
  const wasSkipped = searchParams.get('skipped') === 'true';

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
          {wasSkipped ? (
            <Heart className="w-8 h-8 text-primary" />
          ) : (
            <PartyPopper className="w-8 h-8 text-primary" />
          )}
        </div>

        {wasSkipped ? (
          <>
            <h1 className="text-2xl font-bold text-foreground">No worries!</h1>
            <p className="text-muted-foreground">
              We understand — not every question is the right fit.
              You'll receive another question soon.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-foreground">Thank you!</h1>
            <p className="text-muted-foreground">
              Your story has been saved. It means the world to our family
              to have these memories preserved.
            </p>
          </>
        )}

        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">
            You can close this page. More questions will arrive over the coming weeks.
          </p>
        </div>
      </div>
    </div>
  );
}
