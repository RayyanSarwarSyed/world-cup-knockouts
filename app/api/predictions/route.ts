import { kv } from "@vercel/kv";
import { NextRequest, NextResponse } from "next/server";

type PredictionPayload = {
  name: string;
  picks: Record<string, string>;
  scores: Record<string, { team1: string; team2: string }>;
};

function makeId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(7);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function isValidPayload(payload: unknown): payload is PredictionPayload {
  if (!payload || typeof payload !== "object") return false;

  const candidate = payload as PredictionPayload;

  return (
    typeof candidate.name === "string" &&
    typeof candidate.picks === "object" &&
    candidate.picks !== null &&
    typeof candidate.scores === "object" &&
    candidate.scores !== null
  );
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    if (!isValidPayload(payload)) {
      return NextResponse.json({ error: "Invalid prediction" }, { status: 400 });
    }

    const id = makeId();
    const cleanPayload: PredictionPayload = {
      name: payload.name.slice(0, 40),
      picks: payload.picks,
      scores: payload.scores,
    };

    await kv.set(`prediction:${id}`, cleanPayload, { ex: 60 * 60 * 24 * 120 });

    return NextResponse.json({ id });
  } catch {
    return NextResponse.json({ error: "Could not save prediction" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const payload = await kv.get<PredictionPayload>(`prediction:${id}`);

  if (!payload) {
    return NextResponse.json({ error: "Prediction not found" }, { status: 404 });
  }

  return NextResponse.json(payload);
}
