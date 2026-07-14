import Redis from "ioredis";

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379");

export class RedisStateManager {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
    });
  }

  async connect() {
    await this.client.ping();
    console.log("[RedisStateManager] Connected to Redis");
  }

  async mapExecutionToSocket(executionId: string, socketId: string) {
    await this.client.set(`execution:${executionId}:socket`, socketId, "EX", 3600);
  }

  async getSocketIdForExecution(executionId: string): Promise<string | null> {
    return await this.client.get(`execution:${executionId}:socket`);
  }

  async cacheWorkflowSchema(executionId: string, schema: any) {
    await this.client.set(`execution:${executionId}`, JSON.stringify(schema), "EX", 3600);
  }

  async getCachedWorkflowSchema(executionId: string): Promise<any | null> {
    const data = await this.client.get(`execution:${executionId}`);
    return data ? JSON.parse(data) : null;
  }

  async disconnect() {
    await this.client.quit();
  }
}
