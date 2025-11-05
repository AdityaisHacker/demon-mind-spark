import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CreditCard } from "lucide-react";

interface LowCreditsWarningProps {
  credits: number;
  unlimited: boolean;
}

export const LowCreditsWarning = ({ credits, unlimited }: LowCreditsWarningProps) => {
  // Don't show warning if unlimited or credits > 0
  if (unlimited || credits > 0) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
      <Alert
        variant="destructive"
        className="shadow-lg animate-in slide-in-from-top bg-destructive/10 border-destructive/50"
      >
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle className="flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Low Credits Warning
        </AlertTitle>
        <AlertDescription>
          You have 0 credits remaining. Please contact admin to add more credits.
        </AlertDescription>
      </Alert>
    </div>
  );
};
