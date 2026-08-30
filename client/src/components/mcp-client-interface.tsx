import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import type { WildAgent } from "@/lib/agents";
import { apiRequest } from "@/lib/queryClient";

interface MCPClientInterfaceProps {
  agent: WildAgent;
  onClose?: () => void;
}

interface MCPRunResult {
  success: boolean;
  message?: string;
  data?: {
    results: any[];
    datasetUrl: string;
  };
  error?: string;
}

export default function MCPClientInterface({ agent, onClose }: MCPClientInterfaceProps) {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<MCPRunResult | null>(null);
  const [apiKey, setApiKey] = useState<string>("");
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const { toast } = useToast();

  const handleRunMCP = async () => {
    if (!apiKey && needsApiKey) {
      toast({
        title: "API Key Required",
        description: "Please enter your Apify API key to continue",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest("POST", `/api/agents/${agent._id}/mcp`, {
        config: {
          customParameters: {
            userQuery: query
          }
        }
      });

      if (!response.ok) {
        const error = await response.json();
        
        if (response.status === 500 && error.error?.includes("APIFY_API_KEY")) {
          setNeedsApiKey(true);
          throw new Error("Apify API key is required. Please enter your API key.");
        }
        
        throw new Error(error.error || "Failed to run MCP client");
      }

      const data = await response.json();
      setResult(data);
      
      toast({
        title: "Success",
        description: "MCP client ran successfully",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      setResult({
        success: false,
        error: message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveApiKey = async () => {
    // In a real implementation, we would store this in the user's session
    // or securely in localStorage, but never display it in the UI
    toast({
      title: "API Key Saved",
      description: "Your Apify API key has been temporarily saved for this session",
    });
    
    try {
      // We'd typically send this to the server to be stored in env variables
      // For this demo, we're just saving it in the component state
      setNeedsApiKey(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save API key",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl">MCP Client Interface</CardTitle>
          <CardDescription>
            Connect with the Apify MCP Client to run powerful AI agents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {needsApiKey ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  To use the MCP client, you need to provide your Apify API key. This will be used to 
                  authenticate your requests to the Apify API.
                </p>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="Enter your Apify API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={saveApiKey} disabled={!apiKey}>
                    Save Key
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <h3 className="text-lg font-medium mb-2">Agent: {agent.name}</h3>
                  <p className="text-sm text-muted-foreground">{agent.description}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Your query:</label>
                    <div className="text-xs text-muted-foreground">
                      Ask about social media data, web scraping, or specific data extraction needs
                    </div>
                  </div>
                  <Textarea
                    placeholder="Example: How can I extract product information from an e-commerce website? Or: I need to analyze Instagram posts with the hashtag #AI"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    rows={4}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="font-medium">ℹ️ Tip:</span> Be specific about the data you need, formats preferred, and any filters to apply.
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
        <CardFooter className="justify-between">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
          <Button 
            disabled={isLoading || (needsApiKey && !apiKey) || (!needsApiKey && !query)} 
            onClick={handleRunMCP}
          >
            {isLoading ? <LoadingSpinner size="sm" /> : "Run MCP Client"}
          </Button>
        </CardFooter>
      </Card>

      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size="lg" text="Running MCP client..." />
        </div>
      )}

      {result && !isLoading && (
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <span>AI Agent Response</span>
                {result.success && (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                    Success
                  </span>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.success ? (
              <div className="space-y-4">
                {result.data?.results && result.data.results.length > 0 ? (
                  <div className="space-y-6">
                    {result.data.results.map((item, index) => {
                      // Format JSON data in a more human-readable way
                      const role = item.role || "Unknown";
                      const content = typeof item.content === 'string' 
                        ? item.content 
                        : JSON.stringify(item.content, null, 2);
                        
                      return (
                        <div 
                          key={index} 
                          className={`p-4 rounded-lg ${
                            role === 'user' 
                              ? 'bg-muted/40 border' 
                              : 'bg-primary/5 border-primary/10 border'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`font-medium ${
                              role === 'user' ? 'text-foreground' : 'text-primary'
                            }`}>
                              {role === 'user' ? 'You' : 'AI Assistant'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date().toLocaleTimeString()}
                            </div>
                          </div>
                          <div className="whitespace-pre-wrap text-sm">
                            {content}
                          </div>
                        </div>
                      );
                    })}
                    
                    {result.data.datasetUrl && (
                      <div className="mt-4 flex flex-col sm:flex-row items-center gap-4 justify-between p-4 border rounded-lg bg-muted/30">
                        <div>
                          <h4 className="font-medium">View Complete Results</h4>
                          <p className="text-sm text-muted-foreground">
                            See more detailed conversation and tool usage on Apify
                          </p>
                        </div>
                        <a 
                          href={result.data.datasetUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          View on Apify
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M7 7l10 10M7 17V7h10" />
                          </svg>
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground">No results returned from the AI agent.</p>
                    <p className="text-sm mt-1">Try asking a different question.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-md bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                <h4 className="font-medium mb-1">Error Occurred</h4>
                <p className="text-sm">{result.error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}