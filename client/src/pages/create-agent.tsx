import { useState } from "react";
import { useAuth } from "@clerk/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { insertAgentSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { WildAgent } from "@/lib/agents";
import { getRandomTechPokemonId } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocation } from "wouter";
import { ArrowUpRight, Check, Loader2 } from "lucide-react";
import { z } from "zod";

const agentTypes = [
  "Analytics",
  "Finance",
  "Creative",
  "Academic",
  "Development",
  "Automation",
  "Research",
];

const dataSources = [
  "website",
  "ecommerce",
  "maps",
  "search",
  "api",
] as const;

const resultTypes = ["structured", "raw", "parsed"] as const;
const searchTypes = ["keyword", "category", "element"] as const;

type FormStep = "basics" | "platform-config" | "review";
type BuilderStatus = "creating" | "building" | "published" | "error";

const builderResponseSchema = z.object({
  status: z.enum(["building", "published", "error"]),
  logs: z.string(),
  previewUrl: z.string().url().optional(),
  error: z.string().optional(),
});

async function responseError(response: Response, fallback: string) {
  const text = await response.text();
  try {
    return JSON.parse(text).error || fallback;
  } catch {
    return text || fallback;
  }
}

interface CreateAgentInput {
  name: string;
  description: string;
  price: string;
  type: string;
  spriteUrl: string | null;
  platform: string | null;
  platformConfig: string | null;
}

export default function CreateAgentPage() {
  const [step, setStep] = useState<FormStep>("basics");
  const [datasetItems, setDatasetItems] = useState<any[] | null>(null);
  const [showDatasetModal, setShowDatasetModal] = useState(false);
  const [datasetError, setDatasetError] = useState<string | null>(null);
  const [isLoadingDataset, setIsLoadingDataset] = useState(false);
  const [canRedirect, setCanRedirect] = useState(false);
  const [showBuilderModal, setShowBuilderModal] = useState(false);
  const [builderStatus, setBuilderStatus] = useState<BuilderStatus>("creating");
  const [builderLogs, setBuilderLogs] = useState("");
  const [builderError, setBuilderError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const { getToken } = useAuth();
  const [, setLocation] = useLocation();

  const createAgent = async (input: CreateAgentInput, token?: string | null) => {
    const authToken = token ?? await getToken();
    if (!authToken) throw new Error("Your session expired. Sign in again to create an agent.");
    const response = await apiRequest("POST", "/api/agents", input, authToken);
    const agent = await response.json() as WildAgent;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["agents-mine"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] }),
      queryClient.invalidateQueries({ queryKey: ["account-snapshot"] }),
    ]);
    return agent._id;
  };

  const form = useForm({
    resolver: zodResolver(
      insertAgentSchema.extend({
        platform: z.enum(dataSources).optional(),
        targetUrls: z.string().optional(),
        resultsType: z.enum(resultTypes).optional(),
        searchType: z.enum(searchTypes).optional(),
        searchTerm: z.string().optional(),
        resultsLimit: z.string().optional(),
      })
    ),
    defaultValues: {
      name: "",
      description: "",
      type: "",
      price: "",
      platform: undefined,
      platformConfig: "",
      targetUrls: "",
      resultsType: "structured",
      searchType: "keyword",
      searchTerm: "",
      resultsLimit: "100",
    },
  });

  const onSubmit = async (data: any) => {
    try {
      // Make a copy of the data for submission
      const agentData = { ...data };

      if (data.type === "Development") {
        setBuilderStatus("creating");
        setBuilderLogs("");
        setBuilderError(null);
        setPreviewUrl(null);
        setShowBuilderModal(true);

        const token = await getToken();
        if (!token) throw new Error("Your session expired. Sign in again to start a build.");

        const agentId = await createAgent({
          name: agentData.name,
          description: agentData.description,
          price: String(agentData.price),
          type: agentData.type,
          spriteUrl: getRandomTechPokemonId(),
          platform: "daytona",
          platformConfig: JSON.stringify({ provider: "daytona" }),
        }, token);

        setBuilderStatus("building");
        const buildResponse = await fetch("/api/builder/build", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ agentId, prompt: agentData.description }),
        });
        if (!buildResponse.ok) {
          throw new Error(await responseError(buildResponse, "Failed to start the Daytona build."));
        }

        for (let attempt = 0; attempt < 400; attempt += 1) {
          const statusResponse = await fetch(
            `/api/builder/status?agentId=${encodeURIComponent(agentId)}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (!statusResponse.ok) {
            if (statusResponse.status >= 500) {
              await new Promise((resolve) => window.setTimeout(resolve, 1500));
              continue;
            }
            throw new Error(await responseError(statusResponse, "Failed to read the build status."));
          }

          const result = builderResponseSchema.parse(await statusResponse.json());
          setBuilderStatus(result.status);
          setBuilderLogs(result.logs);
          setBuilderError(result.error ?? null);
          setPreviewUrl(result.previewUrl ?? null);

          if (result.status === "published") {
            toast({
              title: "Agent published",
              description: `${agentData.name} is live and ready to roam.`,
            });
            break;
          }
          if (result.status === "error") {
            throw new Error(result.error || "The build failed. Check the live logs for details.");
          }

          await new Promise((resolve) => window.setTimeout(resolve, 1500));
        }
        throw new Error("The build is still running. Track it from your dashboard.");
      }
      
      // If website is selected, run the task synchronously first
      if (data.type === "Creative" && data.platform === "website") {
        const urls = data.targetUrls
          ? data.targetUrls.split('\n').filter(Boolean)
          : [];

        const taskConfig = {
          addParentData: false,
          directUrls: urls,
          resultsLimit: parseInt(data.resultsLimit || "100"),
          resultsType: data.resultsType || "structured",
          searchLimit: 1,
          searchType: data.searchType || "keyword",
          search: data.searchTerm || "",
          memory: 1024,
          timeout: 604800,
          build: "latest"
        };

        // Run task synchronously and get dataset items
        console.log('[Web Scraping Task] Starting with config:', taskConfig);
        setIsLoadingDataset(true);
        setDatasetError(null);
        setDatasetItems(null);
        setShowDatasetModal(true);

        try {
          console.log(`[API Request] Running synchronous task with config:`, taskConfig);
          const taskResponse = await fetch('/api/agents/web-task/run-sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(taskConfig)
          });

          // Extract response text for better error handling
          const responseText = await taskResponse.text();
          
          if (!taskResponse.ok) {
            throw new Error(`Failed to execute web scraping task: ${responseText}`);
          }

          // Parse the result
          let result;
          try {
            result = JSON.parse(responseText);
          } catch (e) {
            throw new Error('Invalid response format: ' + responseText);
          }

          if (!result || typeof result !== 'object') {
            throw new Error('Invalid response format: ' + responseText);
          }

          console.log('Results from task:', result.data);
          setDatasetItems(result.data || []);

          // Store the task configuration
          agentData.platformConfig = JSON.stringify(taskConfig);

          await createAgent({
            name: agentData.name,
            description: agentData.description,
            price: String(agentData.price),
            type: agentData.type,
            spriteUrl: getRandomTechPokemonId(),
            platform: agentData.platform ?? null,
            platformConfig: agentData.platformConfig || null,
          });

          toast({
            title: "Success",
            description: `Agent created successfully with ${result.data?.length || 0} dataset items`,
          });

          // Set flag that allows redirect after modal is closed
          setCanRedirect(true);
        } catch (error: any) {
          console.error('Task execution error:', error);
          setDatasetError(error.message || 'Failed to execute web scraping task');
          toast({
            title: "Error",
            description: error.message || "Failed to execute web scraping task",
            variant: "destructive",
          });
        } finally {
          setIsLoadingDataset(false);
        }
      } else {
        // For other agent types, create directly
        console.log("Creating general agent with data:", agentData);
        
        if (data.platform) {
          // Ensure the platform data is properly formatted
          agentData.platformConfig = JSON.stringify({
            platform: data.platform,
            // Add basic configuration
            enabled: true,
            timestamp: new Date().toISOString()
          });
        }
        
        await createAgent({
          name: agentData.name,
          description: agentData.description,
          price: String(agentData.price),
          type: agentData.type,
          spriteUrl: getRandomTechPokemonId(),
          platform: agentData.platform ?? null,
          platformConfig: agentData.platformConfig || null,
        });
        toast({
          title: "Success",
          description: "Agent created successfully",
        });
        setLocation("/dashboard");
      }
    } catch (error: any) {
      console.error("Error creating agent:", error);
      if (data.type === "Development") {
        setBuilderStatus("error");
        setBuilderError(error.message || "Failed to build agent");
      }
      toast({
        title: "Error",
        description: error.message || "Failed to create agent",
        variant: "destructive",
      });
    }
  };

  const handleModalClose = (open: boolean) => {
    setShowDatasetModal(open);
    if (!open && canRedirect) {
        setLocation("/dashboard");
    }
  };

  const handleBuilderModalClose = (open: boolean) => {
    setShowBuilderModal(open);
    if (!open) setLocation("/dashboard");
  };

  const nextStep = () => {
    if (step === "basics") {
      if (form.getValues("type") === "Creative" && form.getValues("platform") === "website") {
        setStep("platform-config");
      } else {
        setStep("review");
      }
    } else if (step === "platform-config") {
      setStep("review");
    }
  };

  const prevStep = () => {
    if (step === "platform-config") setStep("basics");
    else if (step === "review") {
      if (form.getValues("type") === "Creative" && form.getValues("platform") === "website") {
        setStep("platform-config");
      } else {
        setStep("basics");
      }
    }
  };

  const selectedType = form.watch("type");

  const stepLabels: { key: FormStep; label: string }[] = [
    { key: "basics", label: "01 — Basics" },
    { key: "platform-config", label: "02 — Habitat" },
    { key: "review", label: "03 — Release" },
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 lg:py-24">
      <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-8">
        <span className="w-12 h-px bg-foreground/30" />
        FIELD LAB
      </span>
      <h1 className="text-5xl lg:text-7xl font-display mb-5">
        Raise something <span className="text-stroke">wild.</span>
      </h1>
      <p className="text-lg text-muted-foreground max-w-xl mb-14">
        Every agent starts here. Give it a name, teach it where to hunt, and
        release it into the wild to work for you.
      </p>

      <div className="max-w-2xl">
        <div className="flex items-center gap-6 mb-6 font-mono text-xs uppercase tracking-widest">
          {stepLabels.map((s) => (
            <span
              key={s.key}
              className={step === s.key ? "text-foreground" : "text-muted-foreground/50"}
            >
              {s.label}
            </span>
          ))}
        </div>
        <div className="border border-foreground/10 bg-foreground/[0.02] p-6 lg:p-10">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {step === "basics" && (
                  <>
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Agent Name</FormLabel>
                          <FormControl>
                            <Input className="rounded-none bg-foreground/[0.02] border-foreground/15" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                            {selectedType === "Development" ? "Build brief" : "Description"}
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              className="rounded-none bg-foreground/[0.02] border-foreground/15"
                              placeholder={selectedType === "Development" ? "Describe the app Claude Code should build and publish" : undefined}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="rounded-none bg-foreground/[0.02] border-foreground/15">
                                <SelectValue placeholder="Select agent type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-none border-foreground/15">
                              {agentTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {selectedType !== "Development" && (
                      <FormField
                        control={form.control}
                        name="platform"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Data Source</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="rounded-none bg-foreground/[0.02] border-foreground/15">
                                  <SelectValue placeholder="Select platform" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="rounded-none border-foreground/15">
                                {dataSources.map((source) => (
                                  <SelectItem key={source} value={source}>
                                    {source.charAt(0).toUpperCase() + source.slice(1)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {selectedType === "Development" && (
                      <div className="border border-[#eca8d6]/30 bg-[#eca8d6]/5 p-4">
                        <p className="text-xs font-mono uppercase tracking-widest mb-2">Daytona habitat</p>
                        <p className="text-sm text-muted-foreground">
                          Claude Code will turn your brief into a public app inside an isolated Daytona sandbox.
                        </p>
                      </div>
                    )}

                    {selectedType === "Creative" && (
                      <FormField
                        control={form.control}
                        name="platform"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Data Source</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="rounded-none bg-foreground/[0.02] border-foreground/15">
                                  <SelectValue placeholder="Select data source" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="rounded-none border-foreground/15">
                                {dataSources.map((source) => (
                                  <SelectItem key={source} value={source}>
                                    {source.charAt(0).toUpperCase() + source.slice(1)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Price (USD)</FormLabel>
                          <FormControl>
                            <Input className="rounded-none bg-foreground/[0.02] border-foreground/15" type="number" min="0" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {step === "platform-config" && (
                  <>
                    <div className="border border-foreground/10 bg-foreground/[0.03] p-4 mb-6">
                      <p className="text-sm text-muted-foreground">
                        Mark out the hunting grounds. Your creature will use
                        these settings to know where to roam and what to bring back.
                      </p>
                    </div>

                    <FormField
                      control={form.control}
                      name="targetUrls"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Target URLs (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              className="rounded-none bg-foreground/[0.02] border-foreground/15"
                              placeholder="Enter website URLs to scrape (one per line)"
                              {...field}
                            />
                          </FormControl>
                          <p className="text-sm text-muted-foreground mt-1">
                            Enter the URLs you want to scrape (one per line)
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="searchType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Search Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="rounded-none bg-foreground/[0.02] border-foreground/15">
                                <SelectValue placeholder="Select search type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-none border-foreground/15">
                              {searchTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {typeof type === 'string' ? type.charAt(0).toUpperCase() + type.slice(1) : type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="searchTerm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Search Term</FormLabel>
                          <FormControl>
                            <Input className="rounded-none bg-foreground/[0.02] border-foreground/15" {...field} placeholder="e.g., tech or username" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="resultsType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Results Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="rounded-none bg-foreground/[0.02] border-foreground/15">
                                <SelectValue placeholder="Select results type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-none border-foreground/15">
                              {resultTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {typeof type === 'string' ? type.charAt(0).toUpperCase() + type.slice(1) : type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="resultsLimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Results Limit</FormLabel>
                          <FormControl>
                            <Input className="rounded-none bg-foreground/[0.02] border-foreground/15" type="number" min="1" max="1000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {step === "review" && (
                  <div className="space-y-4">
                    <h3 className="text-2xl font-display">One last look before release</h3>
                    <div className="grid gap-2">
                      <p><span className="font-mono text-xs uppercase tracking-widest text-muted-foreground mr-2">Name:</span> {form.getValues("name")}</p>
                      <p><span className="font-mono text-xs uppercase tracking-widest text-muted-foreground mr-2">Type:</span> {form.getValues("type")}</p>
                      <p><span className="font-mono text-xs uppercase tracking-widest text-muted-foreground mr-2">Price:</span> ${form.getValues("price")}</p>
                      <p><span className="font-mono text-xs uppercase tracking-widest text-muted-foreground mr-2">Description:</span> {form.getValues("description")}</p>
                      {form.getValues("type") === "Development" ? (
                        <p><span className="font-mono text-xs uppercase tracking-widest text-muted-foreground mr-2">Habitat:</span> Daytona sandbox + Claude Code</p>
                      ) : (() => {
                        const platformValue = form.getValues("platform");
                        if (typeof platformValue === 'string') {
                          // Cast to string after type check
                          const platformString = platformValue as string;
                          return (
                            <>
                              <p><span className="font-mono text-xs uppercase tracking-widest text-muted-foreground mr-2">Data Source:</span> {platformString.charAt(0).toUpperCase() + platformString.slice(1)}</p>
                              <p><span className="font-mono text-xs uppercase tracking-widest text-muted-foreground mr-2">Search Type:</span> {form.getValues("searchType")}</p>
                              <p><span className="font-mono text-xs uppercase tracking-widest text-muted-foreground mr-2">Results Type:</span> {form.getValues("resultsType")}</p>
                              <p><span className="font-mono text-xs uppercase tracking-widest text-muted-foreground mr-2">Results Limit:</span> {form.getValues("resultsLimit")}</p>
                            </>
                          );
                        } else if (platformValue) { // Handle non-string case if needed
                          return (
                             <>
                              <p><span className="font-mono text-xs uppercase tracking-widest text-muted-foreground mr-2">Data Source:</span> {platformValue}</p>
                              <p><span className="font-mono text-xs uppercase tracking-widest text-muted-foreground mr-2">Search Type:</span> {form.getValues("searchType")}</p>
                              <p><span className="font-mono text-xs uppercase tracking-widest text-muted-foreground mr-2">Results Type:</span> {form.getValues("resultsType")}</p>
                              <p><span className="font-mono text-xs uppercase tracking-widest text-muted-foreground mr-2">Results Limit:</span> {form.getValues("resultsLimit")}</p>
                            </>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                )}

                {/* Add Dataset Items Modal */}
                <Dialog 
                  open={showDatasetModal} 
                  onOpenChange={handleModalClose}
                >
                  <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="font-display text-2xl">First catch</DialogTitle>
                      <DialogDescription>
                        {isLoadingDataset ? "Your creature is out hunting..." : (datasetError ? `The expedition failed: ${datasetError}` : `Your creature came back with ${datasetItems?.length || 0} items from its first hunt`)}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4">
                      <ScrollArea className="h-[500px] w-full border border-foreground/10 p-4">
                        {datasetItems && datasetItems.length > 0 ? (
                          datasetItems.map((item, index) => (
                            <div key={index} className="mb-4 p-4 bg-foreground/[0.03] border border-foreground/10">
                              <pre className="text-sm font-mono overflow-auto whitespace-pre-wrap">
                                {JSON.stringify(item, null, 2)}
                              </pre>
                            </div>
                          ))
                           ) : (
                             !isLoadingDataset && !datasetError && <p className="text-muted-foreground">The creature came back empty-handed.</p>
                            )}
                      </ScrollArea>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={showBuilderModal} onOpenChange={handleBuilderModalClose}>
                  <DialogContent className="max-w-3xl rounded-none border-foreground/15">
                    <DialogHeader>
                      <DialogTitle className="font-display text-2xl">Building in the wild</DialogTitle>
                      <DialogDescription>
                        {builderStatus === "published"
                          ? "Your app is public. Open it now or return to your roster."
                          : builderStatus === "error"
                            ? "The expedition stopped. The last build output is below."
                            : "Claude Code is working inside a fresh Daytona sandbox."}
                      </DialogDescription>
                    </DialogHeader>

                    <ol className="grid grid-cols-3 gap-2" aria-label="Build progress">
                      {["Agent created", "Building app", "Published"].map((label, index) => {
                        const activeIndex = builderStatus === "creating" ? 0 : builderStatus === "published" ? 2 : 1;
                        const complete = index < activeIndex || builderStatus === "published";
                        const active = index === activeIndex;
                        return (
                          <li
                            key={label}
                            className={`border px-3 py-3 text-xs font-mono uppercase tracking-widest ${
                              complete
                                ? "border-[#eca8d6]/40 bg-[#eca8d6]/10"
                                : active && builderStatus === "error"
                                  ? "border-red-400/40 bg-red-400/5 text-red-400"
                                  : active
                                  ? "border-foreground/30"
                                  : "border-foreground/10 text-muted-foreground"
                            }`}
                            aria-current={active ? "step" : undefined}
                          >
                            <span className="flex items-center gap-2">
                              {complete ? (
                                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                              ) : active && builderStatus === "error" ? (
                                <span aria-hidden="true">!</span>
                              ) : active ? (
                                <span className="h-2 w-2 rounded-full bg-[#eca8d6] animate-pulse" aria-hidden="true" />
                              ) : null}
                              {label}
                            </span>
                          </li>
                        );
                      })}
                    </ol>

                    <div>
                      <p className="mb-2 text-xs font-mono uppercase tracking-widest text-muted-foreground" role="status">
                        {builderStatus === "creating" && "Preparing agent record…"}
                        {builderStatus === "building" && "Live build output"}
                        {builderStatus === "published" && "Build complete"}
                        {builderStatus === "error" && "Build error"}
                      </p>
                      <ScrollArea className="h-72 border border-foreground/10 bg-black/90 p-4">
                        <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-white/80" aria-live="polite">
                          {builderLogs || (builderStatus === "creating" ? "Creating your Development agent…" : "Waiting for the first build log…")}
                        </pre>
                      </ScrollArea>
                      {builderError && (
                        <p className="mt-3 border border-red-400/30 bg-red-400/5 p-3 text-sm text-red-400" role="alert">
                          {builderError}
                        </p>
                      )}
                    </div>

                    {(builderStatus === "published" || builderStatus === "error") && (
                      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-none border-foreground/20"
                          onClick={() => setLocation("/dashboard")}
                        >
                          View dashboard
                        </Button>
                        {builderStatus === "published" && previewUrl && (
                          <Button asChild className="rounded-none bg-foreground text-background">
                            <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                              Open live app
                              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                            </a>
                          </Button>
                        )}
                      </div>
                    )}
                  </DialogContent>
                </Dialog>

                <div className="flex justify-between pt-4">
                  {step !== "basics" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={prevStep}
                      className="rounded-none border-foreground/20 hover:border-foreground hover:bg-foreground/5"
                    >
                      Back
                    </Button>
                  )}
                  {step === "review" ? (
                    <Button
                      type="submit"
                      disabled={form.formState.isSubmitting}
                      className="rounded-none bg-foreground text-background hover:bg-foreground/90"
                    >
                      {form.formState.isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {builderStatus === "building" ? "Building..." : "Releasing..."}
                        </>
                      ) : (
                        "Release into the wild"
                      )}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={nextStep}
                      className="rounded-none bg-foreground text-background hover:bg-foreground/90"
                    >
                      Next
                    </Button>
                  )}
                </div>
              </form>
            </Form>
        </div>
      </div>
    </div>
  );
}
