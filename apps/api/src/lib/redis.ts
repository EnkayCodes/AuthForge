import { Redis } from "ioredis";

let _connection: Redis | undefined;

export function getRedisConnection(): Redis {
  if (_connection) return _connection;
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  _connection = new Redis(url, { maxRetriesPerRequest: null });
  return _connection;
}

export async function closeRedis(): Promise<void> {
  if (_connection) {
    await _connection.quit();
    _connection = undefined;
  }
}
