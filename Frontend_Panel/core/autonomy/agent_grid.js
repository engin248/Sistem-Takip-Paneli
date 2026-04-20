'use strict';

const BASE_AGENTS = [
  {
    id: 'planner_commander',
    name: 'Planner Agent',
    hierarchy: 'COMMANDER',
    capabilities: ['plan', 'strategy', 'self-management', 'governance'],
    score: 12,
    active: true,
    protected: true,
  },
  {
    id: 'decision_manager',
    name: 'Decision Agent',
    hierarchy: 'MANAGER',
    capabilities: ['decision', 'consensus', 'alternatives'],
    score: 12,
    active: true,
    protected: true,
  },
  {
    id: 'execution_worker',
    name: 'Execution Agent',
    hierarchy: 'WORKER',
    capabilities: ['execution', 'dispatch', 'operations'],
    score: 11,
    active: true,
  },
  {
    id: 'control_manager',
    name: 'Control Agent',
    hierarchy: 'MANAGER',
    capabilities: ['control', 'validation', 'master'],
    score: 12,
    active: true,
    protected: true,
  },
  {
    id: 'monitoring_agent',
    name: 'Monitoring Agent',
    hierarchy: 'WORKER',
    capabilities: ['monitoring', 'anomaly', 'alerts'],
    score: 10,
    active: true,
  },
  {
    id: 'audit_agent',
    name: 'Audit Agent',
    hierarchy: 'WORKER',
    capabilities: ['audit', 'governance', 'evidence'],
    score: 10,
    active: true,
  },
  {
    id: 'learning_agent',
    name: 'Learning Agent',
    hierarchy: 'MANAGER',
    capabilities: ['learning', 'memory', 'optimization'],
    score: 11,
    active: true,
    protected: true,
  },
  {
    id: 'risk_agent',
    name: 'Risk Agent',
    hierarchy: 'MANAGER',
    capabilities: ['risk', 'scoring', 'warnings'],
    score: 11,
    active: true,
    protected: true,
  },
  {
    id: 'simulation_agent',
    name: 'Simulation Agent',
    hierarchy: 'WORKER',
    capabilities: ['simulation', 'sandbox', 'forecast'],
    score: 10,
    active: true,
  },
  {
    id: 'repair_agent',
    name: 'Repair Agent',
    hierarchy: 'WORKER',
    capabilities: ['repair', 'healing', 'retry'],
    score: 10,
    active: true,
  },
  {
    id: 'security_agent',
    name: 'Security Agent',
    hierarchy: 'MANAGER',
    capabilities: ['security', 'rules', 'acl'],
    score: 12,
    active: true,
    protected: true,
  },
  {
    id: 'database_agent',
    name: 'Database Agent',
    hierarchy: 'WORKER',
    capabilities: ['database', 'storage', 'query'],
    score: 10,
    active: true,
  },
  {
    id: 'api_worker',
    name: 'API Agent',
    hierarchy: 'WORKER',
    capabilities: ['api', 'http', 'integration', 'network'],
    score: 14,
    active: true,
  },
  {
    id: 'performance_agent',
    name: 'Performance Agent',
    hierarchy: 'WORKER',
    capabilities: ['performance', 'latency', 'optimization'],
    score: 10,
    active: true,
  },
  {
    id: 'network_agent',
    name: 'Network Agent',
    hierarchy: 'WORKER',
    capabilities: ['network', 'http', 'a2a'],
    score: 10,
    active: true,
  },
  {
    id: 'ui_agent',
    name: 'UI Agent',
    hierarchy: 'WORKER',
    capabilities: ['ui', 'frontend', 'experience'],
    score: 10,
    active: true,
  },
];

function cloneAgentData(agent) {
  return JSON.parse(JSON.stringify(agent));
}

function calculateSkillScore(agent, task) {
  const text = `${task.type || ''} ${task.topic || ''} ${task.goal || ''}`.toLowerCase();
  return agent.capabilities.reduce((score, capability) => {
    return score + (text.includes(capability.toLowerCase()) ? 1 : 0);
  }, 0);
}

function hierarchyBonus(agent, task) {
  if (agent.hierarchy === 'COMMANDER' && /(plan|governance|self|strategy)/i.test(`${task.topic} ${task.goal}`)) {
    return 4;
  }
  if (agent.hierarchy === 'MANAGER' && /(decision|control|risk|memory|simulation)/i.test(`${task.type} ${task.topic} ${task.goal}`)) {
    return 3;
  }
  if (agent.hierarchy === 'WORKER' && /(api|network|database|ui|performance|execution|repair)/i.test(`${task.type} ${task.topic} ${task.goal}`)) {
    return 2;
  }
  return 1;
}

class AgentGrid {
  constructor(options = {}) {
    this.maxAgents = options.maxAgents || 24;
    this.cloneCounter = 0;
    this.agents = BASE_AGENTS.map(cloneAgentData);
  }

  boot() {
    this.agents.forEach((agent) => {
      agent.active = true;
    });
    return this.getStatus();
  }

  list() {
    return this.agents.map(cloneAgentData);
  }

  getById(agentId) {
    return this.agents.find((agent) => agent.id === agentId) || null;
  }

  getStatus() {
    const activeAgents = this.agents.filter((agent) => agent.active);
    const hierarchy = this.agents.reduce((acc, agent) => {
      acc[agent.hierarchy] = (acc[agent.hierarchy] || 0) + 1;
      return acc;
    }, { COMMANDER: 0, MANAGER: 0, WORKER: 0 });

    return {
      total: this.agents.length,
      active: activeAgents.length,
      maxAgents: this.maxAgents,
      hierarchy,
      topAgents: this.agents
        .slice()
        .sort((left, right) => right.score - left.score)
        .slice(0, 5)
        .map((agent) => ({ id: agent.id, name: agent.name, score: agent.score })),
    };
  }

  dispatch(task, decision) {
    const candidates = this.agents
      .filter((agent) => agent.active)
      .map((agent) => {
        const skillScore = calculateSkillScore(agent, task);
        const bid = agent.score + (skillScore * 4) + hierarchyBonus(agent, task) + Math.round((decision.memoryWeight || 0) / 10);
        return {
          agent,
          bid,
          skillScore,
        };
      })
      .sort((left, right) => right.bid - left.bid);

    const selected = candidates[0];
    if (!selected) {
      throw new Error('No active agent available for dispatch.');
    }

    return {
      agent: cloneAgentData(selected.agent),
      bid: selected.bid,
      candidates: candidates.slice(0, 3).map((candidate) => ({
        agentId: candidate.agent.id,
        name: candidate.agent.name,
        bid: candidate.bid,
      })),
    };
  }

  agentToAgent(sourceId, targetId, message) {
    return {
      channel: 'A2A',
      from: sourceId,
      to: targetId,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  applyOutcome(agentId, outcome) {
    const agent = this.getById(agentId);
    if (!agent) {
      return {
        delta: 0,
        newScore: 0,
        clone: null,
        removed: null,
      };
    }

    let delta = outcome.success ? 2 : -4;
    if (outcome.success && outcome.riskLevel === 'LOW') {
      delta += 1;
    }
    if (!outcome.success && outcome.riskLevel === 'HIGH') {
      delta -= 1;
    }

    agent.score += delta;

    let clone = null;
    let removed = null;

    if (agent.score > 15) {
      clone = this.clone(agent);
    }

    if (agent.score < 3) {
      removed = this.remove(agent.id);
    }

    return {
      delta,
      newScore: agent.score,
      clone,
      removed,
    };
  }

  clone(agent) {
    if (this.agents.length >= this.maxAgents) {
      return null;
    }

    this.cloneCounter += 1;
    const clonedAgent = {
      ...cloneAgentData(agent),
      id: `${agent.id}_clone_${this.cloneCounter}`,
      name: `${agent.name} Clone ${this.cloneCounter}`,
      score: Math.max(8, Math.floor(agent.score / 2)),
      clonedFrom: agent.id,
      protected: false,
      active: true,
    };

    this.agents.push(clonedAgent);
    return { id: clonedAgent.id, from: agent.id };
  }

  remove(agentId) {
    const index = this.agents.findIndex((agent) => agent.id === agentId);
    if (index < 0) {
      return null;
    }

    const agent = this.agents[index];
    if (agent.protected) {
      agent.score = 3;
      return null;
    }

    this.agents.splice(index, 1);
    return { id: agent.id, name: agent.name };
  }
}

module.exports = {
  AgentGrid,
  BASE_AGENTS,
};
