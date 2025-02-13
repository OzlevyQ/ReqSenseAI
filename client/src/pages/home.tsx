import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { type AnalyzeResponse } from "@shared/schema";
import ReactMarkdown from 'react-markdown';

export default function Home() {
  const [text, setText] = useState("");
  const { toast } = useToast();

  const analyzeMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/analyze", { text });
      return res.json() as Promise<AnalyzeResponse>;
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

      {analyzeMutation.data && (
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
                  p: ({node, ...props}) => <p className="my-2 text-base leading-relaxed" {...props} />,
                }}
              >
                {analyzeMutation.data.finalAnalysis}
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
        }

        .model-header:hover {
          background-color: #e5e7eb;
        }

        .model-header::after {
          content: "▼";
          margin-left: 0.5rem;
        }

        .model-header + * {
          margin-top: 0.5rem;
          padding: 1rem;
          border-radius: 0.375rem;
          background-color: #f9fafb;
        }
      `}</style>
    </div>
  );
}