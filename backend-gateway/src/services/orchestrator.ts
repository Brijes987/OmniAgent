import { PrismaClient, WorkflowExecution } from '@prisma/client';

const prisma = new PrismaClient();

export async function createWorkflowExecution(dag: { nodes: any[]; edges: any[] }): Promise<WorkflowExecution> {
  // 1. Create workflow
  const workflow = await prisma.workflow.create({
    data: {
      name: `Workflow ${new Date().toISOString()}`,
      nodes: dag.nodes,
      edges: dag.edges,
    },
  });

  // 2. Create execution
  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId: workflow.id,
      status: 'PENDING',
    },
  });

  // 3. Create traces for each node
  for (const node of dag.nodes) {
    await prisma.executionTrace.create({
      data: {
        executionId: execution.id,
        nodeId: node.id,
        nodeType: node.type,
        status: 'PENDING',
      },
    });
  }

  return execution;
}
