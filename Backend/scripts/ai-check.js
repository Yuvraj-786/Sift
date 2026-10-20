require("dotenv").config();

const { GROQ_MODEL } = require("../src/services/ai.services");

async function main() {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is required.");
  const response = await fetch("https://api.groq.com/openai/v1/models", {
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
  });
  if (!response.ok) throw new Error(`Groq model catalog returned HTTP ${response.status}.`);
  const payload = await response.json();
  const model = payload.data?.find((entry) => entry.id === GROQ_MODEL);
  if (!model) throw new Error(`Configured Groq model is not in the active catalog: ${GROQ_MODEL}`);
  console.log(`Groq model available: ${GROQ_MODEL}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});