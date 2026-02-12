/**
 * Worker thread that polls the iDisplay SDK for button events.
 *
 * Communicates with the parent thread via `parentPort` messages:
 *   Parent -> Worker: { type: 'stop' }
 *   Worker -> Parent: { type: 'button', index: number, state: number }
 *   Worker -> Parent: { type: 'error', message: string }
 *   Worker -> Parent: { type: 'stopped' }
 */
import { parentPort, workerData } from 'worker_threads'
import koffi from 'koffi'

if (!parentPort) {
	throw new Error('event-worker must be run as a Worker thread')
}

const port = parentPort

interface WorkerConfig {
	dllPath: string
	pollTimeoutMs: number
}

const config = workerData as WorkerConfig

// Load the SDK DLL in this worker thread
const lib = koffi.load(config.dllPath)

const CC = process.platform === 'win32' ? '__stdcall' : undefined

const fnWaitEvent = CC
	? lib.func(CC, 'iD_USB_wait_event', 'int', ['void *', 'int32'])
	: lib.func('iD_USB_wait_event', 'int', ['void *', 'int32'])

const RET_NO_ERROR = 0
const RET_TIMEOUT = 7
const EVT_BUTTON = 0
const STATE_UNCHANGED = -1

let running = true

port.on('message', (msg: { type: string }) => {
	if (msg.type === 'stop') {
		running = false
	}
})

async function pollLoop(): Promise<void> {
	const buf = Buffer.alloc(256)

	while (running) {
		try {
			const ret = fnWaitEvent(buf, config.pollTimeoutMs)

			if (!running) break

			if (ret === RET_TIMEOUT) {
				continue
			}

			if (ret !== RET_NO_ERROR) {
				port.postMessage({ type: 'error', message: `iD_USB_wait_event failed: ${ret}` })
				continue
			}

			const eventType = buf.readUInt8(0)
			if (eventType !== EVT_BUTTON) {
				continue
			}

			const dataLen = buf.readUInt16LE(1)
			const numButtons = dataLen

			for (let i = 0; i < numButtons; i++) {
				const state = buf.readInt8(3 + i)
				if (state !== STATE_UNCHANGED) {
					port.postMessage({ type: 'button', index: i, state })
				}
			}
		} catch (err) {
			if (!running) break
			port.postMessage({
				type: 'error',
				message: err instanceof Error ? err.message : String(err),
			})
			// Brief pause on error before retrying
			await new Promise((resolve) => setTimeout(resolve, 100))
		}
	}

	port.postMessage({ type: 'stopped' })
}

pollLoop().catch((err) => {
	port.postMessage({
		type: 'error',
		message: `Worker poll loop crashed: ${err instanceof Error ? err.message : String(err)}`,
	})
})
