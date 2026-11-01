function usageNumbers(result) {
  const usage = result?.usage;
  const inputTokens =
    Number.isFinite(usage?.inputTokens) ? usage.inputTokens : null;
  const outputTokens =
    Number.isFinite(usage?.outputTokens) ? usage.outputTokens : null;

  return { inputTokens, outputTokens };
}

function priceFor(pricing, provider, model) {
  const configured = pricing?.[provider]?.[model] || pricing?.[provider];
  if (
    !configured ||
    !Number.isFinite(configured.inputPerMillion) ||
    !Number.isFinite(configured.outputPerMillion) ||
    configured.inputPerMillion < 0 ||
    configured.outputPerMillion < 0
  ) {
    return null;
  }

  return configured;
}

export function createUsageTracker(pricing = {}) {
  let totals = createEmptyTotals();
  const byProviderModel = new Map();

  function createEmptyTotals() {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalDurationMs: 0,
      inputTokens: 0,
      outputTokens: 0,
      requestsWithTokenUsage: 0
    };
  }

  function getEntry(provider, model) {
    const key = `${provider}\u0000${model}`;
    if (!byProviderModel.has(key)) {
      byProviderModel.set(key, {
        provider,
        model,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalDurationMs: 0,
        inputTokens: 0,
        outputTokens: 0,
        requestsWithTokenUsage: 0,
        estimatedCost: 0,
        hasEstimatedCost: true
      });
    }
    return byProviderModel.get(key);
  }

  function start(provider, model) {
    const entry = getEntry(provider, model);
    totals.totalRequests += 1;
    entry.totalRequests += 1;
    return { entry, startedAt: Date.now() };
  }

  function finish(tracking, result) {
    const durationMs = Date.now() - tracking.startedAt;
    const tokens = usageNumbers(result);
    totals.successfulRequests += 1;
    totals.totalDurationMs += durationMs;
    tracking.entry.successfulRequests += 1;
    tracking.entry.totalDurationMs += durationMs;

    if (tokens.inputTokens !== null && tokens.outputTokens !== null) {
      totals.inputTokens += tokens.inputTokens;
      totals.outputTokens += tokens.outputTokens;
      totals.requestsWithTokenUsage += 1;
      tracking.entry.inputTokens += tokens.inputTokens;
      tracking.entry.outputTokens += tokens.outputTokens;
      tracking.entry.requestsWithTokenUsage += 1;

      const price = priceFor(pricing, tracking.entry.provider, tracking.entry.model);
      if (price) {
        tracking.entry.estimatedCost +=
          (tokens.inputTokens * price.inputPerMillion +
            tokens.outputTokens * price.outputPerMillion) / 1_000_000;
      } else {
        tracking.entry.hasEstimatedCost = false;
      }
    } else {
      tracking.entry.hasEstimatedCost = false;
    }
  }

  function fail(tracking) {
    const durationMs = Date.now() - tracking.startedAt;
    totals.failedRequests += 1;
    totals.totalDurationMs += durationMs;
    tracking.entry.failedRequests += 1;
    tracking.entry.totalDurationMs += durationMs;
    tracking.entry.hasEstimatedCost = false;
  }

  function snapshot({ reset = false } = {}) {
    const providers = {};
    const entries = [...byProviderModel.values()];

    for (const entry of byProviderModel.values()) {
      if (!providers[entry.provider]) {
        providers[entry.provider] = {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          totalDurationMs: 0,
          inputTokens: 0,
          outputTokens: 0,
          requestsWithTokenUsage: 0,
          models: {}
        };
      }

      const provider = providers[entry.provider];
      provider.totalRequests += entry.totalRequests;
      provider.successfulRequests += entry.successfulRequests;
      provider.failedRequests += entry.failedRequests;
      provider.totalDurationMs += entry.totalDurationMs;
      provider.inputTokens += entry.inputTokens;
      provider.outputTokens += entry.outputTokens;
      provider.requestsWithTokenUsage += entry.requestsWithTokenUsage;
      provider.models[entry.model] = {
        totalRequests: entry.totalRequests,
        successfulRequests: entry.successfulRequests,
        failedRequests: entry.failedRequests,
        totalDurationMs: entry.totalDurationMs,
        inputTokens: entry.requestsWithTokenUsage
          ? entry.inputTokens
          : null,
        outputTokens: entry.requestsWithTokenUsage
          ? entry.outputTokens
          : null,
        requestsWithTokenUsage: entry.requestsWithTokenUsage,
        estimatedCost: entry.hasEstimatedCost
          ? entry.estimatedCost
          : null
      };
    }

    for (const provider of Object.values(providers)) {
      provider.inputTokens = provider.requestsWithTokenUsage
        ? provider.inputTokens
        : null;
      provider.outputTokens = provider.requestsWithTokenUsage
        ? provider.outputTokens
        : null;
    }

    const output = {
      ...totals,
      inputTokens: totals.requestsWithTokenUsage ? totals.inputTokens : null,
      outputTokens: totals.requestsWithTokenUsage ? totals.outputTokens : null,
      averageDurationMs: totals.totalRequests
        ? totals.totalDurationMs / totals.totalRequests
        : 0,
      estimatedCost: entries.length === 0
        ? null
        : entries.every((entry) => entry.hasEstimatedCost)
          ? entries.reduce(
            (total, entry) => total + entry.estimatedCost,
            0
          )
          : null,
      providers,
      note: "Token counts are actual provider-reported usage only. Cost is estimated only when custom per-million-token pricing is supplied."
    };

    if (reset) {
      totals = createEmptyTotals();
      byProviderModel.clear();
    }

    return output;
  }

  return { start, finish, fail, snapshot };
}
