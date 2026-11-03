export const browserConfig = {
  bixiye: "gemini",
  moodel: "gemini-2.5-flash",
  mode: "auto",
  gateway: {
    type: "cloudflare",
    accountId: "YOUR_CLOUDFLARE_ACCOUNT_ID",
    gatewayId: "YOUR_GATEWAY_ID",
    endpoint: "https://your-worker.example.workers.dev/"
  },
  providers: {
    openrouter: {
      moodel: "openai/gpt-4o-mini"
    }
  }
};
