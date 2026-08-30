import { Agent } from "@shared/schema";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { Link } from "wouter";
import { getPokemonSpriteUrl } from "@/lib/utils";

interface RecommendedAgentsProps {
  agents: Agent[];
}

export default function RecommendedAgents({ agents }: RecommendedAgentsProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: true,
  });

  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();

  return (
    <div className="relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4">
          {agents.map((agent, i) => (
            <div key={agent.id} className="flex-[0_0_300px]">
              <Link href={`/agents/${agent.id}`}>
                <div className="group cursor-pointer h-full flex flex-col border border-foreground/10 bg-foreground/[0.02] hover:border-foreground/30 hover:bg-foreground/[0.04] transition-all duration-300 p-6">
                  {/* Header: creature sprite (focal) + name/type */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-14 h-14 shrink-0 flex items-center justify-center border border-foreground/10 bg-foreground/[0.04] group-hover:border-foreground/25 transition-colors duration-300">
                        <img
                          src={getPokemonSpriteUrl(agent.spriteUrl)}
                          alt={`${agent.name} creature`}
                          className="w-full h-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-110"
                          style={{ imageRendering: "pixelated" }}
                        />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-display text-lg leading-tight truncate">{agent.name}</h3>
                        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mt-0.5 truncate">
                          {agent.type}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground/50 shrink-0 pt-1">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-3 flex-grow mb-5">
                    {agent.description}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-foreground/10 text-sm font-mono">
                    <span className="flex items-center gap-1.5 text-[#eca8d6]">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      {agent.performance}%
                    </span>
                    <span>${agent.price}</span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
      <button
        type="button"
        aria-label="Previous agents"
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 h-10 w-10 flex items-center justify-center border border-foreground/20 bg-background hover:border-foreground hover:bg-foreground/5 transition-colors"
        onClick={scrollPrev}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Next agents"
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-10 w-10 flex items-center justify-center border border-foreground/20 bg-background hover:border-foreground hover:bg-foreground/5 transition-colors"
        onClick={scrollNext}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
