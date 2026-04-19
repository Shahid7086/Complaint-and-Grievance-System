const runtimeStore = {
  users: [],
  complaints: [],
  histories: [],
};

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

module.exports = { runtimeStore, createId };
