import { Kafka, Consumer, EachMessagePayload } from "kafkajs";
import { PrismaClient, ExecutionStatus } from "@prisma/client";
import { RedisStateManager } from "../utils/redis";
import { Server as SocketIOServer } from "socket.io";

const KAFKA_BROKER = process.env.KAFKA_BROKER || "localhost:9092";
const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || "omniagent-gateway";
const KAFKA_CONSUMER_GROUP_ID = process.env.KAFKA_CONSUMER_GROUP_ID || "omniagent-execution-consumers";

export class ExecutionEventConsumer {
  private kafka: Kafka;
  private consumer: Consumer;
  private prisma: PrismaClient;
  private redis: RedisStateManager;
  private io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.kafka = new Kafka({
      clientId: KAFKA_CLIENT_ID,
      brokers: [KAFKA_BROKER],
    });
    this.consumer = this.kafka.consumer({ groupId: KAFKA_CONSUMER_GROUP_ID });
    this.prisma = new PrismaClient();
    this.redis = new RedisStateManager();
    this.io = io;
  }

  async start() {
    await this.redis.connect();
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: "execution-traces", fromBeginning: false });

    console.log("[ExecutionEventConsumer] Started listening to execution-traces topic");

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        try {
          if (!payload.message.value) return;

          const traceData = JSON.parse(payload.message.value.toString());
          await this.processTrace(traceData);
        } catch (err) {
          console.error("[ExecutionEventConsumer] Error processing message:", err);
        }
      },
    });
  }

  private async processTrace(data: {
    executionId: string;
    nodeId: string;
    nodeType: string;
    status: ExecutionStatus;
    inputData?: any;
    outputData?: any;
    durationMs?: number;
    tokensUsed?: number;
    cost?: number;
    message?: string;
  }) {
    console.log("[ExecutionEventConsumer] Processing trace:", data);

    // Find existing trace or create new
    let trace = await this.prisma.executionTrace.findFirst({
      where: { executionId: data.executionId, nodeId: data.nodeId },
    });

    const now = new Date();

    if (trace) {
      trace = await this.prisma.executionTrace.update({
        where: { id: trace.id },
        data: {
          status: data.status,
          inputData: data.inputData || trace.inputData,
          outputData: data.outputData || trace.outputData,
          durationMs: data.durationMs || trace.durationMs,
          tokensUsed: data.tokensUsed || trace.tokensUsed,
          cost: data.cost || trace.cost,
        },
      });
    } else {
      trace = await this.prisma.executionTrace.create({
        data: {
          executionId: data.executionId,
          nodeId: data.nodeId,
          nodeType: data.nodeType,
          status: data.status,
          inputData: data.inputData,
          outputData: data.outputData,
          durationMs: data.durationMs,
          tokensUsed: data.tokensUsed,
          cost: data.cost,
        },
      });
    }

    // Aggregate total tokens and cost
    const aggregates = await this.prisma.executionTrace.aggregate({
      where: { executionId: data.executionId },
      _sum: {
        tokensUsed: true,
        cost: true,
      },
    });

    // Update workflow execution
    const updatedExecution = await this.prisma.workflowExecution.update({
      where: { id: data.executionId },
      data: {
        status: data.status === "FAILED" ? "FAILED" : data.status === "COMPLETED" ? "COMPLETED" : "RUNNING",
        completedAt: data.status === "COMPLETED" || data.status === "FAILED" ? now : null,
        totalTokens: aggregates._sum.tokensUsed || 0,
        totalCost: aggregates._sum.cost || 0.0,
      },
    });

    // Emit to client via socket.io
    const socketId = await this.redis.getSocketIdForExecution(data.executionId);
    if (socketId) {
      this.io.to(socketId).emit("execution-trace", {
        ...trace,
        message: data.message,
        totalTokens: updatedExecution.totalTokens,
        totalCost: updatedExecution.totalCost,
      });
    }
  }

  async stop() {
    await this.consumer.disconnect();
    await this.prisma.$disconnect();
    await this.redis.disconnect();
  }
}
