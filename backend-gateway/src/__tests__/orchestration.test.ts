import { createWorkflowExecution } from '../services/orchestrator';
import { PrismaClient } from '@prisma/client';

// Mock PrismaClient
const mockPrisma = {
  workflow: {
    create: jest.fn().mockResolvedValue({ id: 'test-workflow-id' }),
  },
  workflowExecution: {
    create: jest.fn().mockResolvedValue({ id: 'test-execution-id', status: 'PENDING' }),
  },
  executionTrace: {
    create: jest.fn().mockResolvedValue({}),
    findMany: jest.fn().mockResolvedValue([
      { nodeId: '1', nodeType: 'trigger' },
      { nodeId: '2', nodeType: 'agent' },
    ]),
  },
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
};

// Override PrismaClient with mock
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

describe('Workflow Serialization & Trace Initialization', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should compile an incoming valid DAG and generate Execution Traces', async () => {
    const validDAG = {
      nodes: [
        { id: '1', type: 'trigger', data: { triggerType: 'webhook' } },
        { id: '2', type: 'agent', data: { model: 'gpt-4o', systemPrompt: 'Be a helper' } }
      ],
      edges: [{ source: '1', target: '2' }]
    };

    const execution = await createWorkflowExecution(validDAG);

    expect(execution.status).toBe('PENDING');
    expect(mockPrisma.workflow.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.workflowExecution.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.executionTrace.create).toHaveBeenCalledTimes(2);
  });
});
