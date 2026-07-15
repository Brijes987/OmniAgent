# OmniAgent - Multi-Agent Orchestration Platform

OmniAgent is an enterprise-grade, event-driven multi-agent orchestration platform built with Next.js, Node.js, Python, and Docker. It enables you to design, execute, and monitor complex workflows composed of triggers, LLM agents, and tools, all in a beautiful visual interface.

## Demo

![OmniAgent Workflow Builder Demo](https://coresg-normal.trae.ai/api/v1/text_to_image?prompt=Enterprise%20multi-agent%20workflow%20builder%20UI%20with%20React%20Flow%20canvas%20showing%20trigger%2C%20agent%2C%20and%20tool%20nodes%2C%20dark%20theme%2C%20Tailwind%20CSS%2C%20ShadCN%20UI&image_size=square_hd)

## Architecture Overview

OmniAgent uses a decoupled architecture with the following components:
- **Frontend**: Next.js + React Flow visual workflow builder with Zustand state management
- **Backend-Gateway**: Express.js + Socket.IO + Kafka producer/consumer
- **AI Workers**: Python + AsyncIO + OpenAI + Qdrant
- **Infrastructure**: Postgres, Redis, Kafka, Qdrant

## Key Features

### 🎨 Visual Workflow Builder
- Drag-and-drop nodes (Triggers, Agents, Tools)
- Real-time validation and DAG cycle detection
- Beautiful UI built with Tailwind CSS and ShadCN UI

### 🧠 AI Agent Orchestration
- LLM integration (GPT-4o, Claude 3.5 Sonnet, Llama-3-70B)
- Semantic caching via Qdrant for reduced latency and costs
- Self-healing with JSON schema validation and retries

### 📊 Observability & FinOps
- Real-time execution timeline
- Token and cost tracking per node and workflow
- Live metrics stream via WebSockets
- Historical execution data stored in Postgres

### 🛠️ Tools & Integrations
- Web search (mock)
- Vector DB (Qdrant) querying
- Slack notifications (mock)
- PostgreSQL queries (mock)

## Tech Stack

### Frontend
- [Next.js](https://nextjs.org) 15
- [React Flow](https://reactflow.dev) 11
- [Zustand](https://zustand-demo.pmnd.rs)
- [Tailwind CSS](https://tailwindcss.com)
- [ShadCN UI](https://ui.shadcn.com)

### Backend Gateway
- [Node.js](https://nodejs.org) 22
- [Express](https://expressjs.com)
- [Socket.IO](https://socket.io)
- [Prisma](https://www.prisma.io) ORM
- [Kafka.js](https://kafka.js.org)
- [ioredis](https://github.com/luin/ioredis)

### AI Workers
- [Python](https://www.python.org) 3.10
- [FastAPI](https://fastapi.tiangolo.com)
- [aiokafka](https://aiokafka.readthedocs.io)
- [OpenAI SDK](https://platform.openai.com/docs/libraries)
- [Qdrant Client](https://qdrant.tech/documentation)
- [Pydantic](https://docs.pydantic.dev)

### Infrastructure
- [PostgreSQL](https://www.postgresql.org)
- [Redis](https://redis.io)
- [Apache Kafka](https://kafka.apache.org) + Zookeeper
- [Qdrant](https://qdrant.tech) Vector Database
- [Docker](https://www.docker.com) + Docker Compose

## Getting Started

### Prerequisites
- Docker and Docker Compose installed on your machine
- OpenAI API key (for LLM features)

### Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/Brijes987/OmniAgent.git
   cd OmniAgent
   ```

2. Start all services with Docker Compose:
   ```bash
   docker-compose up -d --build
   ```

3. Open the application in your browser at http://localhost:3000!

## Environment Variables

### Backend Gateway (.env.example provided)
```env
DATABASE_URL=postgresql://user:password@postgres:5432/omniagent
REDIS_HOST=redis
REDIS_PORT=6379
KAFKA_BROKER=kafka:29092
KAFKA_CLIENT_ID=omniagent-gateway
KAFKA_CONSUMER_GROUP_ID=omniagent-execution-consumers
```

### AI Workers (.env.example provided)
```env
KAFKA_BROKER=kafka:29092
KAFKA_CONSUMER_GROUP_ID=omniagent-ai-workers
OPENAI_API_KEY=your-openai-api-key
QDRANT_URL=http://qdrant:6333
QDRANT_CACHE_COLLECTION=omniagent-semantic-cache
```

### Frontend (.env.local.example provided)
```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

## Usage Guide

1. **Design a Workflow**:
   - Drag a Trigger node to the canvas (webhook or schedule)
   - Add one or more Agent nodes
   - Optionally add Tool nodes
   - Connect the nodes together

2. **Execute a Workflow**:
   - Click "Run Simulation" in the top right
   - Watch execution traces appear in real-time in the right sidebar
   - Monitor total tokens and cost

3. **Inspect Nodes**:
   - Click a node to select it
   - Edit node properties in the left inspector panel

## Services Endpoints

- **Frontend**: http://localhost:3000
- **Backend Gateway**: http://localhost:3001
- **AI Workers Health**: http://localhost:8000/health
- **Qdrant Console**: http://localhost:6333/dashboard
- **Kafka**: localhost:9092

## Running Tests

### Backend Tests (Jest)
```bash
cd backend-gateway
npm install
npm test
```

### AI Workers Tests (Pytest)
```bash
cd ai-workers
pip install -r requirements.txt
pytest tests/
```

## Project Structure

```
OmniAgent/
├── frontend/                # Next.js application
│   ├── src/
│   │   ├── app/            # Next.js App Router
│   │   ├── components/     # UI components & nodes
│   │   ├── lib/            # Utility functions
│   │   ├── store/          # Zustand state management
│   │   └── utils/          # Socket.IO client
│   ├── package.json
│   └── Dockerfile
├── backend-gateway/         # Node.js API & orchestration
│   ├── prisma/             # Prisma schema
│   ├── src/
│   │   ├── __tests__/      # Jest tests
│   │   ├── services/       # Orchestration service
│   │   ├── utils/          # Kafka & Redis clients
│   │   └── workers/        # Kafka event consumer
│   ├── package.json
│   └── Dockerfile
├── ai-workers/              # Python AI task workers
│   ├── tests/              # Pytest tests
│   ├── ai_engine.py        # LLM inference & self-healing
│   ├── finops.py           # Cost calculation
│   ├── kafka_client.py     # Kafka producer/consumer
│   ├── semantic_cache.py   # Qdrant semantic cache
│   ├── tool_executor.py    # Tool implementations
│   ├── main.py             # FastAPI entry point
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml       # Docker orchestration
└── README.md                # This file!
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request!

## License

MIT License
