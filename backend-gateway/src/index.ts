import "dotenv/config";
import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { PrismaClient, ExecutionStatus } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { RedisStateManager } from "./utils/redis";
import { KafkaProducer } from "./utils/kafka";
import { ExecutionEventConsumer } from "./workers/eventConsumer";

const PORT = process.env.PORT || 3001;

async function main() {
  // Initialize dependencies
  const app = express();
  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: { origin: "*" },
  });
  const prisma = new PrismaClient();
  const redis = new RedisStateManager();
  const kafkaProducer = new KafkaProducer();
  const eventConsumer = new ExecutionEventConsumer(io);

  // Middleware
  app.use(express.json());

  // Health check
  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Socket.io connection handling
  io.on("connection", async (socket) => {
    console.log(`[SocketIO] Client connected: ${socket.id}`);

    // Execute workflow
    socket.on("execute-workflow", async (workflowData: { nodes: any[]; edges: any[] }) => {
      try {
        console.log(`[SocketIO] Received execute-workflow from ${socket.id}`);

        // 1. Create a temporary workflow record (for multi-tenant later we can link to user)
        const workflow = await prisma.workflow.create({
          data: {
            name: `Workflow ${new Date().toISOString()}`,
            nodes: workflowData.nodes,
            edges: workflowData.edges,
          },
        });

        // 2. Create workflow execution record
        const execution = await prisma.workflowExecution.create({
          data: {
            workflowId: workflow.id,
            status: ExecutionStatus.PENDING,
          },
        });

        // 3. Create execution trace records for each node
        for (const node of workflowData.nodes) {
          await prisma.executionTrace.create({
            data: {
              executionId: execution.id,
              nodeId: node.id,
              nodeType: node.type,
              status: ExecutionStatus.PENDING,
            },
          });
        }

        // 4. Map executionId to socketId in Redis
        await redis.mapExecutionToSocket(execution.id, socket.id);

        // 5. Cache workflow schema in Redis
        await redis.cacheWorkflowSchema(execution.id, workflowData);

        // 6. Find the trigger node to start execution
        const triggerNode = workflowData.nodes.find((n) => n.type === "trigger");
        if (!triggerNode) {
          throw new Error("No trigger node found in workflow");
        }

        // 7. Publish task to Kafka
        await kafkaProducer.publishTask("agent-tasks", {
          executionId: execution.id,
          nodeId: triggerNode.id,
          nodeType: triggerNode.type,
          data: triggerNode.data,
          pipeline: workflowData,
        });

        // 8. Emit initial execution trace
        socket.emit("execution-trace", {
          executionId: execution.id,
          nodeId: triggerNode.id,
          nodeType: triggerNode.type,
          status: ExecutionStatus.RUNNING,
          message: "Workflow execution started",
        });

        // 9. Update execution status to RUNNING
        await prisma.workflowExecution.update({
          where: { id: execution.id },
          data: { status: ExecutionStatus.RUNNING },
        });

        console.log(`[SocketIO] Workflow execution ${execution.id} started`);
      } catch (err) {
        console.error("[SocketIO] Error executing workflow:", err);
        socket.emit("execution-trace", {
          status: "FAILED",
          message: (err as Error).message,
        });
      }
    });

    socket.on("disconnect", () => {
      console.log(`[SocketIO] Client disconnected: ${socket.id}`);
    });
  });

  // Connect to services
  await redis.connect();
  await kafkaProducer.connect();
  await eventConsumer.start();

  // Start server
  server.listen(PORT, () => {
    console.log(`[Server] Backend gateway listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error("Fatal error starting server:", err);
  process.exit(1);
});
