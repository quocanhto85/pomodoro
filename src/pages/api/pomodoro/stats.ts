import { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/db/mongodb/client";
import { getUserIdFromRequest } from "@/lib/auth";
import { resolveReportOwner } from "@/lib/admin";

const DEFAULT_SUBJECT = "General";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method not allowed" });
    }

    try {
        const callerId = await getUserIdFromRequest(req, res);
        if (!callerId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const client = await clientPromise;
        const db = client.db("pomodoro_app");

        // An admin may pass another user's ranking handle to read their stats.
        const owner = await resolveReportOwner(db, callerId, req.body.user);
        if (!owner.ok) {
            return res.status(owner.status).json({ message: owner.message });
        }
        const { userId } = owner;

        // Get the year from request body, default to current year
        const year = parseInt(req.body.year as string) || new Date().getFullYear();

        // Create date range for the year
        const startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
        const endDate = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0));

        const matchStage = {
            $match: {
                userId,
                date: { $gte: startDate, $lt: endDate }
            }
        };

        // Get total completedCount for the year
        const yearlyTotal = await db.collection("pomodoroSessions").aggregate([
            matchStage,
            {
                $group: {
                    _id: null,
                    total: { $sum: "$completedCount" }
                }
            }
        ]).toArray();

        // Get monthly totals (overall)
        const monthlyTotals = await db.collection("pomodoroSessions").aggregate([
            matchStage,
            {
                $group: {
                    _id: { $month: "$date" },
                    total: { $sum: "$completedCount" }
                }
            },
            { $sort: { "_id": 1 } }
        ]).toArray();

        // Get monthly totals grouped by subject
        // Treat documents without a subject field as "General"
        const monthlyBySubjectRaw = await db.collection("pomodoroSessions").aggregate([
            matchStage,
            {
                $group: {
                    _id: {
                        month: { $month: "$date" },
                        subject: { $ifNull: ["$subject", DEFAULT_SUBJECT] }
                    },
                    total: { $sum: "$completedCount" }
                }
            },
            { $sort: { "_id.subject": 1, "_id.month": 1 } }
        ]).toArray();

        // Get distinct subjects for the year
        const subjectsRaw = await db.collection("pomodoroSessions").aggregate([
            matchStage,
            {
                $group: {
                    _id: { $ifNull: ["$subject", DEFAULT_SUBJECT] }
                }
            },
            { $sort: { _id: 1 } }
        ]).toArray();

        // Convert monthly totals to array with all months
        const monthlyData = Array(12).fill(0);
        monthlyTotals.forEach(month => {
            monthlyData[month._id - 1] = month.total;
        });

        // Build subjects list
        const subjects: string[] = subjectsRaw.map(s => s._id as string);

        // Build monthly-by-subject map: { subject: [12 months] }
        const monthlyBySubject: Record<string, number[]> = {};
        for (const subj of subjects) {
            monthlyBySubject[subj] = Array(12).fill(0);
        }
        for (const entry of monthlyBySubjectRaw) {
            const subj = entry._id.subject as string;
            const monthIndex = (entry._id.month as number) - 1;
            if (!monthlyBySubject[subj]) {
                monthlyBySubject[subj] = Array(12).fill(0);
            }
            monthlyBySubject[subj][monthIndex] = entry.total;
        }

        return res.status(200).json({
            totalPomodoros: yearlyTotal[0]?.total || 0,
            monthlyPomodoros: monthlyData,
            subjects,
            monthlyBySubject
        });
    } catch (error) {
        console.error("Error fetching pomodoro statistics:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
