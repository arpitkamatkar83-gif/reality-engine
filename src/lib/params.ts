import { z } from "zod";

/**
 * A single tunable simulation parameter. The min/max range is the single
 * source of truth: it drives Zod validation, UI controls and the LLM prompt.
 */
export interface ParamSpec {
  label: string;
  unit: string;
  description: string;
  min: number;
  max: number;
  step: number;
  default: number;
  integer?: boolean;
  /**
   * Words that show a request is about this parameter, as groups that must ALL
   * match (each group: any one of its words, as a whole word). The first group is
   * the topic; later groups disambiguate (e.g. which road). Used to stop the AI
   * changing parameters the user never mentioned.
   */
  mentions?: string[][];
  /** Question to ask when the topic is mentioned but the disambiguating words are not. */
  clarify?: string;
}

export type ParamSpecs = Record<string, ParamSpec>;

export type ParamValues<S extends ParamSpecs> = { [K in keyof S]: number };

/** Builds a strict Zod object schema enforcing each parameter's range. */
export function buildParamSchema<S extends ParamSpecs>(specs: S) {
  const shape = {} as { [K in keyof S]: z.ZodNumber };
  for (const key of Object.keys(specs) as (keyof S)[]) {
    const spec = specs[key];
    let field = z.number().min(spec.min).max(spec.max);
    if (spec.integer) field = field.int();
    shape[key] = field;
  }
  return z.strictObject(shape);
}

export function defaultValues<S extends ParamSpecs>(specs: S): ParamValues<S> {
  const values = {} as ParamValues<S>;
  for (const key of Object.keys(specs) as (keyof S)[]) {
    values[key] = specs[key].default;
  }
  return values;
}
