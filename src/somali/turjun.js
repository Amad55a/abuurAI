
import { createTextOperations } from "./operations.js";

export function createTurjun(provider) {
  return createTextOperations(provider).turjun;
}
