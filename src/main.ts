import type {
	SurfacePlugin,
	HIDDevice,
	DiscoveredSurfaceInfo,
	OpenSurfaceResult,
	SurfaceContext,
	SurfacePincodeMap,
} from '@companion-surface/base'
import { VENDOR_ID, PRODUCT_ID, getControlIdFromXy } from './util.js'
import { createSurfaceLayout } from './surface-schema.js'
import { KT043Wrapper } from './instance.js'

interface KT043PluginInfo {
	path: string
}

function buildPincodeMap(): SurfacePincodeMap {
	// Map digit buttons across the 5x3 grid:
	//   Row 0: [1] [2] [3] [4] [5]
	//   Row 1: [6] [7] [8] [9] [0]
	//   Row 2: (unused for pincode)
	return {
		type: 'single-page',
		pincode: null,
		0: getControlIdFromXy(4, 1), // digit 0 -> row 1, col 4
		1: getControlIdFromXy(0, 0), // digit 1 -> row 0, col 0
		2: getControlIdFromXy(1, 0), // digit 2 -> row 0, col 1
		3: getControlIdFromXy(2, 0), // digit 3 -> row 0, col 2
		4: getControlIdFromXy(3, 0), // digit 4 -> row 0, col 3
		5: getControlIdFromXy(4, 0), // digit 5 -> row 0, col 4
		6: getControlIdFromXy(0, 1), // digit 6 -> row 1, col 0
		7: getControlIdFromXy(1, 1), // digit 7 -> row 1, col 1
		8: getControlIdFromXy(2, 1), // digit 8 -> row 1, col 2
		9: getControlIdFromXy(3, 1), // digit 9 -> row 1, col 3
	}
}

const KT043Plugin: SurfacePlugin<KT043PluginInfo> = {
	async init(): Promise<void> {
		// No global initialization needed
	},

	async destroy(): Promise<void> {
		// No global cleanup needed
	},

	checkSupportsHidDevice(device: HIDDevice): DiscoveredSurfaceInfo<KT043PluginInfo> | null {
		if (device.vendorId !== VENDOR_ID || device.productId !== PRODUCT_ID) {
			return null
		}

		// Use a stable fixed ID to ensure consistent detection across restarts
		// The HID serialNumber can be unreliable (empty on some USB enumerations)
		// For multi-device support in the future, we could use the SDK's serial after opening
		const stableId = 'default'
		const displaySerial = device.serialNumber || 'KT043'
		return {
			surfaceId: `kt043:${stableId}`,
			description: `iDisplay KT043 (${displaySerial})`,
			pluginInfo: {
				path: device.path,
			},
		}
	},

	async openSurface(
		surfaceId: string,
		_pluginInfo: KT043PluginInfo,
		context: SurfaceContext,
	): Promise<OpenSurfaceResult> {
		const wrapper = new KT043Wrapper(surfaceId, context)

		const surfaceLayout = createSurfaceLayout()
		const pincodeMap = buildPincodeMap()

		return {
			surface: wrapper,
			registerProps: {
				brightness: true,
				surfaceLayout,
				pincodeMap,
				location: null,
				configFields: null,
			},
		}
	},
}

export default KT043Plugin

// Also expose as module.exports for CJS require() compatibility
// Companion's SurfaceThread uses require() when __non_webpack_require__ is available
module.exports = KT043Plugin
