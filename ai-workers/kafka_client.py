import json
import asyncio
import os
from typing import Any, Dict, Optional
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from dotenv import load_dotenv

load_dotenv()

KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")
CONSUMER_GROUP_ID = os.getenv("KAFKA_CONSUMER_GROUP_ID", "omniagent-ai-workers")


class KafkaClient:
    def __init__(self):
        self.consumer: Optional[AIOKafkaConsumer] = None
        self.producer: Optional[AIOKafkaProducer] = None

    async def _connect_with_backoff(self, connect_func, max_retries: int = 10):
        retries = 0
        while retries < max_retries:
            try:
                await connect_func()
                return
            except Exception as e:
                wait_time = 2 ** retries
                print(f"[KafkaClient] Connection failed: {e}, retrying in {wait_time}s...")
                await asyncio.sleep(wait_time)
                retries += 1
        raise Exception("[KafkaClient] Failed to connect after maximum retries")

    async def start_consumer(self, topic: str):
        async def _connect():
            self.consumer = AIOKafkaConsumer(
                topic,
                bootstrap_servers=KAFKA_BROKER,
                group_id=CONSUMER_GROUP_ID,
                value_deserializer=lambda m: json.loads(m.decode("utf-8")),
            )
            await self.consumer.start()
            print(f"[KafkaClient] Consumer started on topic: {topic}")

        await self._connect_with_backoff(_connect)

    async def start_producer(self):
        async def _connect():
            self.producer = AIOKafkaProducer(
                bootstrap_servers=KAFKA_BROKER,
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
            )
            await self.producer.start()
            print(f"[KafkaClient] Producer started")

        await self._connect_with_backoff(_connect)

    async def publish_trace(
        self,
        execution_id: str,
        node_id: str,
        node_type: str,
        status: str,
        output_data: Optional[Any] = None,
        error_msg: Optional[str] = None,
        duration_ms: Optional[int] = None,
        tokens_used: Optional[int] = None,
        cost: Optional[float] = None,
    ):
        if not self.producer:
            raise Exception("[KafkaClient] Producer not started")

        payload = {
            "executionId": execution_id,
            "nodeId": node_id,
            "nodeType": node_type,
            "status": status,
            "outputData": output_data,
            "message": error_msg,
            "durationMs": duration_ms,
            "tokensUsed": tokens_used,
            "cost": cost,
        }
        await self.producer.send("execution-traces", value=payload)
        print(f"[KafkaClient] Published trace for execution {execution_id}")

    async def stop(self):
        if self.consumer:
            await self.consumer.stop()
        if self.producer:
            await self.producer.stop()
        print("[KafkaClient] Stopped")
