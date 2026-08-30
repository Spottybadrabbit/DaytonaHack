import { seedActors, type SeedActor } from "../../shared/seed-data.js";

// GET /api/apify/actors?search=&sortBy=&sortOrder=&minRuns=&minUsers=
// Returns the seed actor catalogue with optional filtering/sorting applied.
export default function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const q = req.query ?? {};
  const first = (v: any) => (Array.isArray(v) ? v[0] : v);
  const search = String(first(q.search) ?? "").toLowerCase().trim();
  const sortBy = String(first(q.sortBy) ?? "totalRunCount");
  const sortOrder = String(first(q.sortOrder) ?? "desc");
  const minRuns = Number(first(q.minRuns) ?? 0) || 0;
  const minUsers = Number(first(q.minUsers) ?? 0) || 0;

  let actors: SeedActor[] = [...seedActors];

  if (search) {
    actors = actors.filter(
      (a) =>
        a.title.toLowerCase().includes(search) ||
        a.description.toLowerCase().includes(search) ||
        (a.categories ?? []).some((c) => c.toLowerCase().includes(search))
    );
  }

  if (minRuns > 0) {
    actors = actors.filter((a) => (a.stats?.totalRunCount ?? 0) >= minRuns);
  }
  if (minUsers > 0) {
    actors = actors.filter((a) => (a.stats?.totalUserCount ?? 0) >= minUsers);
  }

  const statKey = ["totalRunCount", "totalUserCount", "user30DaysCount", "run30DaysCount"].includes(sortBy)
    ? (sortBy as keyof NonNullable<SeedActor["stats"]>)
    : "totalRunCount";

  actors.sort((a, b) => {
    const av = a.stats?.[statKey] ?? 0;
    const bv = b.stats?.[statKey] ?? 0;
    return sortOrder === "asc" ? av - bv : bv - av;
  });

  return res.status(200).json(actors);
}
