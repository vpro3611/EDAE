describe("redis configuration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("builds BullMQ connection options from REDIS_URL", async () => {
    process.env.REDIS_URL =
      "rediss://default:secret-password@secure-pipefish-108746.upstash.io:6379";

    const { getRedisConnectionOptions, REDIS } = await import("../src/redis");

    expect(getRedisConnectionOptions()).toMatchObject({
      host: "secure-pipefish-108746.upstash.io",
      port: 6379,
      username: "default",
      password: "secret-password",
      tls: {},
    });

    REDIS.disconnect();
  });

  it("falls back to localhost when REDIS_URL is missing", async () => {
    delete process.env.REDIS_URL;

    const { getRedisConnectionOptions, REDIS } = await import("../src/redis");

    expect(getRedisConnectionOptions()).toMatchObject({
      host: "localhost",
      port: 6379,
    });

    REDIS.disconnect();
  });
});
