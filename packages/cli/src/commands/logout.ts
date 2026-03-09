import { clearAuthToken, getAuthToken } from '../utils/config'
import { intro, outro } from '../utils/ui'

export async function logoutCommand() {
	intro('Thyme CLI - Logout')

	if (!getAuthToken()) {
		outro('You are not logged in.')
		return
	}

	clearAuthToken()
	outro('Logged out successfully.')
}
