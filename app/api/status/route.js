import { keyManager } from "../../../lib/keyManager";

export const runtime = "nodejs";

export async function GET() {
  try {
    const status = keyManager.getStatus();
    return Response.json(status);
  } catch (error) {
    return Response.json(
      { error: error?.message || "Failed to retrieve API key status" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body.action === "reset_cooldown") {
      const cleared = keyManager.resetAllCooldowns();
      return Response.json({
        success: true,
        message: `Cleared cooldown for ${cleared} key(s)`,
        ...keyManager.getStatus(),
      });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json(
      { error: error?.message || "Failed to update status" },
      { status: 500 }
    );
  }
}
