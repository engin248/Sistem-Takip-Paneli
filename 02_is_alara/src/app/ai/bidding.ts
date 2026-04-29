// src/app/ai/bidding.ts

/**
 * Distributed AI Organization – Bidding & Scoring System
 *
 * Workflow:
 *   1. Each agent submits a bid (numeric value) for a given task.
 *   2. BiddingEngine selects the best bid (lowest value – can be changed).
 *   3. The selected agent receives a reward, others receive a penalty.
 *   4. ScoreManager updates the persistent score for every agent.
 *
 * This file implements a lightweight, in‑memory version suitable for
 * integration with the existing pipeline (pipeline.ts) and hierarchy
 * (hierarchy.ts). All agents are expected to implement the `IAgent`
 * interface defined in `pipeline.ts`.
 */

import { IAgent } from "./pipeline";

/** Simple task definition used across the system */
export interface ITask {
  id: string;
  payload: unknown;
}

/** Agent identifier */
export type AgentId = string;

/** Result of a bid */
export interface BidResult {
  agentId: AgentId;
  bid: number; // lower is better (cost, time, etc.)
}

/** Score record for an agent */
export interface ScoreRecord {
  agentId: AgentId;
  score: number; // higher is better
}

/** In‑memory store – replace with a DB for production */
class ScoreManager {
  private scores: Map<AgentId, number> = new Map();

  constructor(initialScore = 100) {
    // initialise empty – scores are created lazily
    this.defaultScore = initialScore;
  }

  private defaultScore: number;

  getScore(agentId: AgentId): number {
    return this.scores.get(agentId) ?? this.defaultScore;
  }

  /** Apply reward (positive) or penalty (negative) */
  updateScore(agentId: AgentId, delta: number): void {
    const current = this.getScore(agentId);
    this.scores.set(agentId, current + delta);
  }

  /** Export current scores – useful for monitoring */
  dump(): ScoreRecord[] {
    const result: ScoreRecord[] = [];
    for (const [agentId, score] of this.scores.entries()) {
      result.push({ agentId, score });
    }
    return result;
  }
}

/** Engine that collects bids, selects the best, and updates scores */
export class BiddingEngine {
  private agents: Map<AgentId, IAgent<ITask, any>> = new Map();
  private scoreManager: ScoreManager;

  /**
   * reward / penalty values – can be tuned per project.
   * Positive reward for the winner, negative penalty for losers.
   */
  private readonly REWARD = 10;
  private readonly PENALTY = -5;

  constructor(scoreManager?: ScoreManager) {
    this.scoreManager = scoreManager ?? new ScoreManager();
  }

  /** Register an agent with a unique identifier */
  private static readonly MAX_AGENTS = 10;
  registerAgent(agentId: AgentId, agent: IAgent<ITask, any>): void {
    if (this.agents.size >= BiddingEngine.MAX_AGENTS) {
      throw new Error(`Agent limit of ${BiddingEngine.MAX_AGENTS} reached`);
    }
    if (this.agents.has(agentId)) {
      throw new Error(`Agent with id ${agentId} already registered`);
    }
    this.agents.set(agentId, agent);
  }

  /** Each agent provides a numeric bid for the task */
  async collectBids(task: ITask): Promise<BidResult[]> {
    const bids: BidResult[] = [];
    for (const [agentId, agent] of this.agents.entries()) {
      try {
        const result = await agent.process(task);
        const bid = typeof result === "number" ? result : Number(result);
        if (isNaN(bid)) {
          throw new Error(`Agent ${agentId} returned non‑numeric bid`);
        }
        bids.push({ agentId, bid });
      } catch (err) {
        // Propagate error with agent identifier for removal and retry
        const error: any = err;
        error.agentId = agentId;
        throw error;
      }
    }
    return bids;
  }

  /** Select the best bid (lowest value) */
  selectBest(bids: BidResult[]): BidResult {
    if (bids.length === 0) {
      throw new Error("No bids to select from");
    }
    this.evaluateRiskAndRules(bids);
    return bids.reduce((best, cur) => (cur.bid < best.bid ? cur : best));
  }

  /** Evaluate risk and rule compliance */
  private evaluateRiskAndRules(bids: BidResult[]): void {
    // Rule: bids must be non‑negative
    for (const b of bids) {
      if (b.bid < 0) {
        throw new Error(`Rule violation: negative bid from agent ${b.agentId}`);
      }
    }
    // High risk: any bid > 80 (example threshold)
    const highRiskBids = bids.filter(b => b.bid > 80);
    if (highRiskBids.length > 0) {
      console.warn(
        "High risk detected: bids exceeding safe threshold",
        highRiskBids.map(b => `${b.agentId}:${b.bid}`).join(", ")
      );
    }
  }

  /** Apply reward/penalty based on the selected bid */
  applyRewards(best: BidResult, allBids: BidResult[]): void {
    for (const bid of allBids) {
      if (bid.agentId === best.agentId) {
        this.scoreManager.updateScore(bid.agentId, this.REWARD);
      } else {
        this.scoreManager.updateScore(bid.agentId, this.PENALTY);
      }
    }
  }

  /** Evaluate agents: clone if score > 15, remove if score < 3 */
  private evaluateAgents(): void {
    const scores = this.scoreManager.dump();
    for (const { agentId, score } of scores) {
      if (score > 15) {
        const original = this.agents.get(agentId);
        if (original) {
          const cloneId = `${agentId}_clone_${Date.now()}`;
          this.agents.set(cloneId, original);
          // Initialize clone with same score
          this.scoreManager.updateScore(cloneId, score);
        }
      } else if (score < 3) {
        this.agents.delete(agentId);
        // Optionally keep score entry for audit
      }
    }
  }

  /** Public API – run a full bidding round */
  async run(task: ITask): Promise<{ best: BidResult; scores: ScoreRecord[] }> {
    const bids = await this.collectBids(task);
    const best = this.selectBest(bids);
    this.applyRewards(best, bids);
    this.evaluateAgents();
    return { best, scores: this.scoreManager.dump() };
  }
}

/** Example usage – can be removed or moved to a test file */
async function demo() {
  // Dummy agents that simply return a random bid value
  class DummyAgent implements IAgent<ITask, number> {
    async process(_: ITask): Promise<number> {
      return Math.floor(Math.random() * 100);
    }
  }

  const engine = new BiddingEngine();
  engine.registerAgent("agentA", new DummyAgent());
  engine.registerAgent("agentB", new DummyAgent());
  engine.registerAgent("agentC", new DummyAgent());

  const task: ITask = { id: "t1", payload: {} };
  const result = await engine.run(task);
  console.log("Best bid:", result.best);
  console.log("Scores after round:", result.scores);
}

// Uncomment to run demo when executing this module directly
// demo();
