import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StatusIndicatorProps {
  status: string;
  className?: string;
}

export function StatusIndicator({ status, className }: StatusIndicatorProps) {
  const getStatusConfig = (status: string) => {
    const defaultConfig = {
      icon: AlertCircle,
      iconClass: "text-yellow-500",
      bgClass: "bg-yellow-100",
      textClass: "text-yellow-800",
      text: status,
      animate: false
    };

    switch (status.toLowerCase()) {
      case "running":
        return {
          icon: Loader2,
          iconClass: "text-blue-500",
          bgClass: "bg-blue-100",
          textClass: "text-blue-800",
          text: "Running",
          animate: true
        };
      case "building":
        return {
          icon: Loader2,
          iconClass: "text-[#eca8d6]",
          bgClass: "bg-[#eca8d6]/10",
          textClass: "text-foreground",
          text: "Building",
          animate: true
        };
      case "published":
        return {
          icon: CheckCircle2,
          iconClass: "text-emerald-500",
          bgClass: "bg-emerald-500/10",
          textClass: "text-emerald-700 dark:text-emerald-300",
          text: "Published",
          animate: false
        };
      case "idle":
        return {
          icon: CheckCircle2,
          iconClass: "text-green-500",
          bgClass: "bg-green-100",
          textClass: "text-green-800",
          text: "Idle",
          animate: false
        };
      case "error":
        return {
          icon: XCircle,
          iconClass: "text-red-500",
          bgClass: "bg-red-100",
          textClass: "text-red-800",
          text: "Error",
          animate: false
        };
      default:
        if (status.startsWith("task:")) {
          return {
            icon: Loader2,
            iconClass: "text-purple-500",
            bgClass: "bg-purple-100",
            textClass: "text-purple-800",
            text: "Task Running",
            animate: true
          };
        }
        return defaultConfig;
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        className={cn("flex items-center gap-2", className)}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
      >
        <motion.span 
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
            config.bgClass,
            config.textClass,
            config.animate && "animate-pulse"
          )}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.span 
            className="inline-block"
            animate={config.animate ? { 
              rotate: 360 
            } : undefined}
            transition={config.animate ? { 
              duration: 1,
              repeat: Infinity,
              ease: "linear"
            } : undefined}
          >
            <Icon className={cn("h-4 w-4", config.iconClass)} />
          </motion.span>
          {config.text}
        </motion.span>
      </motion.div>
    </AnimatePresence>
  );
}
