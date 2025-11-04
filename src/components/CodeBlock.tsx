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
    <div className="relative group my-4 rounded-lg overflow-hidden border border-[#333] bg-[#1e1e1e]">
      {/* Header */}
      <div className="flex items-center justify-between bg-[#0d0d0d] px-4 py-2 border-b border-[#333]">
        <span className="text-xs text-[#858585] font-mono uppercase tracking-wide">
          {language}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-md bg-[#2a2a2a] hover:bg-[#333] text-[#d4d4d4] transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-md bg-[#2a2a2a] hover:bg-[#333] text-[#d4d4d4] transition-colors"
          >
            <Download className="w-3 h-3" />
            Download
          </button>
        </div>
      </div>
      
      {/* Code Content */}
      <div className="overflow-x-auto">
        <pre className="p-4 text-sm">
          <code className="font-mono text-[#d4d4d4] leading-relaxed block">
            {code}
          </code>
        </pre>
      </div>
    </div>
  );
};

export default CodeBlock;
