/**
 * Minimal JSON-Schema checker for contract tests (the subset our OpenAPI files use): $ref, type,
 * nullable, enum, required, properties (unknown keys are errors unless additionalProperties),
 * items, minimum/maximum, minItems/maxItems, minLength, pattern, format date-time / date.
 * Returns a list of "path: problem" strings (empty = valid).
 */
type Schema = Record<string, unknown>;

export function validate(value: unknown, schema: Schema, root: Schema, at = '$'): string[] {
  if (typeof schema.$ref === 'string') {
    const target = schema.$ref
      .replace(/^#\//, '')
      .split('/')
      .reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], root) as Schema | undefined;
    if (!target) return [`${at}: unresolved ${schema.$ref}`];
    return validate(value, target, root, at);
  }
  if (value === null) return schema.nullable ? [] : [`${at}: null`];
  const out: string[] = [];
  const type = schema.type as string | undefined;
  const is: Record<string, (v: unknown) => boolean> = {
    object: (v) => typeof v === 'object' && !Array.isArray(v),
    array: Array.isArray,
    string: (v) => typeof v === 'string',
    integer: Number.isInteger,
    number: (v) => typeof v === 'number' && Number.isFinite(v),
    boolean: (v) => typeof v === 'boolean',
  };
  if (type && !is[type]?.(value)) return [`${at}: expected ${type}, got ${JSON.stringify(value)}`];
  if (Array.isArray(schema.enum) && !schema.enum.includes(value))
    out.push(`${at}: ${JSON.stringify(value)} not in ${JSON.stringify(schema.enum)}`);

  if (typeof value === 'number') {
    if (typeof schema.minimum === 'number' && value < schema.minimum) out.push(`${at}: < ${schema.minimum}`);
    if (typeof schema.maximum === 'number' && value > schema.maximum) out.push(`${at}: > ${schema.maximum}`);
  }
  if (typeof value === 'string') {
    if (typeof schema.minLength === 'number' && value.length < schema.minLength) out.push(`${at}: too short`);
    if (typeof schema.pattern === 'string' && !new RegExp(schema.pattern).test(value))
      out.push(`${at}: does not match ${schema.pattern}`);
    if (schema.format === 'date-time' && Number.isNaN(Date.parse(value))) out.push(`${at}: not a date-time`);
    if (schema.format === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) out.push(`${at}: not a date`);
  }
  if (Array.isArray(value)) {
    if (typeof schema.minItems === 'number' && value.length < schema.minItems)
      out.push(`${at}: too few items`);
    if (typeof schema.maxItems === 'number' && value.length > schema.maxItems)
      out.push(`${at}: too many items`);
    if (schema.items)
      value.forEach((v, i) => out.push(...validate(v, schema.items as Schema, root, `${at}[${i}]`)));
  }
  if (type === 'object' || schema.properties) {
    const obj = value as Record<string, unknown>;
    const props = (schema.properties ?? {}) as Record<string, Schema>;
    for (const r of (schema.required as string[] | undefined) ?? [])
      if (!(r in obj)) out.push(`${at}.${r}: required`);
    for (const [k, v] of Object.entries(obj)) {
      if (props[k]) out.push(...validate(v, props[k], root, `${at}.${k}`));
      else if (typeof schema.additionalProperties === 'object')
        out.push(...validate(v, schema.additionalProperties as Schema, root, `${at}.${k}`));
      else if (schema.properties && schema.additionalProperties !== true)
        out.push(`${at}.${k}: not in contract`);
    }
  }
  return out;
}
