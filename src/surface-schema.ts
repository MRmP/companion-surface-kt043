import type { SurfaceSchemaLayoutDefinition, SurfaceSchemaControlDefinition } from '@companion-surface/base'
import { COLUMNS, ROWS, DEFAULT_ICON_SIZE, getControlIdFromXy } from './util.js'

export function createSurfaceLayout(iconSize: number = DEFAULT_ICON_SIZE): SurfaceSchemaLayoutDefinition {
	const controls: Record<string, SurfaceSchemaControlDefinition> = {}

	for (let row = 0; row < ROWS; row++) {
		for (let col = 0; col < COLUMNS; col++) {
			const id = getControlIdFromXy(col, row)
			controls[id] = {
				row,
				column: col,
			}
		}
	}

	return {
		stylePresets: {
			default: {
				bitmap: {
					w: iconSize,
					h: iconSize,
					format: 'rgb',
				},
			},
		},
		controls,
	}
}
