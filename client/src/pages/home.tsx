import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

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

  const renderContent = () => {
    const sections = [];

    // Initial Analyses
    if (analysisResults["gemini-prompt"] || analysisResults["gemini-response"]) {
      sections.push({
        title: "שלב ראשון: ניתוח ראשוני",
        items: [
          {
            title: "Gemini Model",
            prompt: analysisResults["gemini-prompt"],
            response: analysisResults["gemini-response"]
          },
          {
            title: "Groq Model",
            prompt: analysisResults["groq-prompt"],
            response: analysisResults["groq-response"]
          },
          {
            title: "Deepseek Model",
            prompt: analysisResults["deepseek-prompt"],
            response: analysisResults["deepseek-response"]
          }
        ]
      });
    }

    // Systems Engineering Analysis
    if (analysisResults["systems-eng-prompt"] || analysisResults["systems-eng-response"]) {
      sections.push({
        title: "שלב שני: ניתוח הנדסי",
        items: [
          {
            title: "ניתוח דרישות מערכת",
            prompt: analysisResults["systems-eng-prompt"],
            response: analysisResults["systems-eng-response"]
          },
          {
            title: "סקירת מגבלות תכן",
            prompt: analysisResults["design-eng-prompt"],
            response: analysisResults["design-eng-response"]
          }
        ]
      });
    }

    // Product Management Summary
    if (analysisResults["pm-prompt"] || analysisResults["pm-response"]) {
      sections.push({
        title: "שלב שלישי: מסמך דרישות סופי",
        items: [
          {
            title: "מסמך פורמלי",
            prompt: analysisResults["pm-prompt"],
            response: analysisResults["pm-response"]
          }
        ]
      });
    }

    return sections;
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
          <CardContent className="space-y-6">
            {renderContent().map((section, sectionIdx) => (
              <div key={sectionIdx} className="space-y-4">
                <h2 className="text-2xl font-bold text-primary">{section.title}</h2>
                <Accordion type="single" collapsible className="w-full">
                  {section.items.map((item, itemIdx) => (
                    <AccordionItem value={`${sectionIdx}-${itemIdx}`} key={itemIdx}>
                      <AccordionTrigger className="text-xl font-semibold">
                        {item.title}
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        {item.prompt && (
                          <div className="bg-muted/50 p-4 rounded-lg">
                            <h3 className="text-lg font-medium mb-2">הפרומפט:</h3>
                            <div className="text-sm text-muted-foreground">
                              {item.prompt}
                            </div>
                          </div>
                        )}
                        {item.response && (
                          <div className="bg-card p-4 rounded-lg border">
                            <h3 className="text-lg font-medium mb-2">התשובה:</h3>
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                              <ReactMarkdown>
                                {item.response}
                              </ReactMarkdown>
                            </div>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}