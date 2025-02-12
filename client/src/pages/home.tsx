import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { type AnalyzeResponse } from "@shared/schema";

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
        title: "Error analyzing text",
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter some text to analyze",
      });
      return;
    }
    analyzeMutation.mutate(text);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
        Multi-Model AI Text Analysis
      </h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Enter Text to Analyze</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter your text here..."
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
                  Analyzing...
                </>
              ) : (
                "Analyze Text"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {analyzeMutation.data && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Gemini Analysis</h3>
              <p className="text-gray-700">{analyzeMutation.data.results.gemini}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Groq Analysis</h3>
              <p className="text-gray-700">{analyzeMutation.data.results.groq}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Deepseek Analysis</h3>
              <p className="text-gray-700">{analyzeMutation.data.results.deepseek}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
