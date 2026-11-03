import "dotenv/config";
import { abuurAI } from "../src/index.js";

const ai = abuurAI({
  bixiye: "gemini",
  furahaAPI: process.env.GEMINI_API_KEY,
  moodel: "gemini-3.8-flash"
});

try {
  const jawaab = await ai.weydii("Salaan! Is baro af Soomaali.");
  console.log("Adeeg:", jawaab.provider);
  console.log("Moodel:", jawaab.model);
  console.log("Jawaab:", jawaab.text);
} catch (error) {
  console.error("Codsiga Abuur AI wuu fashilmay:", error.message);
  process.exitCode = 1;
}
