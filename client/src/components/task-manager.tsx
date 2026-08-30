
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TaskManagerProps {
  // Supabase UUIDs and migrated legacy ids are both strings.
  agentId: string | number;
  onTaskComplete?: () => void;
}

export function TaskManager({ agentId, onTaskComplete }: TaskManagerProps) {
  const [taskInput, setTaskInput] = useState<any>(null);
  const [taskResults, setTaskResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleRunTask = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", `/api/agents/${agentId}/instagram-task/run`);
      const result = await response.json();
      setTaskResults(result);
      toast({
        title: "Success",
        description: "Task started successfully",
      });
      if (onTaskComplete) {
        onTaskComplete();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to run task",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchTaskInput = async () => {
      try {
        const response = await apiRequest("GET", `/api/agents/${agentId}/instagram-task/input`);
        const data = await response.json();
        setTaskInput(data);
      } catch (error) {
        console.error("Failed to fetch task input:", error);
      }
    };
    fetchTaskInput();
  }, [agentId]);

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-xl font-semibold mb-4">Task Management</h2>
        
        <div className="space-y-4">
          {taskInput && (
            <div>
              <h3 className="text-lg font-medium mb-2">Current Task Input</h3>
              <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                <pre className="text-sm">{JSON.stringify(taskInput, null, 2)}</pre>
              </ScrollArea>
            </div>
          )}

          <div className="flex gap-4">
            <Button
              onClick={handleRunTask}
              disabled={isLoading}
              className="flex-1 bg-green-500 hover:bg-green-600"
            >
              {isLoading ? "Running..." : "Run Task"}
            </Button>
          </div>

          {taskResults && (
            <div>
              <h3 className="text-lg font-medium mb-2">Task Results</h3>
              <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                <pre className="text-sm">{JSON.stringify(taskResults, null, 2)}</pre>
              </ScrollArea>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
