export function createProviderManager() {
  const providers = new Map();

  function register(name, provider) {
    providers.set(name, provider);
  }

  function get(name) {
    const provider = providers.get(name);

    if (!provider) {
      throw new Error(
        `Provider "${name}" is not registered.`
      );
    }

    return provider;
  }

  function list() {
    return [...providers.keys()];
  }

  return {
    register,
    get,
    list
  };
}