import { Heart } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Heart className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Family Memory</h1>
          <p className="text-muted-foreground">
            Preserving our family's stories, one question at a time.
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 text-left space-y-4">
          <h2 className="font-semibold text-foreground">How it works</h2>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <span>You receive a link with a personal question about your life</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <span>Record your answer by voice, upload audio, or type it out</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <span>Your story is securely saved for future generations to treasure</span>
            </li>
          </ol>
        </div>

        <p className="text-xs text-muted-foreground">
          Check your email or text messages for a personalised link to get started.
        </p>
      </div>
    </div>
  );
}
