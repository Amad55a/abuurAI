
import "dotenv/config";
import { createSomaliAI } from "../src/index.js";

const ai = createSomaliAI({
  provider: "gemini",
  model: "gemini-2.5-flash"
});

try {
  const response = await ai.weydii(
    "Salaan! Is baro af Soomaali."
  );

  console.log("Provider:", response.provider);
  console.log("Model:", response.model);
  console.log("Response:", response.text);
} catch (error) {
  console.error("Gemini request failed:", error.message);
}
