import * as clack from '@clack/prompts'
import pc from 'picocolors'

export { clack, pc }

export function intro(title: string) {
	clack.intro(pc.bgCyan(pc.black(` ${title} `)))
}

export function outro(message: string) {
	clack.outro(message)
}

export function error(message: string) {
	clack.log.error(pc.red(message))
}

export function info(message: string) {
	clack.log.info(pc.cyan(message))
}

export function warn(message: string) {
	clack.log.warn(pc.yellow(message))
}

export function step(message: string) {
	clack.log.step(message)
}

export function log(message: string) {
	clack.log.message(message)
}
