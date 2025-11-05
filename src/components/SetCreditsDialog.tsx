import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";

interface SetCreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (credits: number) => void;
  userName: string;
  currentCredits: number;
}

const creditSchema = z.number().int().min(0).max(1000000);

export function SetCreditsDialog({ open, onOpenChange, onConfirm, userName, currentCredits }: SetCreditsDialogProps) {
  const [credits, setCredits] = useState(currentCredits.toString());
  const [error, setError] = useState("");

  const handleSubmit = () => {
    const parsed = parseInt(credits);
    
    if (isNaN(parsed)) {
      setError("Please enter a valid number");
      return;
    }

    const validation = creditSchema.safeParse(parsed);
    if (!validation.success) {
      setError("Credits must be between 0 and 1,000,000");
      return;
    }

    onConfirm(parsed);
    setError("");
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setCredits(currentCredits.toString());
      setError("");
    } else {
      setCredits(currentCredits.toString());
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Credits</DialogTitle>
          <DialogDescription>
            Set exact credit amount for {userName}. Current balance: {currentCredits}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="credits">Credits Amount</Label>
            <Input
              id="credits"
              type="number"
              placeholder="0"
              value={credits}
              onChange={(e) => {
                setCredits(e.target.value);
                setError("");
              }}
              min="0"
              max="1000000"
              step="1"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Set Credits
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
