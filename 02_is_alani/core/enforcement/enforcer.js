function enforceInput(input) {
  if (!input) throw new Error("INVALID_COMMAND");

  if (typeof input.task !== "string") {
    throw new Error("INVALID_COMMAND");
  }

  if (typeof input.parameters !== "object") {
    throw new Error("INVALID_COMMAND");
  }

  if (!input.output_format) {
    throw new Error("FORMAT_REQUIRED");
  }
}

function enforceRules(input) {
  const allowed = ["task", "parameters", "output_format"];

  for (let key in input) {
    if (!allowed.includes(key)) {
      throw new Error("INVALID_COMMAND");
    }
  }
}

function enforceOutput(output) {
  if (output === undefined || output === null) {
    throw new Error("FAILED_VALIDATION");
  }
}

module.exports = {
  enforceInput,
  enforceRules,
  enforceOutput
};
