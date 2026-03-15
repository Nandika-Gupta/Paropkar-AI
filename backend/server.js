const fs = require("fs");
const yaml = require("js-yaml");
const express = require("express");

const app = express();
app.use(express.json());

// Load certificate rules from spec
const spec = yaml.load(
  fs.readFileSync("./.kiro/specs/certificate_rules.kiro", "utf8")
);

/**
 * Calculates the apply_by date based on:
 *   apply_by = deadline - processing_days - buffer_days
 *
 * @param {string} deadline - ISO date string (YYYY-MM-DD)
 * @param {string} state - State name (e.g. "Karnataka")
 * @param {string} certificateType - Certificate type (e.g. "income_certificate")
 * @returns {string} apply_by date as YYYY-MM-DD
 */
function calculateApplyDate(deadline, state, certificateType = "income_certificate") {
  const certConfig = spec.certificates[certificateType];
  if (!certConfig) {
    throw new Error(`Unknown certificate type: "${certificateType}". Valid types: ${Object.keys(spec.certificates).join(", ")}`);
  }

  const stateConfig = certConfig.states[state];
  if (!stateConfig) {
    throw new Error(`Unknown state: "${state}". Valid states: ${Object.keys(certConfig.states).join(", ")}`);
  }

  const deadlineDate = new Date(deadline);
  if (isNaN(deadlineDate.getTime())) {
    throw new Error(`Invalid deadline date: "${deadline}". Expected format: YYYY-MM-DD`);
  }

  const buffer = spec.buffer_days || 3;
  deadlineDate.setDate(deadlineDate.getDate() - stateConfig.processing_days - buffer);

  return deadlineDate.toISOString().split("T")[0];
}

app.post("/calculate", (req, res) => {
  const { deadline, state, certificate_type = "income_certificate" } = req.body;

  if (!deadline || !state) {
    return res.status(400).json({ error: "Both 'deadline' and 'state' are required." });
  }

  try {
    const apply_by = calculateApplyDate(deadline, state, certificate_type);
    res.json({ apply_by, certificate_type, state });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log("Paropkar AI backend running on port 3000");
});

