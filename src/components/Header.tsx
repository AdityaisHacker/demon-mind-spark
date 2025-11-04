import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skull, Settings } from "lucide-react";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Skull className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold bg-gradient-fire bg-clip-text text-transparent">
                DemonGPT
              </h1>
              <p className="text-xs text-muted-foreground">
                POWERED BY <span className="text-primary font-semibold">DEEPSEEK</span>
              </p>
            </div>
          </div>

          {/* Right side buttons */}
          <div className="flex items-center gap-3">
            <Badge 
              variant="secondary" 
              className="bg-primary/10 text-primary border-primary/30 hidden sm:flex"
            >
              Unlimited
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="border-border/50 hover:border-primary/50 hidden sm:flex"
            >
              Join Us
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
