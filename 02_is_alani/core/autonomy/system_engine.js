'use strict';

const path = require('path');
const { AgentGrid } = require('./agent_grid');
const { MemorySystem } = require('./memory_system');
const { decide } = require('./decision_core');
const { SUPPORTED_TYPES, evaluateControl, evaluateRisk, evaluateRules, runSimulation } = require('./risk_rule');
const { executeTask } = require('./execution_pipeline');

class AutonomySystem {
  constructor(options = {}) {
    this.baseDir = options.baseDir || path.join(__dirname, '..', '..');
    this.memory = new MemorySystem(this.baseDir);
    const governance = this.memory.getGovernance();
    this.agentGrid = new AgentGrid({ maxAgents: governance.maxAgentLimit });
    this.booted = false;
  }

  boot() {
    const governance = this.memory.getGovernance();
    this.agentGrid.maxAgents = governance.maxAgentLimit;
    const agentStatus = this.agentGrid.boot();
    this.booted = true;

    return {
      booted: true,
      timestamp: new Date().toISOString(),
      agents: agentStatus,
      governance,
    };
  }

  setKillSwitch(enabled) {
    const governance = this.memory.setKillSwitch(enabled);
    return {
      success: true,
      governance,
    };
  }

  status() {
    if (!this.booted) {
      this.boot();
    }

    return {
      booted: this.booted,
      timestamp: new Date().toISOString(),
      agents: this.agentGrid.getStatus(),
      memory: this.memory.getStatus(),
      governance: this.memory.getGovernance(),
      selfTasks: this.generateSelfTasks(),
    };
  }

  normalizeTask(input) {
    if (typeof input === 'string') {
      return {
        id: `task_${Date.now()}`,
        type: 'unknown',
        topic: input.slice(0, 60),
        goal: input,
        project: 'general',
      };
    }

    return {
      id: `task_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      type: String(input.type || 'unknown').toLowerCase(),
      topic: String(input.topic || input.type || 'unknown'),
      goal: String(input.goal || input.request || input.objective || ''),
      project: String(input.project || 'general'),
      simulate: input.simulate,
      ruleFail: input.ruleFail === true,
    };
  }

  generateSelfTasks() {
    const memoryStatus = this.memory.getStatus();
    const tasks = [];

    if (memoryStatus.incidents > 0) {
      tasks.push({ type: 'audit', reason: 'incident-follow-up' });
    }

    if (memoryStatus.taskMemory > 10) {
      tasks.push({ type: 'learning', reason: 'memory-decay-review' });
    }

    if (tasks.length === 0) {
      tasks.push({ type: 'planning', reason: 'system kendine görev üretir → optimization review' });
    }

    return tasks;
  }

  buildBlockedResult(task, extras = {}) {
    return {
      success: false,
      blocked: true,
      task,
      ...extras,
    };
  }

  runTask(input) {
    if (!this.booted) {
      this.boot();
    }

    this.memory.decayAndForget();
    const task = this.normalizeTask(input);
    const governance = this.memory.getGovernance();
    const anomaly = this.memory.detectAnomaly(task);

    if (!SUPPORTED_TYPES.includes(task.type)) {
      this.memory.recordBlocked(task, 'unknown-task', 'RED');
      const logs = ['[RULE] FAIL', '[DISPATCH] BLOCKED'];
      if (anomaly.isAnomaly) {
        logs.push('[ANOMALY] RED');
      }

      return this.buildBlockedResult(task, {
        status: 'BLOCKED',
        logs,
        governance,
      });
    }

    const duplicate = this.memory.checkDuplicate(task);
    if (duplicate) {
      this.memory.recordBlocked(task, 'duplicate-task', 'RED');
      return this.buildBlockedResult(task, {
        status: 'REJECTED',
        logs: ['[DUPLICATE] REJECT'],
        duplicateOf: duplicate.summary,
      });
    }

    const memoryContext = this.memory.getMemoryContext(task);
    const decision = decide(task, memoryContext);
    const control = evaluateControl(task);
    const risk = evaluateRisk(task);
    const rule = evaluateRules({ task, anomaly, killSwitch: governance.killSwitch });
    const simulation = runSimulation(task, risk);

    if (control.status !== 'OK') {
      this.memory.recordBlocked(task, 'control-fail', 'RED');
      return this.buildBlockedResult(task, {
        status: 'BLOCKED',
        logs: ['[CONTROL] FAIL', '[DISPATCH] BLOCKED'],
      });
    }

    if (!rule.pass) {
      this.memory.recordBlocked(task, rule.message, 'RED');
      const logs = ['[RULE] FAIL', '[DISPATCH] BLOCKED'];
      if (rule.anomaly) {
        logs.push('[ANOMALY] RED');
      }
      return this.buildBlockedResult(task, {
        status: 'BLOCKED',
        logs,
      });
    }

    if (simulation.status !== 'OK') {
      this.memory.recordBlocked(task, 'simulation-fail', 'RED');
      return this.buildBlockedResult(task, {
        status: 'BLOCKED',
        logs: ['[SIMULATION] FAIL', '[DISPATCH] BLOCKED'],
      });
    }

    const dispatch = this.agentGrid.dispatch(task, decision);
    const a2a = this.agentGrid.agentToAgent('dispatcher', dispatch.agent.id, `http:${task.type}`);

    let execution = executeTask({ task, agent: dispatch.agent, decision, attempt: 0 });
    const healing = {
      attempts: 0,
      logs: [],
    };

    if (execution.status === 'FAIL') {
      healing.attempts = 1;
      healing.logs.push('[EXECUTION] FAIL');
      healing.logs.push('[HEALING] attempt 1');
      healing.logs.push('→ yeniden denendi');
      execution = executeTask({ task, agent: dispatch.agent, decision, attempt: 1 });
    }

    if (execution.status !== 'OK') {
      const evolution = this.agentGrid.applyOutcome(dispatch.agent.id, { success: false, riskLevel: risk.level });
      this.memory.recordBlocked(task, 'execution-failed-reset', 'RED');
      return {
        success: false,
        blocked: false,
        status: 'FAILED',
        task,
        logs: [...healing.logs, '[SYSTEM] işlem silinir', '[SYSTEM] baştan başlar'],
        evolution,
      };
    }

    const evaluationScore = risk.level === 'LOW' ? 85 : risk.level === 'MEDIUM' ? 78 : 72;
    const memorySave = this.memory.saveTaskResult(task, {
      status: 'SUCCESS',
      summary: execution.result,
      evaluationScore,
      agentId: dispatch.agent.id,
    });
    const evolution = this.agentGrid.applyOutcome(dispatch.agent.id, { success: true, riskLevel: risk.level });
    const selfManagement = this.generateSelfTasks();
    const logs = [
      '[CONTROL] OK',
      `[RISK] ${risk.level}`,
      '[RULE] PASS',
      '[SIMULATION] OK',
      `[DISPATCH] agent: ${dispatch.agent.id}`,
      '[EXECUTION] OK',
      `[EVALUATION] score: ${evaluationScore}`,
      '[MEMORY] saved',
      ...healing.logs,
    ];

    return {
      success: true,
      blocked: false,
      status: 'OK',
      task,
      topic: decision.topic,
      criteria: decision.criteria,
      alternatives: decision.alternatives,
      consensus: decision.consensus,
      memoryWeight: decision.memoryWeight,
      finalDecision: decision.finalDecision,
      dispatch: {
        agent: dispatch.agent,
        bid: dispatch.bid,
        candidates: dispatch.candidates,
        http: true,
        a2a,
      },
      execution,
      evaluationScore,
      memory: memorySave,
      selfManagement,
      evolution,
      governance: {
        maxAgentLimit: governance.maxAgentLimit,
        killSwitch: governance.killSwitch,
        unknownTaskBlock: true,
      },
      logs,
    };
  }
}

module.exports = {
  AutonomySystem,
};
