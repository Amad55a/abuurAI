import "dotenv/config";
import { abuurAI } from "../src/index.js";

const ai = abuurAI({
  bixiye: "gemini",
  furahaAPI: process.env.GEMINI_API_KEY,
  moodel: "gemini-3.8-flash"
});

const tests = [
  ["weydii", () => ai.weydii("Waa maxay artificial intelligence?")],
  ["turjun", () => ai.turjun("Hello, how are you?", "Somali")],
  ["sooKoob", () => ai.sooKoob("Somalia is a country in the Horn of Africa.")],
  ["sharax", () => ai.sharax("Machine learning")],
  ["sax", () => ai.sax("Somalia are beautiful country.")],
  ["qor", () => ai.qor("Write a short paragraph about Somalia.")],
  ["fikrado", () => ai.fikrado("Small businesses in Somalia")],
  ["falanqee", () => ai.falanqee("I love learning new technologies.")]
];

for (const [name, run] of tests) {
  try {
    const result = await run();
    console.log(`\n--- ${name} ---`);
    console.log(result.text);
  } catch (error) {
    console.error(`\n--- ${name} FAILED ---`);
    console.error(error.message);
    process.exitCode = 1;
  }
}
