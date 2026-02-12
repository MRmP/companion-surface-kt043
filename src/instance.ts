import PQueue from 'p-queue'
import type { SurfaceInstance, SurfaceContext, SurfaceDrawProps, CardGenerator } from '@companion-surface/base'
import { createModuleLogger, parseColor } from '@companion-surface/base'
import * as ffi from './ffi.js'
import { VENDOR_ID, PRODUCT_ID, KEY_COUNT, DEFAULT_ICON_SIZE, controlIdToButtonIndex, buttonIndexToControlId } from './util.js'
import { encodeRGBtoJPEG } from './image-converter.js'

const logger = createModuleLogger('KT043')

export class KT043Wrapper implements SurfaceInstance {
	readonly surfaceId: string
	readonly productName = 'iDisplay KT043'

	private context: SurfaceContext
	private pollTimer: ReturnType<typeof setTimeout> | null = null
	private polling = false
	private drawQueue = new PQueue({ concurrency: 1 })
	private iconSize = DEFAULT_ICON_SIZE
	private deviceOpen = false

	constructor(surfaceId: string, context: SurfaceContext) {
		this.surfaceId = surfaceId
		this.context = context
	}

	async init(): Promise<void> {
		logger.info(`Initializing KT043 surface: ${this.surfaceId}`)

		try {
			ffi.openDevice(VENDOR_ID, PRODUCT_ID, null)
			this.deviceOpen = true
		} catch (err) {
			logger.error(`Failed to open device: ${err instanceof Error ? err.message : String(err)}`)
			throw err
		}

		// Query device info to get actual icon size
		try {
			const info = ffi.getDeviceInfo()
			logger.info(
				`Device info: ${info.btnColNum}x${info.btnRowNum} buttons, ` +
					`screen ${info.screenW}x${info.screenH}, ` +
					`color order: ${info.colorOrder}, bpp: ${info.bytesPerPixel}`,
			)
			if (info.btnResolutions.length > 0) {
				this.iconSize = info.btnResolutions[0].w
				logger.info(`Button resolution: ${this.iconSize}x${info.btnResolutions[0].h}`)
			}
		} catch (err) {
			logger.warn(`Failed to query device info, using defaults: ${err instanceof Error ? err.message : String(err)}`)
		}

		// Disable buzzer
		try {
			ffi.enableBuzzer(false)
		} catch {
			// Non-critical
		}

		// Set initial brightness to 50%
		try {
			ffi.setScreenBrightness(50)
		} catch {
			// Non-critical
		}

		// Start polling for button events
		this.startPolling()
	}

	async close(): Promise<void> {
		logger.info('Closing KT043 surface')

		// Stop polling
		this.stopPolling()

		// Drain draw queue
		this.drawQueue.clear()

		// Close device
		if (this.deviceOpen) {
			try {
				ffi.closeDevice()
			} catch (err) {
				logger.warn(`Error closing device: ${err instanceof Error ? err.message : String(err)}`)
			}
			this.deviceOpen = false
		}
	}

	async ready(): Promise<void> {
		// Device is ready after init
	}

	async updateConfig(_config: Record<string, unknown>): Promise<void> {
		// No configurable fields
	}

	async setBrightness(percent: number): Promise<void> {
		if (!this.deviceOpen) return
		try {
			ffi.setScreenBrightness(percent)
		} catch (err) {
			logger.error(`Failed to set brightness: ${err instanceof Error ? err.message : String(err)}`)
		}
	}

	async blank(): Promise<void> {
		if (!this.deviceOpen) return
		try {
			ffi.fillColorOnScreen(0, 0, 0)
		} catch (err) {
			logger.error(`Failed to blank screen: ${err instanceof Error ? err.message : String(err)}`)
		}
	}

	async draw(_signal: AbortSignal, drawProps: SurfaceDrawProps): Promise<void> {
		if (!this.deviceOpen) return

		await this.drawQueue.add(async () => {
			const btnIndex = controlIdToButtonIndex(drawProps.controlId)
			if (btnIndex < 0 || btnIndex >= KEY_COUNT) return

			try {
				if (drawProps.image) {
					// Companion provides RGB888 pixel data - encode to JPEG for the SDK
					const jpeg = encodeRGBtoJPEG(drawProps.image, this.iconSize, this.iconSize, 95)
					ffi.showImageOnButton(btnIndex, jpeg)
				} else if (drawProps.color) {
					const { r, g, b } = parseColor(drawProps.color)
					ffi.fillColorOnButton(btnIndex, r, g, b)
				}
			} catch (err) {
				logger.error(`Failed to draw button ${btnIndex}: ${err instanceof Error ? err.message : String(err)}`)
			}
		})
	}

	async showStatus(_signal: AbortSignal, cardGenerator: CardGenerator, _statusMessage: string): Promise<void> {
		if (!this.deviceOpen) return

		try {
			const card = await cardGenerator.generateBasicCard(this.iconSize, this.iconSize, 'rgb')
			const jpeg = encodeRGBtoJPEG(card, this.iconSize, this.iconSize, 95)

			for (let i = 0; i < KEY_COUNT; i++) {
				await this.drawQueue.add(async () => {
					try {
						ffi.showImageOnButton(i, jpeg)
					} catch (err) {
						logger.error(`Failed to show status on button ${i}: ${err instanceof Error ? err.message : String(err)}`)
					}
				})
			}
		} catch (err) {
			logger.error(`Failed to generate status card: ${err instanceof Error ? err.message : String(err)}`)
		}
	}

	private startPolling(): void {
		this.polling = true
		this.pollOnce()
	}

	private stopPolling(): void {
		this.polling = false
		if (this.pollTimer) {
			clearTimeout(this.pollTimer)
			this.pollTimer = null
		}
	}

	private pollOnce(): void {
		if (!this.polling || !this.deviceOpen) return

		try {
			const events = ffi.waitEvent(20)
			if (events) {
				for (const evt of events) {
					const controlId = buttonIndexToControlId(evt.index)
					if (evt.state === 1) {
						this.context.keyDownById(controlId)
					} else if (evt.state === 0) {
						this.context.keyUpById(controlId)
					}
				}
			}
		} catch (err) {
			if (this.polling) {
				logger.error(`Event poll error: ${err instanceof Error ? err.message : String(err)}`)
			}
		}

		// Schedule next poll
		if (this.polling) {
			this.pollTimer = setTimeout(() => this.pollOnce(), 5)
		}
	}
}
