/**
 * Extract Zod schema from task code and convert to JSON Schema
 * This allows the frontend to generate forms for task arguments
 */
export function extractSchemaFromTask(taskCode: string): string | null {
	try {
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
		const fieldMatches = schemaContent.matchAll(/(\w+):\s*z\.(\w+)\(\)/g)

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
