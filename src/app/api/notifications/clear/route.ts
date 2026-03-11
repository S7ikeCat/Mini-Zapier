import { prisma } from "@/shared/lib/prisma";
import { successResponse, errorResponse } from "@/server/lib/api-response";

export async function DELETE() {
  try {
    await prisma.notification.deleteMany({});

    return successResponse(null, "Notifications cleared");
  } catch (error) {
    return errorResponse(
      "Failed to clear notifications",
      500,
      error instanceof Error ? error.message : error
    );
  }
}