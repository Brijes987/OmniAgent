import os
import json
from typing import Optional, Any
from dotenv import load_dotenv
from openai import AsyncOpenAI
from qdrant_client import AsyncQdrantClient, models
from qdrant_client.models import Distance, VectorParams

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
CACHE_COLLECTION_NAME = os.getenv("QDRANT_CACHE_COLLECTION", "omniagent-semantic-cache")


class SemanticCache:
    def __init__(self):
        self.openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)
        self.qdrant_client = AsyncQdrantClient(url=QDRANT_URL)
        self.collection_name = CACHE_COLLECTION_NAME

    async def _ensure_collection_exists(self):
        collections = await self.qdrant_client.get_collections()
        collection_names = [c.name for c in collections.collections]

        if self.collection_name not in collection_names:
            await self.qdrant_client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(size=1536, distance=Distance.COSINE),
            )
            print(f"[SemanticCache] Created collection {self.collection_name}")

    async def get_embedding(self, text: str) -> list[float]:
        response = await self.openai_client.embeddings.create(
            model="text-embedding-3-small", input=text
        )
        return response.data[0].embedding

    async def lookup(self, prompt: str) -> Optional[Any]:
        await self._ensure_collection_exists()
        embedding = await self.get_embedding(prompt)

        search_result = await self.qdrant_client.search(
            collection_name=self.collection_name,
            query_vector=embedding,
            limit=1,
            score_threshold=0.95,
        )

        if search_result:
            cached_data = search_result[0].payload.get("response")
            print(f"[SemanticCache] Cache hit for prompt")
            return cached_data

        print(f"[SemanticCache] Cache miss for prompt")
        return None

    async def store(self, prompt: str, response: Any):
        await self._ensure_collection_exists()
        embedding = await self.get_embedding(prompt)
        from uuid import uuid4

        await self.qdrant_client.upsert(
            collection_name=self.collection_name,
            points=[
                models.PointStruct(
                    id=str(uuid4()),
                    vector=embedding,
                    payload={"prompt": prompt, "response": response},
                )
            ],
        )
        print(f"[SemanticCache] Stored prompt/response in cache")
