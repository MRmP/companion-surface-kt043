/**
 * Encode RGB888 pixel data to BMP.
 *
 * The iDisplay SDK accepts BMP images (used by the working stagetimer project).
 * We convert Companion's RGB888 buffer to a 24-bit BMP in-memory.
 */

/**
 * Encode an RGB888 pixel buffer to BMP.
 * @param rgb - RGB888 pixel data (3 bytes per pixel, row-major, top-to-bottom)
 * @param width - image width
 * @param height - image height
 * @returns Buffer containing BMP data
 */
export function encodeRGBtoBMP(rgb: Uint8Array, width: number, height: number): Buffer {
	// BMP row stride must be a multiple of 4 bytes
	const rowStride = Math.ceil((width * 3) / 4) * 4
	const padding = rowStride - width * 3
	const pixelDataSize = rowStride * height

	// BMP file header (14 bytes) + DIB header (40 bytes) = 54 bytes
	const headerSize = 54
	const fileSize = headerSize + pixelDataSize

	const bmp = Buffer.alloc(fileSize)

	// BITMAPFILEHEADER (14 bytes)
	bmp.write('BM', 0) // Signature
	bmp.writeUInt32LE(fileSize, 2) // File size
	bmp.writeUInt16LE(0, 6) // Reserved
	bmp.writeUInt16LE(0, 8) // Reserved
	bmp.writeUInt32LE(headerSize, 10) // Pixel data offset

	// BITMAPINFOHEADER (40 bytes)
	bmp.writeUInt32LE(40, 14) // DIB header size
	bmp.writeInt32LE(width, 18) // Width
	bmp.writeInt32LE(height, 22) // Height (positive = bottom-up)
	bmp.writeUInt16LE(1, 26) // Color planes
	bmp.writeUInt16LE(24, 28) // Bits per pixel
	bmp.writeUInt32LE(0, 30) // Compression (0 = BI_RGB, no compression)
	bmp.writeUInt32LE(pixelDataSize, 34) // Image size
	bmp.writeInt32LE(2835, 38) // Horizontal resolution (72 DPI)
	bmp.writeInt32LE(2835, 42) // Vertical resolution (72 DPI)
	bmp.writeUInt32LE(0, 46) // Colors in palette
	bmp.writeUInt32LE(0, 50) // Important colors

	// Pixel data (BMP stores rows bottom-to-top, pixels as BGR)
	let offset = headerSize
	for (let y = height - 1; y >= 0; y--) {
		for (let x = 0; x < width; x++) {
			const srcIdx = (y * width + x) * 3
			const r = rgb[srcIdx]
			const g = rgb[srcIdx + 1]
			const b = rgb[srcIdx + 2]
			// BMP uses BGR order
			bmp[offset++] = b
			bmp[offset++] = g
			bmp[offset++] = r
		}
		// Add padding bytes to reach row stride
		for (let p = 0; p < padding; p++) {
			bmp[offset++] = 0
		}
	}

	return bmp
}

// Keep old function name as alias for compatibility during transition
export function encodeRGBtoJPEG(rgb: Uint8Array, width: number, height: number, _quality = 85): Buffer {
	return encodeRGBtoBMP(rgb, width, height)
}
