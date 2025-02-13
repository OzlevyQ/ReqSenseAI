import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';

export default function Home() {
  const [text, setText] = useState("");
  const [analysisResults, setAnalysisResults] = useState<{[key: string]: string}>({});
  const { toast } = useToast();

  const analyzeMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      setAnalysisResults({}); // Clear previous results

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(5));
              setAnalysisResults(prev => ({
                ...prev,
                [data.phase]: data.content
              }));
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "שגיאה בניתוח הטקסט",
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "נא להזין טקסט לניתוח",
      });
      return;
    }
    analyzeMutation.mutate(text);
  };

  const renderMarkdown = () => {
    const sections = [];

    // Initial Analyses
    if (analysisResults["gemini-prompt"] || analysisResults["gemini-response"]) {
      sections.push(`# שלב ראשון: ניתוח ראשוני\n\n`);

      if (analysisResults["gemini-prompt"]) {
        sections.push(`## Gemini Model ▼\n### הפרומפט:\n${analysisResults["gemini-prompt"]}\n\n`);
      }
      if (analysisResults["gemini-response"]) {
        sections.push(`### התשובה:\n${analysisResults["gemini-response"]}\n\n`);
      }
    }

    if (analysisResults["groq-prompt"] || analysisResults["groq-response"]) {
      sections.push(`## Groq Model ▼\n### הפרומפט:\n${analysisResults["groq-prompt"] || ''}\n\n`);
      if (analysisResults["groq-response"]) {
        sections.push(`### התשובה:\n${analysisResults["groq-response"]}\n\n`);
      }
    }

    if (analysisResults["deepseek-prompt"] || analysisResults["deepseek-response"]) {
      sections.push(`## Deepseek Model ▼\n### הפרומפט:\n${analysisResults["deepseek-prompt"] || ''}\n\n`);
      if (analysisResults["deepseek-response"]) {
        sections.push(`### התשובה:\n${analysisResults["deepseek-response"]}\n\n`);
      }
    }

    // Systems Engineering Analysis
    if (analysisResults["systems-eng-prompt"] || analysisResults["systems-eng-response"]) {
      sections.push(`# שלב שני: ניתוח הנדסי\n\n`);
      sections.push(`## ניתוח דרישות מערכת ▼\n### הפרומפט:\n${analysisResults["systems-eng-prompt"] || ''}\n\n`);
      if (analysisResults["systems-eng-response"]) {
        sections.push(`### התשובה:\n${analysisResults["systems-eng-response"]}\n\n`);
      }
    }

    // Design Engineering Review
    if (analysisResults["design-eng-prompt"] || analysisResults["design-eng-response"]) {
      sections.push(`## סקירת מגבלות תכן ▼\n### הפרומפט:\n${analysisResults["design-eng-prompt"] || ''}\n\n`);
      if (analysisResults["design-eng-response"]) {
        sections.push(`### התשובה:\n${analysisResults["design-eng-response"]}\n\n`);
      }
    }

    // Product Management Summary
    if (analysisResults["pm-prompt"] || analysisResults["pm-response"]) {
      sections.push(`# שלב שלישי: מסמך דרישות סופי\n\n`);
      sections.push(`## מסמך פורמלי ▼\n### הפרומפט:\n${analysisResults["pm-prompt"] || ''}\n\n`);
      if (analysisResults["pm-response"]) {
        sections.push(`### התשובה:\n${analysisResults["pm-response"]}\n\n`);
      }
    }

    return sections.join('');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl" dir="rtl">
      <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
        ניתוח טקסט באמצעות מודלים מרובים
      </h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>הזן טקסט לניתוח</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="הזן את הטקסט שלך כאן..."
              className="min-h-[200px]"
            />
            <Button 
              type="submit" 
              disabled={analyzeMutation.isPending}
              className="w-full"
            >
              {analyzeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  מנתח...
                </>
              ) : (
                "נתח טקסט"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {Object.keys(analysisResults).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>תוצאות הניתוח</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-lg max-w-none dark:prose-invert analysis-content">
              <ReactMarkdown
                components={{
                  h1: ({node, ...props}) => <h1 className="text-3xl font-bold mt-8 mb-4" {...props} />,
                  h2: ({node, ...props}) => (
                    <div 
                      className="text-xl font-semibold mt-6 mb-3 cursor-pointer flex items-center gap-2 model-header"
                      onClick={(e) => {
                        const content = e.currentTarget.nextElementSibling;
                        if (content) {
                          content.classList.toggle('hidden');
                        }
                      }}
                      {...props}
                    />
                  ),
                  h3: ({node, ...props}) => <h3 className="text-lg font-medium my-2" {...props} />,
                  p: ({node, ...props}) => <p className="my-2 text-base leading-relaxed" {...props} />,
                }}
              >
                {renderMarkdown()}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      <style jsx global>{`
        .analysis-content {
          direction: ltr;
        }

        .model-header {
          padding: 0.5rem;
          border-radius: 0.375rem;
          background-color: #f3f4f6;
          transition: background-color 0.2s;
          direction: rtl;
        }

        .model-header:hover {
          background-color: #e5e7eb;
        }

        .model-header::after {
          content: "▼";
          margin-right: 0.5rem;
          display: inline-block;
        }

        .model-header + * {
          margin-top: 0.5rem;
          padding: 1rem;
          border-radius: 0.375rem;
          background-color: #f9fafb;
        }

        .model-header + * h3,
        .model-header + * p {
          direction: auto;
        }
      `}</style>
    </div>
  );
}