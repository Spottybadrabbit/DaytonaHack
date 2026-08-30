import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useAuth } from "@clerk/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DatasetPreviewModal } from "@/components/dataset-preview-modal";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import type { WildAgent } from "@/lib/agents";
import { ArrowUpRight, DollarSign, Power, Play, Square, History, Database, Settings, Trash2, Loader2, MessageSquare } from "lucide-react";
import { TaskManager } from "@/components/task-manager";
import { StatusIndicator } from "@/components/ui/status-indicator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, getPokemonSpriteUrl } from "@/lib/utils";
import { TaskProgress } from "@/components/task-progress";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Skeleton } from "@/components/ui/skeleton";
import MCPClientInterface from "@/components/mcp-client-interface";

interface TaskRun {
  id: string;
  actId: string;
  taskId: string;
  status: string;
  startedAt: string;
  finishedAt: string;
  buildNumber: string;
  exitCode: number;
  defaultKeyValueStoreId: string;
  defaultDatasetId: string;
  defaultRequestQueueId: string;
  duration: number;
  output?: any;
  error?: {
    name: string;
    message: string;
    stack: string;
  };
}

interface TaskLog {
  time: string;
  type: string;
  message: string;
}

export default function AgentDetails() {
  const { id } = useParams();
  const { toast } = useToast();
  const { getToken } = useAuth();
  const [datasetItems, setDatasetItems] = useState<any[] | null>([{
  "id": "3134220947925888284",
  "type": "Image",
  "caption": "¡Corre por tus sueños de hamburguesa!\n\nPreordena y pre-paga tu comida y conviértete en el campeón de la mesa. 🥇",
  "url": "https://www.instagram.com/p/Ct-_Viote0c/",
  "commentsCount": 2,
  "likesCount": 9,
  "locationName": "Barcelona, Spain",
  "timestamp": "2023-06-27T06:44:34.000Z"
}]);
  const [showDatasetModal, setShowDatasetModal] = useState(false);
  const [datasetError, setDatasetError] = useState<string | null>(null);
  const [isLoadingDataset, setIsLoadingDataset] = useState(false);
  const [taskLogs, setTaskLogs] = useState<TaskLog[]>([]);
  const [showMCPInterface, setShowMCPInterface] = useState(false);

  const agentQuery = useQuery<WildAgent>({
    queryKey: ["agent", id],
    enabled: Boolean(id),
    refetchInterval: 10_000,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/agents/${encodeURIComponent(id!)}`);
      return response.json();
    },
  });
  const agent = agentQuery.data;

  const { data: lastRun } = useQuery<TaskRun>({
    queryKey: [`/api/agents/${id}/instagram-task/last-run`],
    enabled: agent?.platform === 'instagram',
    refetchInterval: agent?.status.startsWith('task:') ? 5000 : false,
  });

  const { data: logs } = useQuery<string>({
    queryKey: [`/api/agents/${id}/instagram-task/logs`],
    enabled: agent?.platform === 'instagram' && agent?.status.startsWith('task:'),
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (typeof logs === 'string' && logs.trim()) {
      const parsedLogs = logs.split('\n')
        .filter((line: string) => line.trim())
        .map((line: string) => {
          const match = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\s+(\w+)\s+(.*)$/);
          if (match) {
            return {
              time: match[1],
              type: match[2],
              message: match[3],
            };
          }
          return null;
        })
        .filter((log): log is TaskLog => log !== null);
      setTaskLogs(parsedLogs);
    }
  }, [logs]);

  if (!agent) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div>
              <Skeleton variant="title" />
              <Skeleton className="mt-2 w-[150px]" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="rounded-none border-foreground/10 bg-foreground/[0.02] shadow-none">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <Skeleton variant="title" />
                    <Skeleton />
                    <Skeleton />
                    <div className="flex gap-2">
                      <Skeleton className="flex-1 h-10" />
                      <Skeleton className="flex-1 h-10" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="rounded-none border-foreground/10 bg-foreground/[0.02] shadow-none">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <Skeleton variant="title" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="w-[100px]" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleToggleActive = async () => {
    try {
      await apiRequest("PATCH", `/api/agents/${agent._id}`, {
        status: agent.isActive ? "idle" : "running",
        isActive: !agent.isActive,
      }, await getToken());
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["agent", id] }),
        queryClient.invalidateQueries({ queryKey: ["agents-mine"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/agents"] }),
      ]);
      toast({
        title: agent.isActive ? "Agent deactivated" : "Agent activated",
        description: `${agent.name} is now ${agent.isActive ? "idle" : "running"}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle agent status",
        variant: "destructive",
      });
    }
  };

  const handleRunTask = async () => {
    try {
      await apiRequest(
        "POST",
        `/api/agents/${agent._id}/instagram-task/run`,
        undefined,
        await getToken(),
      );
      toast({
        title: "Success",
        description: "Instagram task started successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start Instagram task",
        variant: "destructive",
      });
    }
  };

  const handleAbortTask = async () => {
    try {
      const runId = agent.status.startsWith('task:') ? agent.status.split(':')[1] : null;
      if (!runId) {
        throw new Error('No active run to abort');
      }
      const response = await apiRequest(
        "POST",
        `/api/agents/${agent._id}/instagram-task/abort`,
        undefined,
        await getToken(),
      );
      if (!response.ok) {
        throw new Error("Failed to abort task");
      }


      toast({
        title: "Success",
        description: "Agent aborted and returned to idle state",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to abort task",
        variant: "destructive",
      });
    }
  };

  const handleGetLastRunDataset = async () => {
    setIsLoadingDataset(true);
    setDatasetError(null);
    setDatasetItems(null);
    setShowDatasetModal(true);
    
    try {
      console.log(`[API Request] Getting dataset items for agent ${agent._id}`);
      const response = await apiRequest("GET", `/api/agents/${agent._id}/instagram-task/dataset-items`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch dataset: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid response format');
      }
      
      console.log('Results from dataset:', result.data);
      setDatasetItems(result.data || []);
      
      toast({
        title: "Success",
        description: `Retrieved ${result.data?.length || 0} items from last run`,
      });
    } catch (error: any) {
      console.error('Dataset fetch error:', error);
      setDatasetError(error.message || 'Failed to fetch dataset items');
      toast({
        title: "Error",
        description: error.message || "Failed to get dataset items",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDataset(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col gap-6 container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 shrink-0 flex items-center justify-center border border-foreground/10 bg-foreground/[0.04]">
            <img
              src={getPokemonSpriteUrl(agent.spriteUrl)}
              alt={`${agent.name} creature`}
              className="w-full h-full object-contain p-2"
              style={{ imageRendering: "pixelated" }}
            />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-display">{agent.name}</h1>
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mt-1.5">{agent.type}</p>
          </div>
        </div>

        <Card className="rounded-none border-foreground/10 bg-foreground/[0.02] shadow-none">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-display">Status</h2>
              <Power className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="mb-4">
              <StatusIndicator status={agent.status} />
            </div>
            {agent.platform === "daytona" ? (
              <div className="border-t border-foreground/10 pt-4">
                {agent.status === "published" && agent.apiEndpoint ? (
                  <Button asChild className="w-full rounded-none bg-foreground text-background hover:bg-foreground/90">
                    <a href={agent.apiEndpoint} target="_blank" rel="noopener noreferrer">
                      Open live app
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {agent.status === "error"
                      ? "This build stopped before it could be published."
                      : "Claude Code is building this app in its Daytona sandbox."}
                  </p>
                )}
              </div>
            ) : <>
              <div className="flex gap-2 mb-2">
                <Button
                  className={`flex-1 rounded-none ${
                    agent.isActive
                      ? "border border-foreground/20 bg-transparent text-foreground hover:border-foreground hover:bg-foreground/5"
                      : "bg-foreground text-background hover:bg-foreground/90"
                  }`}
                  variant={agent.isActive ? "outline" : "default"}
                  onClick={handleToggleActive}
                >
                  {agent.isActive ? "Deactivate" : "Activate"} Agent
                </Button>
                <Button
                  variant="outline"
                  onClick={handleAbortTask}
                  className="flex-1 rounded-none border-red-400/30 text-red-400 hover:border-red-400/60 hover:bg-red-400/5"
                  disabled={!agent.status.startsWith('task:')}
                >
                  <Square className="h-4 w-4 mr-2" />
                  Abort Agent
                </Button>
              </div>
              <Button
                className="w-full rounded-none border-foreground/20 hover:border-foreground hover:bg-foreground/5"
                variant="outline"
                onClick={() => setShowMCPInterface(true)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Open MCP Client Interface
              </Button>
            </>}
          </CardContent>
        </Card>

        {agent.platform === 'instagram' && (
          <>
            <Card className="rounded-none border-foreground/10 bg-foreground/[0.02] shadow-none">
              <CardContent className="pt-6">
                <h2 className="text-xl font-display mb-4">Task Controls</h2>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    className="w-full rounded-none"
                    onClick={handleRunTask}
                    disabled={agent.status.startsWith('task:')}
                    variant="default"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Run Task
                  </Button>

                  <Button
                    variant="destructive"
                    className="w-full rounded-none"
                    onClick={handleAbortTask}
                    disabled={!agent.status.startsWith('task:')}
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Abort Task
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full rounded-none"
                    onClick={handleGetLastRunDataset}
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Dataset Items
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full rounded-none"
                    onClick={() => {
                      apiRequest("GET", `/api/agents/${id}/instagram-task/runs`)
                        .then(response => response.json())
                        .then(data => {
                          console.log('Task runs:', data);
                          toast({
                            title: "Success",
                            description: `Retrieved ${data.items?.length || 0} task runs`
                          });
                        })
                        .catch(error => {
                          toast({
                            title: "Error",
                            description: "Failed to get task runs",
                            variant: "destructive"
                          });
                        });
                    }}
                  >
                    <History className="h-4 w-4 mr-2" />
                    View Runs
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full rounded-none"
                    onClick={() => {
                      apiRequest("GET", `/api/agents/${id}/instagram-task/input`)
                        .then(response => response.json())
                        .then(data => {
                          console.log('Task input:', data);
                          toast({
                            title: "Success",
                            description: "Retrieved task input settings"
                          });
                        })
                        .catch(error => {
                          toast({
                            title: "Error",
                            description: "Failed to get task input",
                            variant: "destructive"
                          });
                        });
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    View Input
                  </Button>

                  <Button
                    variant="destructive"
                    className="w-full rounded-none"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this task?')) {
                        apiRequest("DELETE", `/api/agents/${id}/instagram-task`)
                          .then(() => {
                            toast({
                              title: "Success",
                              description: "Task deleted successfully"
                            });
                          })
                          .catch(error => {
                            toast({
                              title: "Error",
                              description: "Failed to delete task",
                              variant: "destructive"
                            });
                          });
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Task
                  </Button>
                </div>
              </CardContent>
            </Card>
             {agent.status.startsWith('task:') && lastRun && (
              <TaskProgress 
                status={agent.status}
                startTime={lastRun.startedAt}
                duration={lastRun.duration || 300}
              />
            )}
            {/* Task Logs */}
            {agent.status.startsWith('task:') && (
              <Card className="rounded-none border-foreground/10 bg-foreground/[0.02] shadow-none">
                <CardContent className="pt-6">
                  <h2 className="text-xl font-display mb-4">Live Task Logs</h2>
                  <ScrollArea className="h-[400px] w-full border border-foreground/10 p-4">
                    <div className="space-y-2 font-mono text-sm">
                      {taskLogs.map((log, index) => (
                        <div 
                          key={index} 
                          className={cn(
                            "flex items-start gap-2",
                            log.type === 'ERROR' && 'text-red-500',
                            log.type === 'INFO' && 'text-muted-foreground',
                            log.type === 'WARNING' && 'text-amber-400'
                          )}
                        >
                          <span className="text-muted-foreground">
                            {new Date(log.time).toLocaleTimeString()}
                          </span>
                          <span className="font-semibold">{log.type}</span>
                          <span>{log.message}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Dataset Preview Modal */}
            <DatasetPreviewModal
              open={showDatasetModal}
              onOpenChange={setShowDatasetModal}
              data={datasetItems}
              isLoading={isLoadingDataset}
              error={datasetError}
            />
            
            {/* MCP Client Interface Dialog */}
            <Dialog open={showMCPInterface} onOpenChange={setShowMCPInterface}>
              <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle>Apify MCP Client</DialogTitle>
                  <DialogDescription>
                    Connect with the Apify MCP Client for {agent.name}
                  </DialogDescription>
                </DialogHeader>
                <MCPClientInterface agent={agent} onClose={() => setShowMCPInterface(false)} />
              </DialogContent>
            </Dialog>
            {/* Task Manager */}
            <TaskManager
              agentId={agent._id}
              onTaskComplete={() => {
                // The core Supabase agent query polls separately; this only
                // refreshes the legacy task-run pane.
                queryClient.invalidateQueries({ queryKey: [`/api/agents/${id}/instagram-task/last-run`] });
              }}
            />

            {/* Last Run Information */}
            {lastRun && (
              <Card className="rounded-none border-foreground/10 bg-foreground/[0.02] shadow-none">
                <CardContent className="pt-6">
                  <h2 className="text-xl font-display mb-4">Last Run Status</h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground pt-0.5">Status:</div>
                      <div className="text-muted-foreground">{lastRun.status}</div>

                      <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground pt-0.5">Started:</div>
                      <div className="text-muted-foreground">{formatDate(lastRun.startedAt)}</div>

                      <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground pt-0.5">Finished:</div>
                      <div className="text-muted-foreground">{lastRun.finishedAt ? formatDate(lastRun.finishedAt) : 'Running...'}</div>

                      <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground pt-0.5">Duration:</div>
                      <div className="text-muted-foreground">{lastRun.duration}s</div>

                      <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground pt-0.5">Build:</div>
                      <div className="text-muted-foreground">#{lastRun.buildNumber}</div>
                    </div>

                    {lastRun.error && (
                      <div className="border border-red-400/30 bg-red-400/5 text-red-400 p-4 mt-4">
                        <div className="text-xs font-mono uppercase tracking-widest mb-2">Error</div>
                        <div className="text-sm">{lastRun.error.message}</div>
                        <pre className="mt-2 text-xs overflow-auto font-mono">{lastRun.error.stack}</pre>
                      </div>
                    )}

                    {lastRun.output && (
                      <div className="border border-foreground/15 bg-foreground/[0.03] p-4 mt-4">
                        <div className="text-xs font-mono uppercase tracking-widest mb-2 text-muted-foreground">Output</div>
                        <pre className="text-xs overflow-auto font-mono">
                          {JSON.stringify(lastRun.output, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
         {agent.platform === 'instagram' && (
        <>
          {/* Dataset Preview Section */}
          <Card className="mt-6 rounded-none border-foreground/10 bg-foreground/[0.02] shadow-none">
            <CardContent className="pt-6">
              <h2 className="text-xl font-display mb-4">Dataset Preview</h2>
              <ScrollArea className="h-[400px] w-full border border-foreground/10 p-4">
                {isLoadingDataset ? (
                  <div className="space-y-4">
                    <LoadingSpinner 
                      size="lg"
                      text="Loading dataset items..."
                      className="text-primary"
                    />
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton 
                          key={i}
                          className="h-[100px] w-full"
                          variant="card"
                        />
                      ))}
                    </div>
                  </div>
                ) : datasetError ? (
                  <div className="text-red-500 p-4">{datasetError}</div>
                ) : datasetItems ? (
                  <div className="space-y-4">
                    {datasetItems.map((item, index) => (
                      <div key={index} className="p-4 bg-foreground/[0.03] border border-foreground/10">
                        <pre className="text-sm overflow-auto whitespace-pre-wrap">
                          {JSON.stringify(item, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground p-4">
                    No dataset items available. Click "Dataset Items" to load data.
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}

        {/* Permanent Dataset View */}
        {agent.platform !== "daytona" && <Card className="rounded-none border-foreground/10 bg-foreground/[0.02] shadow-none">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-display">Dataset Results</h2>
              <Button
                variant="outline"
                size="sm"
                className="rounded-none border-foreground/20"
                onClick={() => {
                  if (datasetItems) {
                    navigator.clipboard.writeText(JSON.stringify(datasetItems, null, 2));
                    toast({
                      title: "Success",
                      description: "Dataset copied to clipboard",
                    });
                  }
                }}
                disabled={!datasetItems}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy JSON
              </Button>
            </div>
            <div className="mt-4">
              <Tabs defaultValue="json" className="w-full rounded-none">
                <TabsList className="grid w-full grid-cols-2 rounded-none">
                  <TabsTrigger value="json" className="rounded-none">JSON View</TabsTrigger>
                  <TabsTrigger value="table" className="rounded-none">Table View</TabsTrigger>
                </TabsList>
                <TabsContent value="json">
                  <ScrollArea className="h-[400px] w-full border border-foreground/10">
                    {datasetItems ? (
                      <pre className="p-4 text-sm font-mono bg-foreground/[0.03] whitespace-pre-wrap">
                        {JSON.stringify(datasetItems, null, 2)}
                      </pre>
                    ) : (
                      <div className="p-4 text-muted-foreground">
                        No dataset items available. Click "Dataset Items" to load data.
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="table">
                  <ScrollArea className="h-[400px] w-full border border-foreground/10">
                    {datasetItems && datasetItems.length > 0 ? (
                      <div className="p-4">
                        <table className="w-full rounded-none">
                          <thead>
                            <tr className="border-b">
                              {Object.keys(datasetItems[0]).map((key) => (
                                <th key={key} className="px-4 py-2 text-left text-xs font-mono uppercase tracking-widest text-muted-foreground">{key}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {datasetItems.map((item, index) => (
                              <tr key={index} className="border-b">
                                {Object.values(item).map((value: any, i) => (
                                  <td key={i} className="px-4 py-2">
                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-4 text-muted-foreground">
                        No dataset items available
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>}
          </div>
          <div className="space-y-6">
            <Card className="rounded-none border-foreground/10 bg-foreground/[0.02] shadow-none">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-display">Pricing</h2>
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-4xl font-display">${agent.price}</p>
                <p className="text-sm text-muted-foreground mt-1">per month</p>
                <Button className="w-full mt-4 rounded-none bg-foreground text-background hover:bg-foreground/90">
                  Purchase Agent
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
