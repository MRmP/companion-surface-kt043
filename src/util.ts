/** Number of button columns */
export const COLUMNS = 5

/** Number of button rows */
export const ROWS = 3

/** Total number of buttons */
export const KEY_COUNT = COLUMNS * ROWS

/** Default icon size in pixels (72x72 like Infinitton; overridden by device_info at runtime) */
export const DEFAULT_ICON_SIZE = 72

/** USB Vendor ID for iDisplay devices */
export const VENDOR_ID = 0xffff

/** USB Product ID for KT043-02-0 */
export const PRODUCT_ID = 0x1110

/**
 * Build a Companion controlId from grid coordinates.
 * Format: "row/column" (0-indexed)
 */
export function getControlIdFromXy(column: number, row: number): string {
	return `${row}/${column}`
}

/**
 * Convert a linear button index (0..14) to a Companion controlId.
 * Buttons are numbered left-to-right, top-to-bottom.
 */
export function buttonIndexToControlId(index: number): string {
	const row = Math.floor(index / COLUMNS)
	const column = index % COLUMNS
	return getControlIdFromXy(column, row)
}

/**
 * Convert a Companion controlId ("row/column") to a linear button index.
 */
export function controlIdToButtonIndex(controlId: string): number {
	const parts = controlId.split('/')
	const row = parseInt(parts[0], 10)
	const column = parseInt(parts[1], 10)
	return row * COLUMNS + column
}
