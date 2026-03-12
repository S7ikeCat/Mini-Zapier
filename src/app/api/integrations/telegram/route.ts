import { NextRequest } from "next/server";
import { prisma } from "@/shared/lib/prisma";
import { successResponse, errorResponse } from "@/server/lib/api-response";

const DEMO_USER_ID = "local-user";

function normalize(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function maskToken(token: string): string {
  if (token.length <= 10) {
    return "********";
  }

  return `${token.slice(0, 6)}********${token.slice(-4)}`;
}

export async function GET() {
  try {
    const integration = await prisma.telegramIntegration.findUnique({
      where: { userId: DEMO_USER_ID },
    });

    if (!integration) {
      return successResponse(
        {
          connected: false,
          botTokenMasked: null,
          defaultChatId: null,
          botUsername: null,
          isActive: false,
        },
        "Telegram integration fetched"
      );
    }

    return successResponse(
      {
        connected: true,
        botTokenMasked: maskToken(integration.botToken),
        defaultChatId: integration.defaultChatId,
        botUsername: integration.botUsername,
        isActive: integration.isActive,
      },
      "Telegram integration fetched"
    );
  } catch (error) {
    return errorResponse(
      "Failed to fetch Telegram integration",
      500,
      error instanceof Error ? error.message : error
    );
  }
}

export async function PATCH(request: NextRequest) {
    try {
      const body = await request.json();
  
      const nextBotToken = normalize(body.botToken);
      const defaultChatId = normalize(body.defaultChatId);
      const botUsername = normalize(body.botUsername);
      const isActive =
        typeof body.isActive === "boolean" ? body.isActive : true;
  
      const existing = await prisma.telegramIntegration.findUnique({
        where: { userId: DEMO_USER_ID },
      });
  
      const finalBotToken = nextBotToken ?? existing?.botToken ?? null;
  
      if (!finalBotToken) {
        return errorResponse("Bot token is required", 400);
      }
  
      const integration = await prisma.telegramIntegration.upsert({
        where: { userId: DEMO_USER_ID },
        update: {
          botToken: finalBotToken,
          defaultChatId,
          botUsername,
          isActive,
        },
        create: {
          userId: DEMO_USER_ID,
          botToken: finalBotToken,
          defaultChatId,
          botUsername,
          isActive,
        },
      });
  
      return successResponse(
        {
          connected: true,
          botTokenMasked: maskToken(integration.botToken),
          defaultChatId: integration.defaultChatId,
          botUsername: integration.botUsername,
          isActive: integration.isActive,
        },
        "Telegram integration saved"
      );
    } catch (error) {
      return errorResponse(
        "Failed to save Telegram integration",
        500,
        error instanceof Error ? error.message : error
      );
    }
  }