import { prisma } from "@/shared/lib/prisma";
import { errorResponse, successResponse } from "@/server/lib/api-response";

export async function POST() {
  try {
    await prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });

    return successResponse(null, "All notifications marked as read");
  } catch (error) {
    return errorResponse(
      "Failed to mark notifications as read",
      500,
      error instanceof Error ? error.message : error
    );
  }
}