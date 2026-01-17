import { Command } from 'commander'
import { initCommand } from './commands/init'
import { listCommand } from './commands/list'
import { loginCommand } from './commands/login'
import { newCommand } from './commands/new'
import { runCommand } from './commands/run'
import { uploadCommand } from './commands/upload'

const program = new Command()

program
	.name('thyme')
	.description('CLI for developing and deploying Thyme tasks')
	.version('0.1.0')

program
	.command('init')
	.description('Initialize a new Thyme project')
	.argument('[name]', 'Project name')
	.action(initCommand)

program
	.command('new')
	.description('Create a new task')
	.argument('[name]', 'Task name')
	.action(newCommand)

program
	.command('run')
	.description('Run a task locally')
	.argument('[task]', 'Task name')
	.option('--simulate', 'Simulate on-chain execution')
	.action((task, options) => runCommand(task, options))

program.command('list').description('List all tasks').action(listCommand)

program
	.command('login')
	.description('Authenticate with Thyme Cloud')
	.action(loginCommand)

program
	.command('upload')
	.description('Upload a task to Thyme Cloud')
	.argument('[task]', 'Task name')
	.option('-o, --organization <id>', 'Organization ID to upload to')
	.action((task, options) => uploadCommand(task, options.organization))

program.parse()
