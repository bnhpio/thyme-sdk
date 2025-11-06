import { readFile } from 'node:fs/promises';
import path from 'node:path';
import z from 'zod';
import { validateSchema } from './validation';

export interface LoadAndValidateSchemaOptions {
  /**
   * Path to the schema file (e.g., './functions/myFunction/schema.ts')
   */
  schemaPath: string;
  /**
   * Path to the args file (e.g., './functions/myFunction/args.json')
   */
  argsPath: string;
}

export interface LoadAndValidateSchemaResult<T> {
  /**
   * Parsed and validated arguments
   */
  args: T;
  /**
   * The Zod schema instance
   */
  schema: z.ZodSchema<T>;
}

/**
 * Loads schema and args from file paths, validates them, and returns the parsed args.
 * Throws an error if validation fails.
 *
 * @param options - Options for loading and validating
 * @returns Parsed and validated arguments along with the schema
 * @throws Error if schema or args cannot be loaded or if validation fails
 */
export async function loadAndValidateSchema<T>(
  options: LoadAndValidateSchemaOptions,
): Promise<LoadAndValidateSchemaResult<T>> {
  const { schemaPath, argsPath } = options;

  // Load and parse schema
  const schemaModule: { schema: z.ZodSchema<T> } = await import(
    path.resolve(schemaPath)
  );
  const schema = schemaModule.schema;

  // Convert Zod schema to JSON schema
  const jsonSchema = z.toJSONSchema(schema, {
    target: 'openapi-3.0',
  });
  const schemaContent = JSON.stringify(jsonSchema, null, 2);

  // Load and parse args
  const argsJSON = await readFile(path.resolve(argsPath), 'utf-8');

  // Validate schema
  const isValid = await validateSchema(schemaContent, argsJSON);
  if (!isValid) {
    throw new Error(`Schema validation failed for ${argsPath}`);
  }

  // Parse and return args
  const parsedArgs = JSON.parse(argsJSON) as T;

  return {
    args: parsedArgs,
    schema,
  };
}
