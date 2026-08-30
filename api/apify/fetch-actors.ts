// POST /api/apify/fetch-actors
// The original Express route regenerated a local actors JSON file. On the
// static/serverless deploy the actor catalogue is served directly from seed
// data, so this endpoint simply acknowledges the refresh request.
export default function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  return res.status(200).json({
    status: "success",
    message: "Actors data is up to date",
  });
}
