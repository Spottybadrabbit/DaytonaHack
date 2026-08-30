import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { SortAsc, SortDesc, ArrowUpRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getPokemonSpriteUrl, getStableTechPokemonId } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ApifyActor {
  id: string;
  name: string;
  username: string;
  title: string;
  description: string;
  thumbUrl?: string;
  price?: string;
  rating?: number;
  type?: string;
  categories?: string[];
  stats?: {
    totalRunCount: number;
    totalUserCount: number;
    user30DaysCount: number;
    run30DaysCount: number;
  };
}

// Sample data to match the style from the screenshot
const sampleActors: ApifyActor[] = [
  {
    id: "1",
    name: "content-creator",
    username: "apify",
    title: "Content Creator",
    description: "Creates engaging content across multiple platforms",
    rating: 94.8,
    price: "$199.99",
    type: "Creative",
    stats: {
      totalRunCount: 15487,
      totalUserCount: 432,
      user30DaysCount: 98,
      run30DaysCount: 3256
    }
  },
  {
    id: "2",
    name: "instagram-scraper",
    username: "apify",
    title: "Instagram Scraper",
    description: "Extract profiles, posts, and comments from Instagram",
    rating: 92.5,
    price: "$149.99",
    type: "Research"
  },
  {
    id: "3",
    name: "twitter-scraper",
    username: "apify",
    title: "Twitter Scraper",
    description: "Collect tweets, profiles, and followers from Twitter/X",
    rating: 90.2,
    price: "$129.99",
    type: "Research"
  },
  {
    id: "4",
    name: "web-scraper",
    username: "apify",
    title: "Web Scraper",
    description: "Extract data from any website with advanced capabilities",
    rating: 96.1,
    price: "$249.99",
    type: "Development"
  },
  {
    id: "5",
    name: "linkedin-scraper",
    username: "apify",
    title: "LinkedIn Scraper",
    description: "Extract profiles, jobs, and companies from LinkedIn",
    rating: 91.7,
    price: "$179.99",
    type: "Research"
  },
  {
    id: "6",
    name: "facebook-scraper",
    username: "apify",
    title: "Facebook Scraper",
    description: "Collect posts, profiles, and comments from Facebook",
    rating: 89.3,
    price: "$159.99",
    type: "Research"
  },
  {
    id: "7",
    name: "email-extractor",
    username: "apify",
    title: "Email Extractor",
    description: "Find and extract email addresses from websites",
    rating: 88.9,
    price: "$99.99",
    type: "Automation"
  },
  {
    id: "8",
    name: "amazon-scraper",
    username: "apify",
    title: "Amazon Scraper",
    description: "Extract products, reviews, and prices from Amazon",
    rating: 93.4,
    price: "$189.99",
    type: "Analytics"
  },
  {
    id: "9",
    name: "google-maps-scraper",
    username: "apify",
    title: "Google Maps Scraper",
    description: "Extract business data and reviews from Google Maps",
    rating: 92.8,
    price: "$169.99",
    type: "Analytics"
  },
  {
    id: "10",
    name: "youtube-scraper",
    username: "apify",
    title: "YouTube Scraper",
    description: "Collect videos, channels, and comments from YouTube",
    rating: 91.5,
    price: "$139.99",
    type: "Creative"
  },
  {
    id: "11",
    name: "data-enricher",
    username: "apify",
    title: "Data Enricher",
    description: "Enhance your data with additional information from various sources",
    rating: 87.6,
    price: "$119.99",
    type: "Analytics"
  },
  {
    id: "12",
    name: "shopify-scraper",
    username: "apify",
    title: "Shopify Scraper",
    description: "Extract products, prices, and reviews from Shopify stores",
    rating: 90.8,
    price: "$159.99",
    type: "Finance"
  }
];

export default function ApifyActorsPage() {
  const [apifyActors, setApifyActors] = useState<ApifyActor[]>([]);
  const [filteredActors, setFilteredActors] = useState<ApifyActor[]>([]);
  const [displayedActors, setDisplayedActors] = useState<ApifyActor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const itemsPerPage = 30;
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("totalRunCount");
  const [sortOrder, setSortOrder] = useState<string>("desc");
  const [minRuns, setMinRuns] = useState<number>(0);
  const [minUsers, setMinUsers] = useState<number>(0);
  const [maxRunsInData, setMaxRunsInData] = useState<number>(10000);
  const [maxUsersInData, setMaxUsersInData] = useState<number>(1000);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isSignedIn, getToken } = useAuth();
  const [tamingId, setTamingId] = useState<string | null>(null);

  /**
   * Taming is an in-app act: the wild species becomes an agent in YOUR pack
   * (Supabase write through the authenticated Vercel API, with the pack cap
   * enforced server-side), then we head to the dashboard to watch it arrive.
   * It deliberately does NOT open apify.com — that's the small provenance
   * link on the card.
   */
  const handleTame = async (actor: ApifyActor) => {
    if (!isSignedIn) {
      setLocation("/sign-in");
      return;
    }
    setTamingId(actor.id);
    try {
      await apiRequest("POST", "/api/agents", {
        name: actor.title || actor.name,
        description: actor.description || "A wild creature from the deep wilds.",
        price: (actor.price ?? "0").replace(/[^0-9.]/g, "") || "0",
        type: actor.type || actor.categories?.[0] || "Automation",
        spriteUrl: getStableTechPokemonId(actor.id),
        platform: null,
        platformConfig: JSON.stringify({
          source: "apify",
          species: `${actor.username}/${actor.name}`,
        }),
      }, await getToken());
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["agents-mine"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/agents"] }),
      ]);
      toast({
        title: "Tamed!",
        description: `${actor.title || actor.name} has joined your pack.`,
      });
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: "The creature slipped away",
        description: error?.message || "Taming failed — try again.",
        variant: "destructive",
      });
    } finally {
      setTamingId(null);
    }
  };

  // Function to build the query string for fetching actors with filters
  const buildQueryString = () => {
    const params = new URLSearchParams();
    
    if (search) {
      params.append('search', search);
    }
    
    if (sortBy) {
      params.append('sortBy', sortBy);
    }
    
    if (sortOrder) {
      params.append('sortOrder', sortOrder);
    }
    
    if (minRuns > 0) {
      params.append('minRuns', minRuns.toString());
    }
    
    if (minUsers > 0) {
      params.append('minUsers', minUsers.toString());
    }
    
    return params.toString();
  };
  
  // Fetch actors with filtering applied on the server side
  const fetchApifyActors = async () => {
    setIsLoading(true);
    try {
      const queryString = buildQueryString();
      const url = `/api/apify/actors${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch actors: ${response.statusText}`);
      }
      
      const actorsData = await response.json();
      setApifyActors(actorsData);
      setFilteredActors(actorsData);
      console.log("Loaded actors from API:", actorsData.length);
      
      // Update max values for the sliders
      if (actorsData.length > 0) {
        const maxRuns = Math.max(...actorsData.map((a: ApifyActor) => a.stats?.totalRunCount || 0));
        const maxUsers = Math.max(...actorsData.map((a: ApifyActor) => a.stats?.totalUserCount || 0));
        setMaxRunsInData(maxRuns > 0 ? maxRuns : 10000);
        setMaxUsersInData(maxUsers > 0 ? maxUsers : 1000);
      }
    } catch (error) {
      console.error("Error loading actors:", error);
      toast({
        title: "Error",
        description: "Failed to load actors from Apify store. Using local data instead.",
        variant: "destructive",
      });
      
      // Fallback to sample data if API fails
      setApifyActors(sampleActors);
      setFilteredActors(sampleActors);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch on component mount
  useEffect(() => {
    fetchApifyActors();
  }, []);

  // Background expedition: refresh the field guide automatically on mount,
  // replacing the old manual "Update Actors Data" button. Fails silently —
  // on the static production deploy the endpoint is a no-op acknowledgment,
  // so an error must never block or alarm.
  const [expedition, setExpedition] = useState<"scouting" | "done">("scouting");
  const expeditionStarted = useRef(false);
  useEffect(() => {
    if (expeditionStarted.current) return;
    expeditionStarted.current = true;
    (async () => {
      try {
        const res = await apiRequest("POST", "/api/apify/fetch-actors");
        if (res.ok) await fetchApifyActors();
      } catch {
        // Silent by design: the field guide simply stays as it was.
      } finally {
        setExpedition("done");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Refetch when sort or filter parameters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchApifyActors();
    }, 500); // Debounce to avoid too many requests while typing
    
    return () => clearTimeout(timer);
  }, [sortBy, sortOrder, minRuns, minUsers, search]);

  // Client-side filtering for type (category)
  useEffect(() => {
    if (selectedType) {
      const filtered = apifyActors.filter(actor => {
        if (actor.type === selectedType) return true;
        if (actor.categories && actor.categories.includes(selectedType)) return true;
        return false;
      });
      setFilteredActors(filtered);
    } else {
      setFilteredActors(apifyActors);
    }
  }, [apifyActors, selectedType]);

  // Get unique actor types for filtering - combine type and categories
  const actorTypes = Array.from(
    new Set([
      ...(apifyActors.map(actor => actor.type) || []),
      ...(apifyActors.flatMap(actor => actor.categories || []))
    ])
  ).filter(Boolean) as string[];
  
  // Load initial page of actors
  useEffect(() => {
    // Reset pagination when filters change
    setPage(1);
    setHasMore(true);
    
    // Set the first page of items
    const firstPageActors = filteredActors.slice(0, itemsPerPage);
    setDisplayedActors(firstPageActors);
    
    // Check if there are more actors to load
    setHasMore(filteredActors.length > itemsPerPage);
  }, [filteredActors]);
  
  // Function to load more actors when the user scrolls
  const loadMoreActors = () => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    
    // Calculate the next page of actors
    const nextPage = page + 1;
    const startIndex = (nextPage - 1) * itemsPerPage;
    const endIndex = nextPage * itemsPerPage;
    const nextPageActors = filteredActors.slice(startIndex, endIndex);
    
    // If no more actors to load, set hasMore to false
    if (nextPageActors.length === 0) {
      setHasMore(false);
      setIsLoadingMore(false);
      return;
    }
    
    // Add the next page of actors to the displayed actors
    setDisplayedActors(prev => [...prev, ...nextPageActors]);
    setPage(nextPage);
    setIsLoadingMore(false);
  };
  
  // Set up intersection observer for infinite scrolling
  useEffect(() => {
    // Function to handle load more when intersection is detected
    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
        loadMoreActors();
      }
    };
    
    // Create an observer instance
    const observer = new IntersectionObserver(handleIntersection, { threshold: 0.1 });
    
    // Get the sentinel element
    const sentinel = document.getElementById("infinite-scroll-sentinel");
    if (sentinel) {
      observer.observe(sentinel);
    }
    
    // Clean up observer on unmount
    return () => {
      if (sentinel) {
        observer.unobserve(sentinel);
      }
      observer.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, page, filteredActors.length, isLoadingMore]);

  // Format numbers with comma separators
  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 lg:py-24">
      {/* Header */}
      <div className="mb-12">
        <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-8">
          <span className="w-12 h-px bg-foreground/30" />
          THE WILDS
        </span>
        <div className="grid lg:grid-cols-2 gap-8 lg:items-end">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-display tracking-tight leading-[0.95]">
            Wander in. Tame
            <br />
            something <span className="text-stroke">wild.</span>
          </h1>
          <div>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-lg mb-4">
              Past this point the creatures roam free — scrapers, scouts, and
              crawlers, sighted daily and growing curiouser by the week. Follow
              the white rabbit, find one whose habits suit you, and tame it.
              A tamed agent hunts for you.
            </p>
            <p className="text-xs font-mono text-muted-foreground/70" aria-live="polite">
              {expedition === "scouting"
                ? "\u27f3 scouting the wilds for new species\u2026"
                : "field guide up to date"}
            </p>
          </div>
        </div>
      </div>

      {/* Track (search) + habitat filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <input
          type="text"
          placeholder="Track a species\u2026"
          className="flex-1 sm:max-w-md px-4 py-2.5 bg-foreground/[0.02] border border-foreground/15 focus:border-foreground/40 focus:outline-none text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={selectedType || "all"} onValueChange={(value) => setSelectedType(value === "all" ? null : value)}>
          <SelectTrigger className="w-full sm:w-[200px] rounded-none bg-foreground/[0.02] border-foreground/15">
            <SelectValue placeholder="Every habitat" />
          </SelectTrigger>
          <SelectContent className="rounded-none border-foreground/15">
            <SelectItem value="all">Every habitat</SelectItem>
            {actorTypes.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tracking controls */}
      <div className="mb-12 border border-foreground/10 bg-foreground/[0.02] p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-display">Tracking notes</h3>
          <Button
            variant="outline"
            size="sm"
            className="rounded-none border-foreground/20 hover:border-foreground hover:bg-foreground/5"
            onClick={() => {
              setSortBy("totalRunCount");
              setSortOrder("desc");
              setMinRuns(0);
              setMinUsers(0);
              setSelectedType(null);
              setSearch("");
            }}
          >
            Clear the trail
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Sort By Control */}
          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Rank by</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="rounded-none bg-foreground/[0.02] border-foreground/15">
                <SelectValue placeholder="Rank by" />
              </SelectTrigger>
              <SelectContent className="rounded-none border-foreground/15">
                <SelectItem value="totalRunCount">Hunts, all time</SelectItem>
                <SelectItem value="totalUserCount">Keepers, all time</SelectItem>
                <SelectItem value="user30DaysCount">Keepers (30 days)</SelectItem>
                <SelectItem value="run30DaysCount">Hunts (30 days)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Order Control */}
          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Order</Label>
            <div className="flex gap-2">
              <Button
                variant={sortOrder === "desc" ? "default" : "outline"}
                className={`flex-1 rounded-none ${sortOrder === "desc" ? "bg-foreground text-background hover:bg-foreground/90" : "border-foreground/20 hover:border-foreground hover:bg-foreground/5"}`}
                onClick={() => setSortOrder("desc")}
              >
                <SortDesc className="mr-2 h-4 w-4" />
                Highest first
              </Button>
              <Button
                variant={sortOrder === "asc" ? "default" : "outline"}
                className={`flex-1 rounded-none ${sortOrder === "asc" ? "bg-foreground text-background hover:bg-foreground/90" : "border-foreground/20 hover:border-foreground hover:bg-foreground/5"}`}
                onClick={() => setSortOrder("asc")}
              >
                <SortAsc className="mr-2 h-4 w-4" />
                Lowest first
              </Button>
            </div>
          </div>

          {/* Minimum Runs Slider */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Min. hunts</Label>
              <span className="text-xs font-mono text-muted-foreground">{formatNumber(minRuns)}</span>
            </div>
            <Slider
              min={0}
              max={maxRunsInData}
              step={100}
              value={[minRuns]}
              onValueChange={(values) => setMinRuns(values[0])}
              className="py-2"
            />
          </div>

          {/* Minimum Users Slider */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Min. keepers</Label>
              <span className="text-xs font-mono text-muted-foreground">{formatNumber(minUsers)}</span>
            </div>
            <Slider
              min={0}
              max={maxUsersInData}
              step={10}
              value={[minUsers]}
              onValueChange={(values) => setMinUsers(values[0])}
              className="py-2"
            />
          </div>

          {/* Active Filters */}
          <div className="lg:col-span-2">
            <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2 block">On the trail</Label>
            <div className="flex flex-wrap gap-2">
              {sortBy && (
                <Badge variant="outline" className="rounded-none font-mono text-[10px] uppercase border-foreground/20 flex items-center gap-1">
                  Ranked by: {sortBy === "totalRunCount" ? "Hunts, all time" :
                               sortBy === "totalUserCount" ? "Keepers, all time" :
                               sortBy === "user30DaysCount" ? "Keepers (30d)" : "Hunts (30d)"}
                  <span className="text-xs ml-1">({sortOrder === "desc" ? "\u2193" : "\u2191"})</span>
                </Badge>
              )}
              {minRuns > 0 && (
                <Badge variant="outline" className="rounded-none font-mono text-[10px] uppercase border-foreground/20">
                  Min. hunts: {formatNumber(minRuns)}
                </Badge>
              )}
              {minUsers > 0 && (
                <Badge variant="outline" className="rounded-none font-mono text-[10px] uppercase border-foreground/20">
                  Min. keepers: {formatNumber(minUsers)}
                </Badge>
              )}
              {selectedType && (
                <Badge variant="outline" className="rounded-none font-mono text-[10px] uppercase border-foreground/20">
                  Habitat: {selectedType}
                </Badge>
              )}
              {search && (
                <Badge variant="outline" className="rounded-none font-mono text-[10px] uppercase border-foreground/20">
                  Tracking: "{search}"
                </Badge>
              )}
              {!sortBy && !minRuns && !minUsers && !selectedType && !search && (
                <span className="text-xs font-mono text-muted-foreground">No tracks laid</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-72 border border-foreground/10 bg-foreground/[0.02] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedActors.map((actor) => (
            <div
              key={actor.id}
              className="group flex flex-col border border-foreground/10 bg-foreground/[0.02] hover:border-foreground/30 hover:bg-foreground/[0.04] transition-all duration-300 p-6"
            >
              {/* Creature header */}
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-16 h-16 shrink-0 flex items-center justify-center border border-foreground/10 bg-foreground/[0.04] group-hover:border-foreground/25 transition-colors duration-300">
                  <img
                    src={getPokemonSpriteUrl(getStableTechPokemonId(actor.id))}
                    alt={`${actor.title} creature`}
                    className="w-full h-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-110"
                    style={{ imageRendering: "pixelated" }}
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl font-display leading-tight">{actor.title}</h3>
                  <p className="text-[10px] font-mono text-muted-foreground/70 mt-1 truncate">
                    species: {actor.username}/{actor.name}
                  </p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed mb-6 flex-grow">{actor.description}</p>

              {/* Field notes */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-4 border-t border-b border-foreground/10 mb-5 text-sm">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-0.5">Hunts, all time</div>
                  <div className="font-mono">{formatNumber(actor.stats?.totalRunCount || 0)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-0.5">Keepers</div>
                  <div className="font-mono">{formatNumber(actor.stats?.totalUserCount || 0)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-0.5">Keepers (30d)</div>
                  <div className="font-mono">{formatNumber(actor.stats?.user30DaysCount || 0)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-0.5">Hunts (30d)</div>
                  <div className="font-mono">{formatNumber(actor.stats?.run30DaysCount || 0)}</div>
                </div>
              </div>

              <Button
                className="w-full rounded-none bg-foreground text-background hover:bg-foreground/90"
                onClick={() => handleTame(actor)}
                disabled={tamingId === actor.id}
              >
                {tamingId === actor.id ? "Taming\u2026" : "Tame this agent"}
              </Button>
              <a
                href={`https://apify.com/${actor.username}/${actor.name}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 self-center text-[10px] font-mono text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                study this species in its natural habitat
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          ))}

          {/* Sentinel element for infinite scrolling */}
          {hasMore && (
            <div
              id="infinite-scroll-sentinel"
              className="col-span-full flex justify-center p-4"
            >
              {isLoadingMore ? (
                <span className="text-xs font-mono text-muted-foreground">tracking more creatures\u2026</span>
              ) : (
                <div className="h-8"></div>
              )}
            </div>
          )}

          {/* Display total count and current visible count */}
          <div className="col-span-full text-center text-xs font-mono text-muted-foreground mt-2">
            showing {displayedActors.length} of {filteredActors.length} species sighted
          </div>
        </div>
      )}

      {!isLoading && filteredActors.length === 0 && (
        <div className="text-center py-20 border border-foreground/10">
          <p className="text-lg text-muted-foreground mb-1">
            The trail has gone cold — no creatures match your tracks.
          </p>
          <p className="text-sm text-muted-foreground/70 mb-6">
            Curiouser and curiouser. Try clearing the trail and looking again.
          </p>
          <Button
            className="rounded-none bg-foreground text-background hover:bg-foreground/90"
            onClick={() => {
              setSearch("");
              setSelectedType(null);
            }}
          >
            Clear the trail
          </Button>
        </div>
      )}
    </div>
  );
}
