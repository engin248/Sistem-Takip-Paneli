// src/app/ai/hierarchy.ts

/**
 * Hierarchy implementation for Distributed AI Organization
 * COMMANDER → MANAGER → WORKER
 * Each level delegates the task to the next lower level.
 */

import { IAgent } from "./pipeline";

/** Simple task definition */
export interface ITask {
  id: string;
  payload: any;
}

/** Worker – lowest level, executes concrete actions */
export class WorkerAgent implements IAgent<ITask, any> {
  async process(task: ITask): Promise<any> {
    // Placeholder: actual work logic goes here
    console.log(`[Worker] Executing task ${task.id}`);
    return { workerResult: `completed ${task.id}` };
  }
}

/** Manager – receives tasks, may split or enrich, then forwards to Worker */
export class ManagerAgent implements IAgent<ITask, any> {
  private worker = new WorkerAgent();

  async process(task: ITask): Promise<any> {
    console.log(`[Manager] Received task ${task.id}`);
    // Example enrichment (could be more complex)
    const enrichedTask = { ...task, payload: { ...task.payload, managed: true } };
    const result = await this.worker.process(enrichedTask);
    console.log(`[Manager] Worker result for ${task.id}:`, result);
    return { managerResult: result };
  }
}

/** Commander – top level, decides strategy and delegates to Manager */
export class CommanderAgent implements IAgent<ITask, any> {
  private manager = new ManagerAgent();

  async process(task: ITask): Promise<any> {
    console.log(`[Commander] Planning task ${task.id}`);
    // Example strategic modification
    const strategicTask = { ...task, payload: { ...task.payload, strategic: true } };
    const result = await this.manager.process(strategicTask);
    console.log(`[Commander] Manager result for ${task.id}:`, result);
    return { commanderResult: result };
  }
}

/** Convenience runner */
export async function runHierarchy(task: ITask): Promise<any> {
  const commander = new CommanderAgent();
  return commander.process(task);
}
