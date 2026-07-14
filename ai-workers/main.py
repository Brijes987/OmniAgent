import asyncio
import time
from contextlib import asynccontextmanager
from typing import Any, Dict
from fastapi import FastAPI
from dotenv import load_dotenv
from kafka_client import KafkaClient
from ai_engine import AIEngine
from tool_executor import ToolExecutor

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize clients
    kafka_client = KafkaClient()
    ai_engine = AIEngine()
    tool_executor = ToolExecutor()

    # Start Kafka
    await kafka_client.start_consumer("agent-tasks")
    await kafka_client.start_producer()

    # Store clients in app state
    app.state.kafka_client = kafka_client
    app.state.ai_engine = ai_engine
    app.state.tool_executor = tool_executor

    # Start worker loop in background
    task = asyncio.create_task(worker_loop(kafka_client, ai_engine, tool_executor))

    yield

    # Cleanup
    task.cancel()
    await kafka_client.stop()


app = FastAPI(lifespan=lifespan)


async def worker_loop(
    kafka_client: KafkaClient,
    ai_engine: AIEngine,
    tool_executor: ToolExecutor,
):
    print("[Worker] Starting worker loop")
    try:
        async for msg in kafka_client.consumer:
            task_data = msg.value
            execution_id = task_data["executionId"]
            node_id = task_data["nodeId"]
            node_type = task_data["nodeType"]
            data = task_data.get("data", {})
            pipeline = task_data.get("pipeline", {})

            print(f"[Worker] Received task: execution={execution_id}, node={node_id}, type={node_type}")

            # Publish RUNNING trace
            await kafka_client.publish_trace(
                execution_id=execution_id,
                node_id=node_id,
                node_type=node_type,
                status="RUNNING",
            )

            start_time = time.time()
            tokens_used = 0
            cost = 0.0

            try:
                # Execute task based on type
                if node_type == "trigger":
                    # Trigger node: just pass through, find next nodes in pipeline
                    output_data = {"status": "triggered"}
                elif node_type == "agent":
                    # Agent node: run inference
                    system_prompt = data.get("systemPrompt", "You are a helpful assistant.")
                    user_prompt = data.get("userPrompt", "Hello!")
                    model = data.get("model", "gpt-4o")
                    temperature = data.get("temperature", 0.7)
                    output_data, tokens_used, cost = await ai_engine.generate(
                        system_prompt=system_prompt,
                        user_prompt=user_prompt,
                        model=model,
                        temperature=temperature,
                    )
                elif node_type == "tool":
                    # Tool node: execute tool
                    tool_type = data.get("toolType")
                    parameters = data.get("parameters", {})
                    output_data = await tool_executor.execute(tool_type, parameters)
                else:
                    raise ValueError(f"Unknown node type: {node_type}")

                # Calculate duration
                duration_ms = int((time.time() - start_time) * 1000)

                # Publish COMPLETED trace
                await kafka_client.publish_trace(
                    execution_id=execution_id,
                    node_id=node_id,
                    node_type=node_type,
                    status="COMPLETED",
                    output_data=output_data,
                    duration_ms=duration_ms,
                    tokens_used=tokens_used,
                    cost=cost,
                )
                print(f"[Worker] Task completed: execution={execution_id}, duration={duration_ms}ms, tokens={tokens_used}, cost=${cost}")

            except Exception as e:
                duration_ms = int((time.time() - start_time) * 1000)
                print(f"[Worker] Task failed: execution={execution_id}, error={str(e)}")
                await kafka_client.publish_trace(
                    execution_id=execution_id,
                    node_id=node_id,
                    node_type=node_type,
                    status="FAILED",
                    error_msg=str(e),
                    duration_ms=duration_ms,
                )

    except asyncio.CancelledError:
        print("[Worker] Worker loop cancelled")
    except Exception as e:
        print(f"[Worker] Fatal error in worker loop: {str(e)}")


@app.get("/health")
async def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
