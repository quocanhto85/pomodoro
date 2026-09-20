import { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/db/mongodb/client";
import { getUserIdFromRequest } from "@/lib/auth";
import { RankingFacet, buildRanking, rankingPipeline } from "@/lib/ranking";

/**
 * Leaderboard across every user, for one year.
 *
 * Unlike the other report endpoints this one deliberately reads past the
 * caller's own rows: comparing users is the entire feature. What crosses the
 * wire is aggregate counts plus a domain-stripped display name — never a raw
 * user id, and nothing about what someone studied beyond their top subject.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const currentUserId = await getUserIdFromRequest(req, res);
    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    if (year < 1970 || year > 9999) {
      return res.status(400).json({ message: "Invalid year parameter" });
    }

    const client = await clientPromise;
    const db = client.db("pomodoro_app");

    const startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0));

    const [facet] = await db
      .collection("pomodoroSessions")
      .aggregate(rankingPipeline(startDate, endDate))
      .toArray();

    return res.status(200).json({
      year,
      users: buildRanking(facet as RankingFacet, currentUserId)
    });
  } catch (error) {
    console.error("Error fetching pomodoro ranking:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
