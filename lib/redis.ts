import { Redis } from "@upstash/redis";

type Hash = Record<string, string>;

export type RedisStore = {
  zrange: (
    key: string,
    start: number,
    stop: number,
    options: { withScores: true; rev: true }
  ) => Promise<Array<string | number>>;
  hmget: (key: string, ...fields: string[]) => Promise<Hash>;
  zadd: (key: string, value: { score: number; member: string }) => Promise<unknown>;
  hset: (key: string, values: Hash) => Promise<unknown>;
  hdel: (key: string, field: string) => Promise<unknown>;
  hexists: (key: string, field: string) => Promise<boolean>;
  zincrby: (key: string, increment: number, member: string) => Promise<number>;
  zrem: (key: string, member: string) => Promise<unknown>;
  pipeline: () => {
    zadd: (key: string, value: { score: number; member: string }) => unknown;
    hset: (key: string, values: Hash) => unknown;
    exec: () => Promise<unknown>;
  };
};

class LocalRedis implements RedisStore {
  private scores = new Map<string, number>();
  private hashes = new Map<string, Hash>();

  async zrange(_key: string, _start: number, _stop: number) {
    const values: Array<string | number> = [];
    [...this.scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .forEach(([id, score]) => values.push(id, score));
    return values;
  }

  async hmget(key: string, ...fields: string[]) {
    const hash = this.hashes.get(key) ?? {};
    return Object.fromEntries(fields.map((field) => [field, hash[field]]));
  }

  async zadd(_key: string, { score, member }: { score: number; member: string }) {
    this.scores.set(member, score);
  }

  async hset(key: string, values: Hash) {
    this.hashes.set(key, { ...(this.hashes.get(key) ?? {}), ...values });
  }

  async hdel(key: string, field: string) {
    const hash = this.hashes.get(key);
    if (hash) delete hash[field];
  }

  async hexists(key: string, field: string) {
    return field in (this.hashes.get(key) ?? {});
  }

  async zincrby(_key: string, increment: number, member: string) {
    const score = (this.scores.get(member) ?? 0) + increment;
    this.scores.set(member, score);
    return score;
  }

  async zrem(_key: string, member: string) {
    this.scores.delete(member);
  }

  pipeline() {
    const operations: Array<() => Promise<unknown>> = [];
    return {
      zadd: (key: string, value: { score: number; member: string }) => {
        operations.push(() => this.zadd(key, value));
      },
      hset: (key: string, values: Hash) => {
        operations.push(() => this.hset(key, values));
      },
      exec: async () => Promise.all(operations.map((operation) => operation())),
    };
  }
}

const hasRedisConfig =
  Boolean(process.env.UPSTASH_REDIS_REST_URL) && Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);

// Use Upstash in hosted environments and an in-memory store for local development.
export const redis: RedisStore = hasRedisConfig
  ? (Redis.fromEnv() as unknown as RedisStore)
  : new LocalRedis();

export const KEYS = {
  scores: "leaderboard:scores", // sorted set: member = participantId, score = points
  names: "leaderboard:names", // hash: field = participantId, value = participant name
  teams: "leaderboard:teams", // hash: field = participantId, value = team option id
};
