import Ajv from 'ajv';

/**
 * Function validates args against schema (parsed from JSON schema)
 * @param schema JSON schema string generated using z.toJSONSchema()
 * @param args JSON string of arguments to validate
 * @returns True if args are valid, false otherwise
 */
export async function validateSchema(
  schema: string,
  args: string,
): Promise<boolean> {
  try {
    // Parse the JSON schema string back to a Zod schema
    const parsedSchema = JSON.parse(schema);
    const parsedArgs = JSON.parse(args);
    const ajv = new Ajv();
    const valid = ajv.validate(parsedSchema, parsedArgs);
    return valid;
  } catch (error) {
    // @todo: add error handling
    console.error(error);
    return false;
  }
}
