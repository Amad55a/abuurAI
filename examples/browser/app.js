import {
  abuurAI,
  renderSomaliPromptTemplate,
  somaliPromptTemplates
} from "../../src/browser.js";
import { browserConfig } from "./config.js";

const form = document.querySelector("#request-form");
const promptInput = document.querySelector("#request-prompt");
const promptTemplate = document.querySelector("#prompt-template");
const answerText = document.querySelector("#answer");
const errorText = document.querySelector("#error");
const submitButton = document.querySelector("#submit");
const ai = abuurAI(browserConfig);

for (const template of somaliPromptTemplates) {
  const option = document.createElement("option");
  option.value = template.id;
  option.textContent = template.name;
  promptTemplate.append(option);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const userPrompt = promptInput.value.trim();
  if (!userPrompt) {
    errorText.textContent = "Fadlan geli su'aal ama codsi.";
    return;
  }

  submitButton.disabled = true;
  errorText.textContent = "";
  answerText.textContent = "";
  try {
    const requestPrompt = renderSomaliPromptTemplate(promptTemplate.value, {
      prompt: userPrompt
    });
    const result = await ai.weydii(requestPrompt, { bixiye: "openrouter" });
    answerText.textContent = result.text;
  } catch (error) {
    errorText.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});
