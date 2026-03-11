import { prisma } from "@/shared/lib/prisma";
import { errorResponse, successResponse } from "@/server/lib/api-response";

export async function GET() {
  try {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.notification.count({
        where: { isRead: false },
      }),
    ]);

    return successResponse(
      {
        notifications,
        unreadCount,
      },
      "Notifications fetched"
    );
  } catch (error) {
    return errorResponse(
      "Failed to fetch notifications",
      500,
      error instanceof Error ? error.message : error
    );
  }
}