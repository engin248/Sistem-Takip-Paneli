'use strict';

const fs = require('fs');
const path = require('path');

class MemorySystem {
  constructor(baseDir) {
    this.baseDir = baseDir || process.cwd();
    this.memoryDir = path.join(this.baseDir, '.agent_memory', 'autonomy');
    this.stateFile = path.join(this.memoryDir, 'memory_state.json');
    this.state = this.loadState();
  }

  defaultState() {
    return {
      taskMemory: [],
      projectMemory: [],
      globalMemory: [],
      incidents: [],
      governance: {
        killSwitch: false,
        maxAgentLimit: 24,
      },
    };
  }

  ensureStorage() {
    fs.mkdirSync(this.memoryDir, { recursive: true });
    if (!fs.existsSync(this.stateFile)) {
      fs.writeFileSync(this.stateFile, JSON.stringify(this.defaultState(), null, 2), 'utf8');
    }
  }

  loadState() {
    this.ensureStorage();
    try {
      const raw = fs.readFileSync(this.stateFile, 'utf8');
      return {
        ...this.defaultState(),
        ...JSON.parse(raw),
      };
    } catch {
      return this.defaultState();
    }
  }

  saveState() {
    fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2), 'utf8');
  }

  fingerprint(task) {
    return [task.type || 'unknown', task.project || 'default', task.topic || '', task.goal || '']
      .join('::')
      .toLowerCase()
      .trim();
  }

  decayAndForget() {
    const now = Date.now();
    const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
    const decayEntry = (entry) => ({
      ...entry,
      weight: Number(Math.max(0, (entry.weight || 1) - 0.08).toFixed(2)),
    });

    this.state.taskMemory = this.state.taskMemory
      .map(decayEntry)
      .filter((entry) => (now - new Date(entry.timestamp).getTime()) < maxAgeMs && entry.weight >= 0.25);

    this.state.projectMemory = this.state.projectMemory
      .map(decayEntry)
      .filter((entry) => entry.weight >= 0.2);

    this.state.globalMemory = this.state.globalMemory
      .map(decayEntry)
      .filter((entry) => entry.weight >= 0.2);

    this.state.incidents = this.state.incidents.slice(-50);
    this.saveState();
  }

  getMemoryContext(task) {
    const fingerprint = this.fingerprint(task);
    const taskHits = this.state.taskMemory.filter((entry) => entry.fingerprint === fingerprint);
    const projectHits = this.state.projectMemory.filter((entry) => entry.project === (task.project || 'default'));
    const globalHits = this.state.globalMemory.filter((entry) => entry.type === (task.type || 'unknown'));
    const relevant = [...taskHits, ...projectHits, ...globalHits].slice(-3);
    const influence = Math.min(30, relevant.length * 10);

    return {
      influence,
      relevant: relevant.map((entry) => ({
        status: entry.status,
        summary: entry.summary,
        score: entry.score,
      })),
    };
  }

  checkDuplicate(task) {
    const fingerprint = this.fingerprint(task);
    return this.state.taskMemory.find((entry) => entry.fingerprint === fingerprint && entry.status === 'SUCCESS') || null;
  }

  detectAnomaly(task) {
    const fingerprint = this.fingerprint(task);
    const recentIncidents = this.state.incidents.filter((entry) => entry.fingerprint === fingerprint);
    return {
      isAnomaly: recentIncidents.length >= 1,
      count: recentIncidents.length,
    };
  }

  recordBlocked(task, reason, severity) {
    this.state.incidents.push({
      fingerprint: this.fingerprint(task),
      type: task.type || 'unknown',
      reason,
      severity: severity || 'RED',
      timestamp: new Date().toISOString(),
    });
    this.saveState();
  }

  saveTaskResult(task, result) {
    const timestamp = new Date().toISOString();
    const taskEntry = {
      fingerprint: this.fingerprint(task),
      project: task.project || 'default',
      type: task.type || 'unknown',
      status: result.status,
      summary: result.summary,
      score: result.evaluationScore,
      agentId: result.agentId,
      weight: 1,
      timestamp,
    };

    this.state.taskMemory.push(taskEntry);
    this.state.projectMemory.push({
      project: task.project || 'default',
      type: task.type || 'unknown',
      status: result.status,
      summary: `${task.topic || task.type} -> ${result.summary}`,
      score: result.evaluationScore,
      weight: 1,
      timestamp,
    });
    this.state.globalMemory.push({
      project: task.project || 'default',
      type: task.type || 'unknown',
      status: result.status,
      summary: result.summary,
      score: result.evaluationScore,
      weight: 1,
      timestamp,
    });

    this.state.taskMemory = this.state.taskMemory.slice(-100);
    this.state.projectMemory = this.state.projectMemory.slice(-50);
    this.state.globalMemory = this.state.globalMemory.slice(-50);
    this.saveState();

    return { saved: true, timestamp };
  }

  getGovernance() {
    return { ...this.state.governance };
  }

  setKillSwitch(enabled) {
    this.state.governance.killSwitch = Boolean(enabled);
    this.saveState();
    return this.getGovernance();
  }

  getStatus() {
    return {
      taskMemory: this.state.taskMemory.length,
      projectMemory: this.state.projectMemory.length,
      globalMemory: this.state.globalMemory.length,
      incidents: this.state.incidents.length,
      governance: this.getGovernance(),
    };
  }
}

module.exports = {
  MemorySystem,
};
