import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy, Download } from "lucide-react";
import { toast } from "sonner";

interface CodeBlockProps {
  code: string;
  language?: string;
}

const CodeBlock = ({ code, language = "code" }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Code copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy code");
    }
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([code], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `code.${language === "python" ? "py" : language === "javascript" ? "js" : "txt"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Code downloaded!");
    } catch (error) {
      toast.error("Failed to download code");
    }
  };

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden border border-border/50 bg-[#1a1a1a]">
      {/* Header */}
      <div className="flex items-center justify-between bg-[#0d0d0d] px-4 py-2 border-b border-border/30">
        <span className="text-sm text-muted-foreground font-mono">
          {language}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-8 px-3 hover:bg-primary/10 hover:text-primary transition-all text-muted-foreground"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-1.5" />
                <span className="text-xs">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1.5" />
                <span className="text-xs">Copy</span>
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="h-8 px-3 hover:bg-primary/10 hover:text-primary transition-all text-muted-foreground"
          >
            <Download className="h-4 w-4 mr-1.5" />
            <span className="text-xs">Download</span>
          </Button>
        </div>
      </div>
      
      {/* Code Content */}
      <div className="overflow-x-auto">
        <pre className="p-4 text-sm">
          <code className="font-mono text-foreground leading-relaxed block">
            {code}
          </code>
        </pre>
      </div>
    </div>
  );
};

export default CodeBlock;
