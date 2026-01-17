import { discoverTasks, isThymeProject } from '../utils/tasks'
import { clack, intro, outro, pc, step } from '../utils/ui'

export async function listCommand() {
	intro('Thyme CLI - List Tasks')

	const projectRoot = process.cwd()

	if (!isThymeProject(projectRoot)) {
		outro(pc.red('Not in a Thyme project'))
		process.exit(1)
	}

	const tasks = await discoverTasks(projectRoot)

	if (tasks.length === 0) {
		outro(pc.yellow('No tasks found. Create one with `thyme new`'))
		return
	}

	step(`Found ${tasks.length} task(s):`)
	for (const task of tasks) {
		clack.log.message(`  ${pc.cyan('●')} ${task}`)
	}

	outro('')
}
