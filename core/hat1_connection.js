// Minimal in-memory hat1 connection mock used by SmartAdapterEngine and tests
const hat2 = {
  logs: [],
  lpush(key, val) {
    this.logs.push({ key, val });
  }
};

const hat3 = {
  data: [],
  lpush(key, val) {
    this.data.push({ key, val });
  }
};

module.exports = { hat2, hat3 };
