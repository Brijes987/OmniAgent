import { createWorkflowExecution } from '../services/orchestrator';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Workflow Serialization & Trace Initialization', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.executionTrace.deleteMany({});
    await prisma.workflowExecution.deleteMany({});
    await prisma.workflow.deleteMany({});
    await prisma.$disconnect();
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
    
    const traces = await prisma.executionTrace.findMany({
      where: { executionId: execution.id }
    });

    // Verify system created a tracing node entry for every node in DAG
    expect(traces.length).toBe(2);
    expect(traces.find(t => t.nodeId === '2')?.nodeType).toBe('agent');
  });
});
