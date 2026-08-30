import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface TaskProgressProps {
  status: string;
  startTime?: string;
  duration?: number;
}

export function TaskProgress({ status, startTime, duration }: TaskProgressProps) {
  const [progress, setProgress] = useState(0);
  
  // Calculate progress based on status and time
  useEffect(() => {
    if (status.startsWith('task:') && startTime && duration) {
      const start = new Date(startTime).getTime();
      const now = Date.now();
      const elapsed = (now - start) / 1000;
      const percent = Math.min((elapsed / duration) * 100, 100);
      
      setProgress(percent);
      
      if (percent < 100) {
        const timer = setInterval(() => {
          setProgress(prev => Math.min(prev + 1, 100));
        }, duration * 10);
        
        return () => clearInterval(timer);
      }
    } else if (status === 'idle') {
      setProgress(0);
    } else if (status === 'completed') {
      setProgress(100);
    }
  }, [status, startTime, duration]);

  const steps = [
    { label: 'Starting', value: 0 },
    { label: 'Data Collection', value: 33 },
    { label: 'Processing', value: 66 },
    { label: 'Completed', value: 100 }
  ];

  const currentStep = steps.reduce((prev, curr) => 
    progress >= curr.value ? curr : prev
  );

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Task Progress</h3>
          <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
        </div>

        <Progress value={progress} className="h-2" />

        <div className="relative">
          {/* Progress Steps */}
          <div className="absolute top-0 w-full h-0.5 bg-border" />
          <div className="relative flex justify-between">
            {steps.map((step, index) => (
              <div
                key={step.label}
                className="relative flex flex-col items-center"
              >
                <motion.div
                  initial={false}
                  animate={{
                    scale: progress >= step.value ? 1.2 : 1,
                    backgroundColor: progress >= step.value ? "var(--primary)" : "var(--muted)",
                  }}
                  className="w-4 h-4 rounded-full bg-muted z-10"
                />
                <span className="mt-2 text-sm font-medium text-muted-foreground">
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 text-sm">
          {status === 'completed' ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : status === 'error' ? (
            <XCircle className="h-4 w-4 text-red-500" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
          <span>{currentStep.label}</span>
        </div>
      </div>
    </Card>
  );
}
