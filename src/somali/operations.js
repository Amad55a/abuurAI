function requireText(value, description) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Please provide valid ${description}.`);
  }
}

function requireOptions(options) {
  if (
    options === null ||
    typeof options !== "object" ||
    Array.isArray(options)
  ) {
    throw new Error("Options must be an object.");
  }
}

function createTextOperation(provider, promptBuilder, defaultLanguage, systemPrompt) {
  return async (...args) => {
    const {
      prompt,
      options = {},
      operationInstructions
    } = promptBuilder(...args);
    requireOptions(options);

    if (!provider || typeof provider.generate !== "function") {
      throw new Error("A valid AI provider is required.");
    }

    return provider.generate({
      prompt,
      language: options.language || defaultLanguage,
      systemPrompt: options.tilmaamo || options.instructions || systemPrompt,
      operationInstructions
    });
  };
}

function withText(text, options, instruction, label = "Text") {
  requireText(text, "text");

  return {
    prompt: `${instruction}\n\n${label}:\n${text}`,
    options
  };
}

export function createTextOperations(
  provider,
  defaultLanguage = "automatic",
  systemPrompt
) {
  const methods = {
    turjun(text, targetLanguage, options = {}) {
      requireText(text, "text to translate");
      requireText(targetLanguage, "target language");

      const somaliInstructions = /somali|soomaali/i.test(targetLanguage)
        ? "\nFor Somali, use natural, standard Somali spelling and grammar. For example, translate \"Hello, how are you?\" as \"Salaan, sidee tahay?\"; do not use misspellings such as \"Silamaha\"."
        : "";

      return createTextOperation(
        provider,
        () => ({
          prompt: `Translate the following text accurately and naturally into ${targetLanguage}.${somaliInstructions}\nReturn only the translated text. Do not include an explanation, introduction, notes, or alternative translations.\n\nText:\n${text}`,
          operationInstructions: `Translate accurately and naturally into ${targetLanguage}.${somaliInstructions} Return only the translated text, without explanations, introductions, notes, or alternative translations.`,
          options
        }),
        targetLanguage,
        systemPrompt
      )();
    },

    sooKoob(text, options = {}) {
      return createTextOperation(
        provider,
        () => withText(text, options, "Summarize the text clearly and accurately."),
        defaultLanguage,
        systemPrompt
      )();
    },

    sharax(text, options = {}) {
      return createTextOperation(
        provider,
        () => withText(text, options, "Explain the following text or concept clearly."),
        defaultLanguage,
        systemPrompt
      )();
    },

    sax(text, options = {}) {
      return createTextOperation(
        provider,
        () => withText(
          text,
          options,
          "Correct spelling and grammar. Return only the corrected text."
        ),
        defaultLanguage,
        systemPrompt
      )();
    },

    dibUqor(text, options = {}) {
      return createTextOperation(
        provider,
        () => withText(text, options, "Rewrite the following text while preserving its meaning."),
        defaultLanguage,
        systemPrompt
      )();
    },

    hagaaji(text, options = {}) {
      return createTextOperation(
        provider,
        () => withText(text, options, "Improve the clarity, style, and quality of the following text."),
        defaultLanguage,
        systemPrompt
      )();
    },

    balaadhi(text, options = {}) {
      return createTextOperation(
        provider,
        () => withText(text, options, "Expand the following text with relevant details."),
        defaultLanguage,
        systemPrompt
      )();
    },

    qor(request, options = {}) {
      requireText(request, "content request");

      return createTextOperation(
        provider,
        () => ({
          prompt: `Write the requested content.\n\nRequest:\n${request}`,
          options
        }),
        defaultLanguage,
        systemPrompt
      )();
    },

    curi(request, options = {}) {
      requireText(request, "content request");

      return createTextOperation(
        provider,
        () => ({
          prompt: `Create original content based on this request.\n\nRequest:\n${request}`,
          options
        }),
        defaultLanguage,
        systemPrompt
      )();
    },

    fikrado(topic, options = {}) {
      return createTextOperation(
        provider,
        () => withText(topic, options, "Generate a useful list of creative ideas about this topic.", "Topic"),
        defaultLanguage,
        systemPrompt
      )();
    },

    cinwaan(text, options = {}) {
      return createTextOperation(
        provider,
        () => withText(text, options, "Generate several concise, engaging titles for the following."),
        defaultLanguage,
        systemPrompt
      )();
    },

    sameeSuaalo(text, options = {}) {
      return createTextOperation(
        provider,
        () => withText(text, options, "Generate useful questions about the following."),
        defaultLanguage,
        systemPrompt
      )();
    },

    falanqee(text, options = {}) {
      return createTextOperation(
        provider,
        () => withText(text, options, "Analyze the following text and explain the key points."),
        defaultLanguage,
        systemPrompt
      )();
    },

    kalaSaar(text, categoriesOrOptions = {}, options = {}) {
      requireText(text, "text to classify");
      let categories = [];
      let callOptions = options;

      if (Array.isArray(categoriesOrOptions)) {
        categories = categoriesOrOptions;
      } else {
        requireOptions(categoriesOrOptions);
        callOptions = categoriesOrOptions;
        categories = categoriesOrOptions.categories || [];
      }

      if (
        !Array.isArray(categories) ||
        categories.some((category) => typeof category !== "string" || !category.trim())
      ) {
        throw new Error("Categories must be an array of non-empty strings.");
      }

      const categoryText = categories.length
        ? `\n\nChoose from these categories: ${categories.join(", ")}.`
        : "";

      return createTextOperation(
        provider,
        () => ({
          prompt: `Classify the following text and briefly explain the classification.${categoryText}\n\nText:\n${text}`,
          options: callOptions
        }),
        defaultLanguage,
        systemPrompt
      )();
    },

    dareen(text, options = {}) {
      return createTextOperation(
        provider,
        () => withText(text, options, "Analyze the sentiment and emotional tone of the following text."),
        defaultLanguage,
        systemPrompt
      )();
    },

    sooSaarXog(text, options = {}) {
      return createTextOperation(
        provider,
        () => withText(text, options, "Extract the important information from the following text."),
        defaultLanguage,
        systemPrompt
      )();
    },

    isbarbarDhig(...args) {
      const first = args[0];
      let comparisons;
      let options = {};

      if (Array.isArray(first)) {
        comparisons = first;
        options = args[1] === undefined ? {} : args[1];
      } else {
        const last = args[args.length - 1];
        options = last && typeof last === "object" && !Array.isArray(last)
          ? args.pop()
          : {};
        comparisons = args;
      }

      if (!Array.isArray(comparisons) || comparisons.length < 2) {
        throw new Error("Please provide at least two items to compare.");
      }

      comparisons.forEach((item, index) => {
        requireText(item, `item ${index + 1} to compare`);
      });

      return createTextOperation(
        provider,
        () => ({
          prompt: `Compare the following items, noting their similarities and differences:\n\n${comparisons
            .map((item, index) => `Item ${index + 1}:\n${item}`)
            .join("\n\n")}`,
          options
        }),
        defaultLanguage,
        systemPrompt
      )();
    },

    qorCode(request, options = {}) {
      requireText(request, "code request");

      return createTextOperation(
        provider,
        () => ({
          prompt: `Write code that satisfies this request. Include only code unless explanation is requested.\n\nRequest:\n${request}`,
          options
        }),
        defaultLanguage,
        systemPrompt
      )();
    },

    sharaxCode(code, options = {}) {
      return createTextOperation(
        provider,
        () => withText(code, options, "Explain what this code does.", "Code"),
        defaultLanguage,
        systemPrompt
      )();
    },

    saxCode(code, options = {}) {
      return createTextOperation(
        provider,
        () => withText(code, options, "Find and fix errors in this code. Return the corrected code.", "Code"),
        defaultLanguage,
        systemPrompt
      )();
    },

    dibUhabeeCode(code, options = {}) {
      return createTextOperation(
        provider,
        () => withText(code, options, "Refactor this code for clarity and maintainability without changing its behavior.", "Code"),
        defaultLanguage,
        systemPrompt
      )();
    }
  };

  return methods;
}

export function createConversation(
  provider,
  history,
  defaultLanguage = "automatic",
  systemPrompt
) {
  async function send(message, options = {}) {
    requireText(message, "message");
    requireOptions(options);

    if (!provider || typeof provider.generate !== "function") {
      throw new Error("A valid AI provider is required.");
    }

    const context = history
      .map(({ role, text }) => `${role}: ${text}`)
      .join("\n");
    const prompt = context
      ? `Continue this conversation using its context.\n\n${context}\nUser: ${message}`
      : message;
    const response = await provider.generate({
      prompt,
      language: options.language || defaultLanguage,
      systemPrompt: options.tilmaamo || options.instructions || systemPrompt
    });

    history.push({ role: "User", text: message });
    if (typeof response?.text === "string") {
      history.push({ role: "Assistant", text: response.text });
    }

    return response;
  }

  return {
    wadaSheekeysi: send,
    siiWad(message, options = {}) {
      if (history.length === 0) {
        throw new Error("There is no conversation to continue.");
      }

      return send(message, options);
    }
  };
}
