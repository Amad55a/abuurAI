import { isDeepStrictEqual } from "node:util";

const supportedTypes = new Set([
  "object",
  "array",
  "string",
  "number",
  "integer",
  "boolean",
  "null"
]);

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

function validateSchemaDefinition(schema, ancestors = new WeakSet()) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    throw new Error("schema must be a JSON Schema object.");
  }
  if (ancestors.has(schema)) {
    throw new Error("Circular JSON Schema definitions are not supported.");
  }
  ancestors.add(schema);

  const unsupported = Object.keys(schema).find((key) => !allowedKeywords.has(key));
  if (unsupported) {
    throw new Error(`Unsupported JSON Schema keyword "${unsupported}".`);
  }
  if (schema.type !== undefined && !supportedTypes.has(schema.type)) {
    throw new Error(`Unsupported JSON Schema type "${schema.type}".`);
  }
  if (schema.properties !== undefined &&
    (!schema.properties || typeof schema.properties !== "object" ||
      Array.isArray(schema.properties))) {
    throw new Error("schema.properties must be an object.");
  }
  if (schema.required !== undefined &&
    (!Array.isArray(schema.required) ||
      schema.required.some((name) => typeof name !== "string"))) {
    throw new Error("schema.required must be an array of property names.");
  }
  if (schema.items !== undefined &&
    (!schema.items || typeof schema.items !== "object" ||
      Array.isArray(schema.items))) {
    throw new Error("schema.items must be a JSON Schema object.");
  }
  if (schema.enum !== undefined &&
    (!Array.isArray(schema.enum) || schema.enum.length === 0)) {
    throw new Error("schema.enum must be a non-empty array.");
  }
  if (schema.additionalProperties !== undefined &&
    typeof schema.additionalProperties !== "boolean") {
    throw new Error("schema.additionalProperties must be a boolean.");
  }
  for (const bound of ["minimum", "maximum"]) {
    if (schema[bound] !== undefined && !Number.isFinite(schema[bound])) {
      throw new Error(`schema.${bound} must be a finite number.`);
    }
  }
  for (const bound of ["minLength", "maxLength"]) {
    if (schema[bound] !== undefined &&
      (!Number.isInteger(schema[bound]) || schema[bound] < 0)) {
      throw new Error(`schema.${bound} must be a non-negative integer.`);
    }
  }
  for (const child of Object.values(schema.properties || {})) {
    validateSchemaDefinition(child, ancestors);
  }
  if (schema.items) {
    validateSchemaDefinition(schema.items, ancestors);
  }
  ancestors.delete(schema);
}

export function validateJsonSchema(value, schema, path = "$") {
  validateSchemaDefinition(schema);

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

  if (schema.enum && !schema.enum.some((candidate) =>
    isDeepStrictEqual(candidate, value)
  )) {
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
