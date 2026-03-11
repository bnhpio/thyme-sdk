import { getApiUrlInfo } from '../utils/config'
import { loadEnv } from '../utils/env'
import { intro, outro, pc } from '../utils/ui'

export async function apiUrlCommand() {
	intro('Thyme CLI - API URL')

	// Load project .env if available for environment overrides
	loadEnv(process.cwd())

	const { url, source } = getApiUrlInfo()
	outro(`Current API URL: ${pc.cyan(url)} ${pc.dim(`(${source})`)}`)
}
