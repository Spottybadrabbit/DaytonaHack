
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface DatasetPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: any[] | null;
  isLoading: boolean;
  error: string | null;
}

export function DatasetPreviewModal({
  open,
  onOpenChange,
  data,
  isLoading,
  error
}: DatasetPreviewModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("json");

  const handleCopy = () => {
    if (data) {
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>Dataset Preview</DialogTitle>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2"
              onClick={handleCopy}
              disabled={!data}
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span className="ml-2">{copied ? 'Copied!' : 'Copy'}</span>
            </Button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-red-500 p-4">{error}</div>
        ) : data ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="json">JSON View</TabsTrigger>
              <TabsTrigger value="table">Table View</TabsTrigger>
            </TabsList>

            <TabsContent value="json" className="mt-4">
              <ScrollArea className="h-[calc(80vh-12rem)] w-full rounded-md border">
                <pre className="p-4 text-sm bg-muted rounded-lg whitespace-pre-wrap">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="table" className="mt-4">
              <ScrollArea className="h-[calc(80vh-12rem)] w-full rounded-md border">
                <div className="p-4">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        {data.length > 0 && Object.keys(data[0]).map((key) => (
                          <th key={key} className="px-4 py-2 text-left">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((item, index) => (
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
              </ScrollArea>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-muted-foreground p-4">No data available</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
