const supportedTypes = new Set([
  "object",
  "array",
  "string",
  "number",
  "integer",
  "boolean",
  "null"
]);

export function validateJsonSchema(value, schema, path = "$") {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    throw new Error("schema must be a JSON Schema object.");
  }

  const allowedKeywords = new Set([
    "type",
    "properties",
    "required",
    "items",
    "enum",
    "minimum",
    "maximum",
    "minLength",
    "maxLength",
    "additionalProperties"
  ]);
  const unsupported = Object.keys(schema).find((key) => !allowedKeywords.has(key));
  if (unsupported) {
    throw new Error(`Unsupported JSON Schema keyword "${unsupported}".`);
  }

  const errors = [];
  const actualType = value === null
    ? "null"
    : Array.isArray(value)
      ? "array"
      : Number.isInteger(value)
        ? "integer"
        : typeof value;
  const expectedType = schema.type;

  if (
    expectedType !== undefined &&
    (!supportedTypes.has(expectedType) ||
      !(actualType === expectedType ||
        (expectedType === "number" && actualType === "integer")))
  ) {
    errors.push(`${path} must be ${expectedType}.`);
    return errors;
  }

  if (schema.enum && (!Array.isArray(schema.enum) || !schema.enum.some(
    (candidate) => JSON.stringify(candidate) === JSON.stringify(value)
  ))) {
    errors.push(`${path} must match one of the allowed values.`);
  }

  if (actualType === "object" && value !== null) {
    const properties = schema.properties || {};
    for (const required of schema.required || []) {
      if (!Object.hasOwn(value, required)) {
        errors.push(`${path}.${required} is required.`);
      }
    }

    for (const [key, propertySchema] of Object.entries(properties)) {
      if (Object.hasOwn(value, key)) {
        errors.push(...validateJsonSchema(value[key], propertySchema, `${path}.${key}`));
      }
    }

    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!Object.hasOwn(properties, key)) {
          errors.push(`${path}.${key} is not allowed.`);
        }
      }
    }
  }

  if (actualType === "array" && schema.items) {
    value.forEach((item, index) => {
      errors.push(...validateJsonSchema(item, schema.items, `${path}[${index}]`));
    });
  }

  if (
    (actualType === "number" || actualType === "integer") &&
    (schema.minimum !== undefined && value < schema.minimum ||
      schema.maximum !== undefined && value > schema.maximum)
  ) {
    errors.push(`${path} is outside the allowed numeric range.`);
  }

  if (
    actualType === "string" &&
    (schema.minLength !== undefined && value.length < schema.minLength ||
      schema.maxLength !== undefined && value.length > schema.maxLength)
  ) {
    errors.push(`${path} is outside the allowed length range.`);
  }

  return errors;
}
