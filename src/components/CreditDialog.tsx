import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";

interface CreditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (credits: number) => void;
  userName: string;
}

const creditSchema = z.number().int().min(0).max(1000000);

export function CreditDialog({ open, onOpenChange, onConfirm, userName }: CreditDialogProps) {
  const [credits, setCredits] = useState("");
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
    setCredits("");
    setError("");
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setCredits("");
      setError("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Credits</DialogTitle>
          <DialogDescription>
            Add credits to {userName}'s account. Valid range: 0 - 1,000,000
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
          <Button onClick={handleSubmit}>Add Credits</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
