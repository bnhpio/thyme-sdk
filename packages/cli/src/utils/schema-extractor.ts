import { z } from 'zod'

/**
 * Extract Zod schema from task code and convert to JSON Schema
 * This allows the frontend to generate forms for task arguments
 */
export function extractSchemaFromTask(taskCode: string): string | null {
	try {
		// Create a sandbox to safely evaluate the task code
		// We'll extract the schema by running the code and capturing the schema definition
		const schemaExtractor = `
      const { z } = require('zod');
      const { zodToJsonSchema } = require('zod-to-json-schema');
      
      // Extended z with address validator
      const zodExtended = {
        ...z,
        address: () => z.string().refine((val) => /^0x[a-fA-F0-9]{40}$/.test(val), {
          message: 'Invalid Ethereum address',
        }),
      };
      
      // Mock defineTask to capture schema
      let capturedSchema = null;
      const defineTask = (definition) => {
        if (definition.schema) {
          capturedSchema = definition.schema;
        }
        return definition;
      };
      
      // Mock viem exports
      const encodeFunctionData = () => '0x';
      
      // Evaluate task code
      ${taskCode}
      
      // Convert schema to JSON Schema
      if (capturedSchema) {
        const jsonSchema = zodToJsonSchema(capturedSchema, { target: 'openApi3' });
        console.log(JSON.stringify(jsonSchema));
      } else {
        console.log('null');
      }
    `

		// For now, return a simple extraction by parsing the code
		// This is a simplified version - in production you might want to use a proper parser
		const schemaMatch = taskCode.match(/schema:\s*z\.object\(\{([^}]+)\}\)/)

		if (!schemaMatch || !schemaMatch[1]) {
			return null
		}

		// Parse the schema fields
		const schemaContent = schemaMatch[1]
		const fields: Record<string, unknown> = {}

		// Simple regex to extract field definitions
		const fieldMatches = schemaContent.matchAll(
			/(\w+):\s*z\.(\w+)\(\)/g,
		)

		for (const match of fieldMatches) {
			const [, fieldName, fieldType] = match
			if (fieldName && fieldType) {
				// Convert Zod types to JSON Schema types
				let jsonType = 'string'
				switch (fieldType) {
					case 'string':
						jsonType = 'string'
						break
					case 'number':
						jsonType = 'number'
						break
					case 'boolean':
						jsonType = 'boolean'
						break
					case 'address':
						jsonType = 'string'
						break
					default:
						jsonType = 'string'
				}

				fields[fieldName] = {
					type: jsonType,
					...(fieldType === 'address' && {
						pattern: '^0x[a-fA-F0-9]{40}$',
						description: 'Ethereum address',
					}),
				}
			}
		}

		if (Object.keys(fields).length === 0) {
			return null
		}

		const jsonSchema = {
			type: 'object',
			properties: fields,
			required: Object.keys(fields),
		}

		return JSON.stringify(jsonSchema)
	} catch (err) {
		console.error('Error extracting schema:', err)
		return null
	}
}
