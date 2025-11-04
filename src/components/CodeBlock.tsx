import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy, Download } from "lucide-react";
import { toast } from "sonner";

interface CodeBlockProps {
  code: string;
  language?: string;
}

// Syntax highlighting function for DeepSeek-style colors
const highlightCode = (code: string, language: string) => {
  let highlighted = code;

  // Escape HTML first
  highlighted = highlighted
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Python/JavaScript keywords - orange
  const keywords = [
    'import', 'from', 'class', 'def', 'return', 'if', 'else', 'elif', 'for', 'while',
    'try', 'except', 'finally', 'with', 'as', 'in', 'not', 'and', 'or', 'is',
    'True', 'False', 'None', 'self', 'const', 'let', 'var', 'function', 'async',
    'await', 'export', 'default', 'interface', 'type', 'enum', 'extends', 'implements',
    'public', 'private', 'protected', 'static', 'void', 'new', 'this', 'super'
  ];

  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
    highlighted = highlighted.replace(regex, '<span style="color: #ff8b3e;">$1</span>');
  });

  // Strings - green
  highlighted = highlighted.replace(
    /(['"`])((?:\\.|(?!\1).)*?)\1/g,
    '<span style="color: #98c379;">$&</span>'
  );

  // Comments - gray
  highlighted = highlighted.replace(
    /(#[^\n]*)/g,
    '<span style="color: #5c6370;">$1</span>'
  );

  // Numbers - light blue
  highlighted = highlighted.replace(
    /\b(\d+\.?\d*)\b/g,
    '<span style="color: #61afef;">$1</span>'
  );

  // Function/method names - cyan
  highlighted = highlighted.replace(
    /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g,
    '<span style="color: #56b6c2;">$1</span>('
  );

  // Class names - yellow
  highlighted = highlighted.replace(
    /\bclass\s+([a-zA-Z_][a-zA-Z0-9_]*)/g,
    'class <span style="color: #e5c07b;">$1</span>'
  );

  return highlighted;
};

const CodeBlock = ({ code, language = "code" }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const highlightedCode = highlightCode(code, language);

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
          <code 
            className="font-mono text-[#d4d4d4] leading-relaxed block"
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
        </pre>
      </div>
    </div>
  );
};

export default CodeBlock;
