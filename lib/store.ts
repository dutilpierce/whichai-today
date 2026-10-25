import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const memory = new Map<string, { count: number; reset: number }>();
const limiters = new Map<string, Ratelimit>();

export function redis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return Redis.fromEnv();
}

function limiter(max: number, windowSec: number) {
  const client = redis();
  if (!client) return null;
  const key = `${max}:${windowSec}`;
  let existing = limiters.get(key);
  if (!existing) {
    existing = new Ratelimit({
      redis: client,
      limiter: Ratelimit.slidingWindow(max, `${windowSec} s`),
      prefix: "whichai",
      analytics: false,
    });
    limiters.set(key, existing);
  }
  return existing;
}

function memoryAllow(key: string, max: number, windowSec: number) {
  const now = Date.now();
  const hit = memory.get(key);
  if (!hit || hit.reset < now) {
    memory.set(key, { count: 1, reset: now + windowSec * 1000 });
    return true;
  }
  hit.count += 1;
  return hit.count <= max;
}

export async function allow(request: Request, bucket: string, max: number, windowSec: number) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const key = `${bucket}:${ip}`;
  try {
    const limited = limiter(max, windowSec);
    if (!limited) return memoryAllow(key, max, windowSec);
    const result = await limited.limit(key);
    return result.success;
  } catch (error) {
    console.error("rate limit skipped", error);
    return true;
  }
}

export async function cached(key: string, seconds: number, load: () => Promise<string | null>) {
  const client = redis();
  try {
    if (client) {
      const hit = await client.get<string>(key);
      if (typeof hit === "string" && hit.trim()) return hit;
    }
  } catch (error) {
    console.error("cache read skipped", error);
  }

  const value = await load();
  if (!value || !client) return value;
  try {
    await client.set(key, value, { ex: seconds });
  } catch (error) {
    console.error("cache write skipped", error);
  }
  return value;
}

export async function incr(key: string) {
  const client = redis();
  if (!client) return;
  try {
    await client.incr(key);
  } catch (error) {
    console.error("count skipped", error);
  }
}
