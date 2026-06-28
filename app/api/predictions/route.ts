import { NextRequest, NextResponse } from "next/server";

type PredictionPayload = {
  name: string;
  picks: Record<string, string>;
  scores: Record<string, { team1: string; team2: string }>;
};

function getRedisConfig() {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.STORAGE_KV_REST_API_URL ||
    process.env.STORAGE_REDIS_REST_URL ||
    process.env.STORAGE_REST_API_URL ||
    process.env.STORAGE_URL;

  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.STORAGE_KV_REST_API_TOKEN ||
    process.env.STORAGE_REDIS_REST_TOKEN ||
    process.env.STORAGE_REST_API_TOKEN ||
    process.env.STORAGE_TOKEN;

  if (!url || !token) {
    return null;
  }

  return { url: url.replace(/\/$/, ""), token };
}

async function redisCommand<T>(command: unknown[]) {
  const config = getRedisConfig();

  if (!config) {
    throw new Error("Missing Redis environment variables");
  }

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Redis command failed");
  }

  const data = (await response.json()) as { result: T };
  return data.result;
}

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

    await redisCommand(["SET", `prediction:${id}`, JSON.stringify(cleanPayload), "EX", 60 * 60 * 24 * 120]);

    return NextResponse.json({ id });
  } catch (error) {
    return NextResponse.json(
      { error: "Could not save prediction" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const result = await redisCommand<string | null>(["GET", `prediction:${id}`]);

    if (!result) {
      return NextResponse.json({ error: "Prediction not found" }, { status: 404 });
    }

    return NextResponse.json(JSON.parse(result));
  } catch {
    return NextResponse.json({ error: "Could not load prediction" }, { status: 500 });
  }
}
