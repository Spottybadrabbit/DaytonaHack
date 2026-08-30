import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { WildAgent } from "@/lib/agents";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ArrowRight, ArrowUpRight, Star } from "lucide-react";
import { getPokemonSpriteUrl, getStableTechPokemonId } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ApifyActor {
  id: string;
  name: string;
  username: string;
  title: string;
  description: string;
  categories?: string[];
}

export function LiveAgentsSection() {
  const [search, setSearch] = useState("");
  const [apifyActors, setApifyActors] = useState<ApifyActor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const { toast } = useToast();

  const { data: agents = [] } = useQuery<WildAgent[]>({
    queryKey: ["/api/agents"],
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  // Fetch actors from our own API (serverless on production, Express in dev).
  useEffect(() => {
    const fetchApifyActors = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/apify/actors");
        if (!response.ok) throw new Error("Failed to fetch actors");
        const data = await response.json();
        // Show the six highest-run actors on the landing page.
        setApifyActors((Array.isArray(data) ? data : []).slice(0, 6));
      } catch (error) {
        console.error("Error fetching actors:", error);
        toast({
          title: "Error",
          description: "Failed to load actors. Please try again later.",
          variant: "destructive",
        });
        setApifyActors([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchApifyActors();
  }, [toast]);

  const filteredAgents = agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(search.toLowerCase()) ||
      agent.description.toLowerCase().includes(search.toLowerCase())
  );

  const recommendedAgents = [...agents]
    .sort((a, b) => Number(b.performance) - Number(a.performance))
    .slice(0, 3);

  return (
    <section id="marketplace" ref={sectionRef} className="relative py-32 lg:py-40 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="mb-16">
          <span
            className={`inline-flex items-center gap-4 text-sm font-mono text-muted-foreground mb-8 transition-all duration-700 ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <span className="w-12 h-px bg-foreground/20" />
            Agents in the Wild
          </span>

          <div className="grid lg:grid-cols-2 gap-8 items-end">
            <h2
              className={`text-6xl md:text-7xl lg:text-[112px] font-display tracking-tight leading-[0.9] transition-all duration-1000 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              Live from
              <br />
              <span className="text-muted-foreground">the wilds.</span>
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
              Out here, autonomous creatures roam free — scrapers, scouts, and
              crawlers with proven track records. Spot one you like, tame it,
              and it goes to work for you.
            </p>
          </div>
        </div>

        {/* Top performing agents */}
        {recommendedAgents.length > 0 && (
          <div className="mb-20">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-display">Top of the food chain</h3>
              <Link
                href="/marketplace"
                className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2 group"
              >
                See every species
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendedAgents.map((agent) => (
                <Link key={agent._id} href={`/agents/${agent._id}`}>
                  <div className="group p-6 border border-foreground/10 bg-foreground/[0.02] hover:border-foreground/30 hover:bg-foreground/[0.04] transition-all duration-300 h-full flex flex-col">
                    <div className="flex items-center gap-3.5 mb-4">
                      <div className="w-14 h-14 shrink-0 flex items-center justify-center border border-foreground/10 bg-foreground/[0.04] group-hover:border-foreground/25 transition-colors duration-300">
                        <img
                          src={getPokemonSpriteUrl(agent.spriteUrl)}
                          alt={`${agent.name} creature`}
                          className="w-full h-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-110"
                          style={{ imageRendering: "pixelated" }}
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-medium leading-tight">{agent.name}</h4>
                        <p className="text-xs font-mono text-muted-foreground">{agent.type}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3 flex-grow">
                      {agent.description}
                    </p>
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-foreground/10">
                      <span className="flex items-center gap-1 text-[#eca8d6] text-sm font-mono">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        {agent.performance}%
                      </span>
                      <span className="font-mono text-sm">${agent.price}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Apify actors */}
        <div className="mb-20">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-display">Recent sightings in the wild</h3>
            <button
              onClick={() => window.open("https://apify.com/store", "_blank")}
              className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2 group"
            >
              Expedition: the deep wilds
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>

          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-6 border border-foreground/10 bg-foreground/[0.02] animate-pulse h-48" />
              ))}
            </div>
          ) : apifyActors.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {apifyActors.map((actor) => (
                <div
                  key={actor.id}
                  className="group p-6 border border-foreground/10 bg-foreground/[0.02] hover:border-foreground/30 hover:bg-foreground/[0.04] transition-all duration-300 flex flex-col"
                >
                  <div className="flex items-center gap-3.5 mb-4">
                    <div className="w-14 h-14 shrink-0 flex items-center justify-center border border-foreground/10 bg-foreground/[0.04] group-hover:border-foreground/25 transition-colors duration-300">
                      <img
                        src={getPokemonSpriteUrl(getStableTechPokemonId(actor.id))}
                        alt={`${actor.title || actor.name} creature`}
                        className="w-full h-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-110"
                        style={{ imageRendering: "pixelated" }}
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-lg font-display leading-tight">{actor.title || actor.name}</h4>
                      <p className="text-[10px] font-mono text-muted-foreground/70 mt-0.5 truncate">
                        species: {actor.username}/{actor.name}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3 flex-grow">
                    {actor.description?.length > 160
                      ? `${actor.description.substring(0, 160)}...`
                      : actor.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-4 mb-4">
                    {actor.categories?.slice(0, 3).map((category, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-mono px-2 py-0.5 bg-foreground/10 text-muted-foreground uppercase"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                  <Link
                    href="/marketplace"
                    className="w-full py-3 border border-foreground/20 text-sm font-medium hover:border-foreground hover:bg-foreground/5 transition-all inline-flex items-center justify-center gap-2 group/cta"
                  >
                    Meet this species in The Wilds
                    <ArrowRight className="w-4 h-4 transition-transform group-hover/cta:translate-x-1" />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground border border-foreground/10">
              The wilds are quiet — no creatures sighted just now. Check back soon.
            </div>
          )}
        </div>

        {/* My agents — search + grid */}
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <h3 className="text-2xl font-display">Your pack</h3>
            <div className="flex w-full sm:w-auto gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search agents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-full bg-foreground/[0.02] border-foreground/10"
                />
              </div>
              <Link href="/create-agent">
                <Button className="bg-foreground text-background hover:bg-foreground/90 whitespace-nowrap">
                  New agent
                </Button>
              </Link>
            </div>
          </div>

          {filteredAgents.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAgents.map((agent) => (
                <Link key={agent._id} href={`/agents/${agent._id}`}>
                  <div className="group p-6 border border-foreground/10 bg-foreground/[0.02] hover:border-foreground/30 hover:bg-foreground/[0.04] transition-all duration-300 h-full flex flex-col">
                    <div className="flex items-center gap-3.5 mb-4">
                      <div className="w-14 h-14 shrink-0 flex items-center justify-center border border-foreground/10 bg-foreground/[0.04] group-hover:border-foreground/25 transition-colors duration-300">
                        <img
                          src={getPokemonSpriteUrl(agent.spriteUrl)}
                          alt={`${agent.name} creature`}
                          className="w-full h-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-110"
                          style={{ imageRendering: "pixelated" }}
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-medium leading-tight">{agent.name}</h4>
                        <p className="text-xs font-mono text-muted-foreground">{agent.type}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3 flex-grow">
                      {agent.description}
                    </p>
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-foreground/10 text-sm font-mono">
                      <span className="text-[#eca8d6]">{agent.performance}%</span>
                      <span>${agent.price}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center border border-foreground/10 bg-foreground/[0.02]">
              <p className="text-muted-foreground">No agents found matching your search criteria</p>
              <Link href="/create-agent">
                <Button className="mt-4 bg-foreground text-background hover:bg-foreground/90">
                  Create your first agent
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
