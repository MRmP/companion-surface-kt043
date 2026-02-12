/**
 * Encode RGB888 pixel data to JPEG.
 *
 * The iDisplay SDK expects JPEG images (all sample code uses .jpg files).
 * We convert Companion's RGB888 buffer to a minimal JPEG in-memory.
 *
 * This uses a simple baseline JPEG encoder -- no external dependencies.
 */

// ---- Minimal JPEG encoder ------------------------------------------------
// This is a stripped-down baseline JPEG encoder sufficient for 72x72 icons.

const ZIGZAG = [
	0, 1, 5, 6, 14, 15, 27, 28, 2, 4, 7, 13, 16, 26, 29, 42, 3, 8, 12, 17, 25, 30, 41, 43, 9, 11, 18, 24, 31, 40,
	44, 53, 10, 19, 23, 32, 39, 45, 52, 54, 20, 22, 33, 38, 46, 51, 55, 60, 21, 34, 37, 47, 50, 56, 59, 61, 35, 36,
	48, 49, 57, 58, 62, 63,
]

// Standard luminance quantization table (quality ~75)
const STD_LUMA_QT = [
	16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29,
	51, 87, 80, 62, 18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121,
	120, 101, 72, 92, 95, 98, 112, 100, 103, 99,
]

// Standard chrominance quantization table (quality ~75)
const STD_CHROMA_QT = [
	17, 18, 24, 47, 99, 99, 99, 99, 18, 21, 26, 66, 99, 99, 99, 99, 24, 26, 56, 99, 99, 99, 99, 99, 47, 66, 99, 99,
	99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99,
	99, 99, 99, 99, 99, 99, 99, 99,
]

function scaleQT(qt: number[], quality: number): number[] {
	const q = quality < 50 ? Math.floor(5000 / quality) : 200 - quality * 2
	return qt.map((v) => {
		const val = Math.floor((v * q + 50) / 100)
		return Math.max(1, Math.min(255, val))
	})
}

// Standard DC/AC Huffman tables for luminance and chrominance
const DC_LUMA_BITS = [0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0]
const DC_LUMA_VALS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

const DC_CHROMA_BITS = [0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0]
const DC_CHROMA_VALS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

const AC_LUMA_BITS = [0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 125]
const AC_LUMA_VALS = [
	0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06, 0x13, 0x51, 0x61, 0x07, 0x22, 0x71,
	0x14, 0x32, 0x81, 0x91, 0xa1, 0x08, 0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72,
	0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x34, 0x35, 0x36, 0x37,
	0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
	0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x83,
	0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3,
	0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3,
	0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2,
	0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa,
]

const AC_CHROMA_BITS = [0, 2, 1, 2, 4, 4, 3, 4, 7, 5, 4, 4, 0, 1, 2, 119]
const AC_CHROMA_VALS = [
	0x00, 0x01, 0x02, 0x03, 0x11, 0x04, 0x05, 0x21, 0x31, 0x06, 0x12, 0x41, 0x51, 0x07, 0x61, 0x71, 0x13, 0x22,
	0x32, 0x81, 0x08, 0x14, 0x42, 0x91, 0xa1, 0xb1, 0xc1, 0x09, 0x23, 0x33, 0x52, 0xf0, 0x15, 0x62, 0x72, 0xd1,
	0x0a, 0x16, 0x24, 0x34, 0xe1, 0x25, 0xf1, 0x17, 0x18, 0x19, 0x1a, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x35, 0x36,
	0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58,
	0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a,
	0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a,
	0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba,
	0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda,
	0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa,
]

interface HuffCode {
	code: number
	length: number
}

function buildHuffTable(bits: number[], vals: number[]): HuffCode[] {
	const table: HuffCode[] = new Array(256).fill(null).map(() => ({ code: 0, length: 0 }))
	let code = 0
	let idx = 0
	for (let len = 1; len <= 16; len++) {
		for (let i = 0; i < bits[len - 1]; i++) {
			table[vals[idx]] = { code, length: len }
			idx++
			code++
		}
		code <<= 1
	}
	return table
}

class BitWriter {
	private buf: number[] = []
	private current = 0
	private bitPos = 0

	writeBits(code: number, length: number): void {
		for (let i = length - 1; i >= 0; i--) {
			this.current = (this.current << 1) | ((code >> i) & 1)
			this.bitPos++
			if (this.bitPos === 8) {
				this.buf.push(this.current)
				if (this.current === 0xff) {
					this.buf.push(0x00) // byte stuffing
				}
				this.current = 0
				this.bitPos = 0
			}
		}
	}

	flush(): void {
		if (this.bitPos > 0) {
			this.current <<= 8 - this.bitPos
			this.current |= (1 << (8 - this.bitPos)) - 1 // pad with 1s
			this.buf.push(this.current)
			if (this.current === 0xff) {
				this.buf.push(0x00)
			}
			this.current = 0
			this.bitPos = 0
		}
	}

	getBytes(): Uint8Array {
		return new Uint8Array(this.buf)
	}
}

function fdct(block: Float64Array): void {
	const C1 = 0.9807852804032304 // cos(PI/16)
	const C2 = 0.9238795325112867 // cos(2*PI/16)
	const C3 = 0.8314696123025452 // cos(3*PI/16)
	const C4 = 0.7071067811865476 // cos(4*PI/16) = 1/sqrt(2)
	const C5 = 0.5555702330196022 // cos(5*PI/16)
	const C6 = 0.3826834323650898 // cos(6*PI/16)
	const C7 = 0.1950903220161283 // cos(7*PI/16)

	// Row pass
	for (let i = 0; i < 64; i += 8) {
		const s0 = block[i] + block[i + 7]
		const s1 = block[i + 1] + block[i + 6]
		const s2 = block[i + 2] + block[i + 5]
		const s3 = block[i + 3] + block[i + 4]
		const d0 = block[i] - block[i + 7]
		const d1 = block[i + 1] - block[i + 6]
		const d2 = block[i + 2] - block[i + 5]
		const d3 = block[i + 3] - block[i + 4]

		const ss0 = s0 + s3
		const ss1 = s1 + s2
		const ds0 = s0 - s3
		const ds1 = s1 - s2

		block[i] = (ss0 + ss1) * 0.125
		block[i + 4] = (ss0 - ss1) * 0.125
		block[i + 2] = (ds0 * C2 + ds1 * C6) * 0.125
		block[i + 6] = (ds0 * C6 - ds1 * C2) * 0.125
		block[i + 1] = (d0 * C1 + d1 * C3 + d2 * C5 + d3 * C7) * 0.125
		block[i + 3] = (d0 * C3 - d1 * C7 - d2 * C1 - d3 * C5) * 0.125
		block[i + 5] = (d0 * C5 - d1 * C1 + d2 * C7 + d3 * C3) * 0.125
		block[i + 7] = (d0 * C7 - d1 * C5 + d2 * C3 - d3 * C1) * 0.125
	}

	// Column pass
	for (let i = 0; i < 8; i++) {
		const s0 = block[i] + block[i + 56]
		const s1 = block[i + 8] + block[i + 48]
		const s2 = block[i + 16] + block[i + 40]
		const s3 = block[i + 24] + block[i + 32]
		const d0 = block[i] - block[i + 56]
		const d1 = block[i + 8] - block[i + 48]
		const d2 = block[i + 16] - block[i + 40]
		const d3 = block[i + 24] - block[i + 32]

		const ss0 = s0 + s3
		const ss1 = s1 + s2
		const ds0 = s0 - s3
		const ds1 = s1 - s2

		block[i] = (ss0 + ss1) * 0.125
		block[i + 32] = (ss0 - ss1) * 0.125
		block[i + 16] = (ds0 * C2 + ds1 * C6) * 0.125
		block[i + 48] = (ds0 * C6 - ds1 * C2) * 0.125
		block[i + 8] = (d0 * C1 + d1 * C3 + d2 * C5 + d3 * C7) * 0.125
		block[i + 24] = (d0 * C3 - d1 * C7 - d2 * C1 - d3 * C5) * 0.125
		block[i + 40] = (d0 * C5 - d1 * C1 + d2 * C7 + d3 * C3) * 0.125
		block[i + 56] = (d0 * C7 - d1 * C5 + d2 * C3 - d3 * C1) * 0.125
	}
}

function categoryOf(val: number): number {
	let abs = val < 0 ? -val : val
	let cat = 0
	while (abs > 0) {
		abs >>= 1
		cat++
	}
	return cat
}

function encodeBlock(
	bw: BitWriter,
	block: Float64Array,
	qt: number[],
	prevDC: number,
	dcTable: HuffCode[],
	acTable: HuffCode[],
): number {
	// Quantize
	const quantized = new Int32Array(64)
	for (let i = 0; i < 64; i++) {
		quantized[ZIGZAG[i]] = Math.round(block[i] / qt[i])
	}

	// DC
	const dcDiff = quantized[0] - prevDC
	const dcCat = categoryOf(dcDiff)
	const dcHuff = dcTable[dcCat]
	bw.writeBits(dcHuff.code, dcHuff.length)
	if (dcCat > 0) {
		const dcVal = dcDiff < 0 ? dcDiff + (1 << dcCat) - 1 : dcDiff
		bw.writeBits(dcVal, dcCat)
	}

	// AC
	let zeroRun = 0
	for (let i = 1; i < 64; i++) {
		if (quantized[i] === 0) {
			zeroRun++
		} else {
			while (zeroRun >= 16) {
				const zrl = acTable[0xf0]
				bw.writeBits(zrl.code, zrl.length)
				zeroRun -= 16
			}
			const acCat = categoryOf(quantized[i])
			const sym = (zeroRun << 4) | acCat
			const acHuff = acTable[sym]
			bw.writeBits(acHuff.code, acHuff.length)
			const acVal = quantized[i] < 0 ? quantized[i] + (1 << acCat) - 1 : quantized[i]
			bw.writeBits(acVal, acCat)
			zeroRun = 0
		}
	}
	if (zeroRun > 0) {
		const eob = acTable[0x00]
		bw.writeBits(eob.code, eob.length)
	}

	return quantized[0]
}

/**
 * Encode an RGB888 pixel buffer to JPEG.
 * @param rgb - RGB888 pixel data (3 bytes per pixel, row-major)
 * @param width - image width
 * @param height - image height
 * @param quality - JPEG quality (1-100, default 85)
 * @returns Buffer containing JPEG data
 */
export function encodeRGBtoJPEG(rgb: Uint8Array, width: number, height: number, quality = 85): Buffer {
	const lumaQT = scaleQT(STD_LUMA_QT, quality)
	const chromaQT = scaleQT(STD_CHROMA_QT, quality)

	const dcLumaHuff = buildHuffTable(DC_LUMA_BITS, DC_LUMA_VALS)
	const dcChromaHuff = buildHuffTable(DC_CHROMA_BITS, DC_CHROMA_VALS)
	const acLumaHuff = buildHuffTable(AC_LUMA_BITS, AC_LUMA_VALS)
	const acChromaHuff = buildHuffTable(AC_CHROMA_BITS, AC_CHROMA_VALS)

	const bw = new BitWriter()

	let prevDCY = 0
	let prevDCCb = 0
	let prevDCCr = 0

	const blockY = new Float64Array(64)
	const blockCb = new Float64Array(64)
	const blockCr = new Float64Array(64)

	for (let by = 0; by < height; by += 8) {
		for (let bx = 0; bx < width; bx += 8) {
			// Extract 8x8 block and convert RGB -> YCbCr
			for (let y = 0; y < 8; y++) {
				for (let x = 0; x < 8; x++) {
					const py = Math.min(by + y, height - 1)
					const px = Math.min(bx + x, width - 1)
					const idx = (py * width + px) * 3
					const r = rgb[idx]
					const g = rgb[idx + 1]
					const b = rgb[idx + 2]

					const bi = y * 8 + x
					blockY[bi] = 0.299 * r + 0.587 * g + 0.114 * b - 128
					blockCb[bi] = -0.168736 * r - 0.331264 * g + 0.5 * b
					blockCr[bi] = 0.5 * r - 0.418688 * g - 0.081312 * b
				}
			}

			fdct(blockY)
			fdct(blockCb)
			fdct(blockCr)

			prevDCY = encodeBlock(bw, blockY, lumaQT, prevDCY, dcLumaHuff, acLumaHuff)
			prevDCCb = encodeBlock(bw, blockCb, chromaQT, prevDCCb, dcChromaHuff, acChromaHuff)
			prevDCCr = encodeBlock(bw, blockCr, chromaQT, prevDCCr, dcChromaHuff, acChromaHuff)
		}
	}

	bw.flush()
	const scanData = bw.getBytes()

	// Build JPEG file
	const parts: Uint8Array[] = []

	// SOI
	parts.push(new Uint8Array([0xff, 0xd8]))

	// APP0 (JFIF)
	const app0 = new Uint8Array([
		0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
	])
	parts.push(app0)

	// DQT - luminance
	const dqt0 = new Uint8Array(69)
	dqt0[0] = 0xff
	dqt0[1] = 0xdb
	dqt0[2] = 0x00
	dqt0[3] = 0x43
	dqt0[4] = 0x00 // table 0, 8-bit
	for (let i = 0; i < 64; i++) dqt0[5 + i] = lumaQT[ZIGZAG[i]]
	parts.push(dqt0)

	// DQT - chrominance
	const dqt1 = new Uint8Array(69)
	dqt1[0] = 0xff
	dqt1[1] = 0xdb
	dqt1[2] = 0x00
	dqt1[3] = 0x43
	dqt1[4] = 0x01 // table 1, 8-bit
	for (let i = 0; i < 64; i++) dqt1[5 + i] = chromaQT[ZIGZAG[i]]
	parts.push(dqt1)

	// SOF0
	const sof = new Uint8Array([
		0xff,
		0xc0,
		0x00,
		0x11,
		0x08,
		(height >> 8) & 0xff,
		height & 0xff,
		(width >> 8) & 0xff,
		width & 0xff,
		0x03, // 3 components
		0x01,
		0x11,
		0x00, // Y: 1x1, QT0
		0x02,
		0x11,
		0x01, // Cb: 1x1, QT1
		0x03,
		0x11,
		0x01, // Cr: 1x1, QT1
	])
	parts.push(sof)

	// DHT tables
	function writeDHT(tableClass: number, tableId: number, bits: number[], vals: number[]): void {
		const totalVals = vals.length
		const length = 2 + 1 + 16 + totalVals
		const dht = new Uint8Array(2 + length)
		dht[0] = 0xff
		dht[1] = 0xc4
		dht[2] = (length >> 8) & 0xff
		dht[3] = length & 0xff
		dht[4] = (tableClass << 4) | tableId
		for (let i = 0; i < 16; i++) dht[5 + i] = bits[i]
		for (let i = 0; i < totalVals; i++) dht[21 + i] = vals[i]
		parts.push(dht)
	}

	writeDHT(0, 0, DC_LUMA_BITS, DC_LUMA_VALS)
	writeDHT(1, 0, AC_LUMA_BITS, AC_LUMA_VALS)
	writeDHT(0, 1, DC_CHROMA_BITS, DC_CHROMA_VALS)
	writeDHT(1, 1, AC_CHROMA_BITS, AC_CHROMA_VALS)

	// SOS
	const sos = new Uint8Array([
		0xff,
		0xda,
		0x00,
		0x0c,
		0x03, // 3 components
		0x01,
		0x00, // Y: DC0/AC0
		0x02,
		0x11, // Cb: DC1/AC1
		0x03,
		0x11, // Cr: DC1/AC1
		0x00,
		0x3f,
		0x00, // spectral selection
	])
	parts.push(sos)

	// Scan data
	parts.push(scanData)

	// EOI
	parts.push(new Uint8Array([0xff, 0xd9]))

	// Concatenate
	let totalLen = 0
	for (const p of parts) totalLen += p.length
	const result = Buffer.alloc(totalLen)
	let offset = 0
	for (const p of parts) {
		result.set(p, offset)
		offset += p.length
	}

	return result
}
