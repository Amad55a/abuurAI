/**
 * Base interface for AI providers.
 */

export class BaseProvider {
  async generate() {
    throw new Error(
      "generate() must be implemented by the provider."
    );
  }
}