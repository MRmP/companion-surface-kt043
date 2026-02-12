import koffi from 'koffi'
import type { KoffiFunction } from 'koffi'
import path from 'path'

// ---- Enums ----------------------------------------------------------------

export enum iD_ret {
	NO_ERROR = 0,
	ERR_NO_MEM = 1,
	ERR_DEVICE_NOT_FOUND = 2,
	ERR_DEVICE_NOT_OPEN = 3,
	ERR_DEVICE_ALREADY_OPENED = 4,
	ERR_DEVICE_NOT_EXIST = 5,
	ERR_INVALID_PARAMETER = 6,
	ERR_TIMEOUT = 7,
	ERR_TRANSFER_FAILED = 8,
	ERR_INCORRECT_CHECKSUM = 9,
}

export enum ColorOrder {
	CO_UNDEFINED = -1,
	CO_RGB555 = 0,
	CO_RGB565 = 1,
	CO_RGB666 = 2,
	CO_RGB888 = 3,
	CO_BGR888 = 4,
	CO_BGRX8888 = 5,
	CO_ARGB8888 = 6,
	CO_RGBA8888 = 7,
	CO_YUV422 = 8,
}

export enum USB_EVT {
	EVT_BUTTON = 0,
	EVT_ADC = 1,
	EVT_TOUCH_SCREEN = 2,
}

export enum BtnState {
	UNCHANGED = -1,
	RELEASED = 0,
	PRESSED = 1,
}

// ---- Device info types ----------------------------------------------------

export interface DeviceInfo {
	btnRowNum: number
	btnColNum: number
	btnTotalNum: number
	btnTypeNum: number
	windowNum: number
	windowW: number
	windowH: number
	screenW: number
	screenH: number
	bytesPerPixel: number
	colorOrder: ColorOrder
	btnResolutions: Array<{ w: number; h: number }>
}

// ---- Resolve DLL path -----------------------------------------------------

function resolveDllPath(): string {
	const vendorDir = path.resolve(__dirname, '..', 'vendor')

	if (process.platform === 'win32') {
		return path.join(vendorDir, 'win64', 'iD_SDK_V115.0.2.dll')
	} else if (process.platform === 'linux') {
		return path.join(vendorDir, 'linux64', 'libiD_SDK_V115.0.2.so')
	}
	throw new Error(`Unsupported platform: ${process.platform}`)
}

// ---- Load library and bind functions --------------------------------------

let lib: koffi.IKoffiLib | null = null

function getLib(): koffi.IKoffiLib {
	if (!lib) {
		lib = koffi.load(resolveDllPath())
	}
	return lib
}

// Define calling convention for Windows
const CC = process.platform === 'win32' ? '__stdcall' : undefined

let fnOpen: KoffiFunction
let fnClose: KoffiFunction
let fnGetDeviceInfo: KoffiFunction
let fnGetCustomerSN: KoffiFunction
let fnGetManufacturerSN: KoffiFunction
let fnSetBrightness: KoffiFunction
let fnShowImageOnButton: KoffiFunction
let fnFillColorOnButton: KoffiFunction
let fnFillColorOnScreen: KoffiFunction
let fnWaitEvent: KoffiFunction
let fnEnableBuzzer: KoffiFunction
let fnGetSDKVersion: KoffiFunction

let bound = false

function ensureBindings(): void {
	if (bound) return
	const l = getLib()

	if (CC) {
		fnOpen = l.func(CC, 'iD_USB_open_device', 'int', ['uint16', 'uint16', 'str'])
		fnClose = l.func(CC, 'iD_USB_close_device', 'int', [])
		fnGetDeviceInfo = l.func(CC, 'iD_USB_get_device_info', 'int', ['void *'])
		fnGetCustomerSN = l.func(CC, 'iD_USB_get_customer_serial_number', 'int', ['void *', 'uint32'])
		fnGetManufacturerSN = l.func(CC, 'iD_USB_get_manufacturer_serial_number', 'int', ['void *', 'uint32'])
		fnSetBrightness = l.func(CC, 'iD_USB_set_screen_brightness', 'int', ['uint8'])
		fnShowImageOnButton = l.func(CC, 'iD_USB_show_image_on_button', 'int', ['uint8', 'void *', 'uint32'])
		fnFillColorOnButton = l.func(CC, 'iD_USB_fill_color_on_button', 'int', ['uint8', 'uint8', 'uint8', 'uint8'])
		fnFillColorOnScreen = l.func(CC, 'iD_USB_fill_color_on_screen', 'int', ['uint8', 'uint8', 'uint8'])
		fnWaitEvent = l.func(CC, 'iD_USB_wait_event', 'int', ['void *', 'int32'])
		fnEnableBuzzer = l.func(CC, 'iD_USB_enable_buzzer', 'int', ['bool'])
		fnGetSDKVersion = l.func(CC, 'iD_get_SDK_version', 'void', ['void *'])
	} else {
		fnOpen = l.func('iD_USB_open_device', 'int', ['uint16', 'uint16', 'str'])
		fnClose = l.func('iD_USB_close_device', 'int', [])
		fnGetDeviceInfo = l.func('iD_USB_get_device_info', 'int', ['void *'])
		fnGetCustomerSN = l.func('iD_USB_get_customer_serial_number', 'int', ['void *', 'uint32'])
		fnGetManufacturerSN = l.func('iD_USB_get_manufacturer_serial_number', 'int', ['void *', 'uint32'])
		fnSetBrightness = l.func('iD_USB_set_screen_brightness', 'int', ['uint8'])
		fnShowImageOnButton = l.func('iD_USB_show_image_on_button', 'int', ['uint8', 'void *', 'uint32'])
		fnFillColorOnButton = l.func('iD_USB_fill_color_on_button', 'int', ['uint8', 'uint8', 'uint8', 'uint8'])
		fnFillColorOnScreen = l.func('iD_USB_fill_color_on_screen', 'int', ['uint8', 'uint8', 'uint8'])
		fnWaitEvent = l.func('iD_USB_wait_event', 'int', ['void *', 'int32'])
		fnEnableBuzzer = l.func('iD_USB_enable_buzzer', 'int', ['bool'])
		fnGetSDKVersion = l.func('iD_get_SDK_version', 'void', ['void *'])
	}

	bound = true
}

// ---- Helpers --------------------------------------------------------------

function checkRet(ret: number, fnName: string): void {
	if (ret !== iD_ret.NO_ERROR) {
		const name = iD_ret[ret] ?? `UNKNOWN(${ret})`
		throw new Error(`${fnName} failed: ${name}`)
	}
}

// ---- Public API -----------------------------------------------------------

export function openDevice(vid: number, pid: number, serialNumber: string | null = null): void {
	ensureBindings()
	const ret = fnOpen(vid, pid, serialNumber as unknown as string)
	checkRet(ret, 'iD_USB_open_device')
}

export function closeDevice(): void {
	ensureBindings()
	const ret = fnClose()
	checkRet(ret, 'iD_USB_close_device')
}

export function getDeviceInfo(): DeviceInfo {
	ensureBindings()
	// Allocate buffer large enough for device_info struct
	// struct layout: btn_row_num(1) + btn_col_num(1) + btn_total_num(1) + btn_type_num(1) +
	//   window_num(1) + pad(1) + window_w(2) + window_h(2) + screen_w(2) + screen_h(2) +
	//   bytes_per_pixel(1) + pad(3) + color_order(4) + btn_resolution(variable)
	// Use generous buffer
	const buf = Buffer.alloc(256)
	const ret = fnGetDeviceInfo(buf)
	checkRet(ret, 'iD_USB_get_device_info')

	// Parse struct - assuming packed layout based on SDK C header
	// uint8_t btn_row_num     offset 0
	// uint8_t btn_col_num     offset 1
	// uint8_t btn_total_num   offset 2
	// uint8_t btn_type_num    offset 3
	// uint8_t window_num      offset 4
	// (padding 1 byte)        offset 5
	// uint16_t window_w       offset 6
	// uint16_t window_h       offset 8
	// uint16_t screen_w       offset 10
	// uint16_t screen_h       offset 12
	// uint8_t bytes_per_pixel  offset 14
	// (padding 1 byte)        offset 15
	// int32_t color_order     offset 16  (enum is int)
	// uint8_t btn_resolution[]  offset 20

	const btnRowNum = buf.readUInt8(0)
	const btnColNum = buf.readUInt8(1)
	const btnTotalNum = buf.readUInt8(2)
	const btnTypeNum = buf.readUInt8(3)
	const windowNum = buf.readUInt8(4)
	const windowW = buf.readUInt16LE(6)
	const windowH = buf.readUInt16LE(8)
	const screenW = buf.readUInt16LE(10)
	const screenH = buf.readUInt16LE(12)
	const bytesPerPixel = buf.readUInt8(14)
	const colorOrder = buf.readInt32LE(16) as ColorOrder

	const btnResolutions: Array<{ w: number; h: number }> = []
	for (let i = 0; i < btnTypeNum; i++) {
		const offset = 20 + i * 2
		btnResolutions.push({
			w: buf.readUInt8(offset),
			h: buf.readUInt8(offset + 1),
		})
	}

	return {
		btnRowNum,
		btnColNum,
		btnTotalNum,
		btnTypeNum,
		windowNum,
		windowW,
		windowH,
		screenW,
		screenH,
		bytesPerPixel,
		colorOrder,
		btnResolutions,
	}
}

export function getCustomerSerialNumber(): string {
	ensureBindings()
	const buf = Buffer.alloc(13)
	const ret = fnGetCustomerSN(buf, 13)
	checkRet(ret, 'iD_USB_get_customer_serial_number')
	const nullIdx = buf.indexOf(0)
	return buf.subarray(0, nullIdx === -1 ? 13 : nullIdx).toString('ascii')
}

export function getManufacturerSerialNumber(): string {
	ensureBindings()
	const buf = Buffer.alloc(13)
	const ret = fnGetManufacturerSN(buf, 13)
	checkRet(ret, 'iD_USB_get_manufacturer_serial_number')
	const nullIdx = buf.indexOf(0)
	return buf.subarray(0, nullIdx === -1 ? 13 : nullIdx).toString('ascii')
}

export function setScreenBrightness(percentage: number): void {
	ensureBindings()
	const ret = fnSetBrightness(Math.max(0, Math.min(100, Math.round(percentage))))
	checkRet(ret, 'iD_USB_set_screen_brightness')
}

export function showImageOnButton(btnIndex: number, imageData: Buffer): void {
	ensureBindings()
	const ret = fnShowImageOnButton(btnIndex, imageData, imageData.length)
	checkRet(ret, 'iD_USB_show_image_on_button')
}

export function fillColorOnButton(btnIndex: number, r: number, g: number, b: number): void {
	ensureBindings()
	const ret = fnFillColorOnButton(btnIndex, r, g, b)
	checkRet(ret, 'iD_USB_fill_color_on_button')
}

export function fillColorOnScreen(r: number, g: number, b: number): void {
	ensureBindings()
	const ret = fnFillColorOnScreen(r, g, b)
	checkRet(ret, 'iD_USB_fill_color_on_screen')
}

export interface ButtonEvent {
	index: number
	state: BtnState
}

export function waitEvent(timeoutMs: number): ButtonEvent[] | null {
	ensureBindings()
	const buf = Buffer.alloc(256)
	const ret = fnWaitEvent(buf, timeoutMs)

	if (ret === iD_ret.ERR_TIMEOUT) {
		return null
	}
	checkRet(ret, 'iD_USB_wait_event')

	// Parse USB_event_user struct (MSVC default alignment, no #pragma pack):
	// offset 0: uint8_t event_type
	// offset 1: (padding for uint16 alignment)
	// offset 2: uint16_t data_len (LE)
	// offset 4: data[]
	const eventType = buf.readUInt8(0)
	if (eventType !== USB_EVT.EVT_BUTTON) {
		return null
	}

	const dataLen = buf.readUInt16LE(2)
	const DATA_OFFSET = 4
	const numButtons = Math.min(dataLen, buf.length - DATA_OFFSET, 128) // cap to MAX_BTN_NUM
	const events: ButtonEvent[] = []

	for (let i = 0; i < numButtons; i++) {
		const state = buf.readInt8(DATA_OFFSET + i) as BtnState
		if (state !== BtnState.UNCHANGED) {
			events.push({ index: i, state })
		}
	}

	return events.length > 0 ? events : null
}

export function enableBuzzer(enable: boolean): void {
	ensureBindings()
	const ret = fnEnableBuzzer(enable)
	checkRet(ret, 'iD_USB_enable_buzzer')
}

export function getSDKVersion(): string {
	ensureBindings()
	const buf = Buffer.alloc(9)
	fnGetSDKVersion(buf)
	const nullIdx = buf.indexOf(0)
	return buf.subarray(0, nullIdx === -1 ? 9 : nullIdx).toString('ascii')
}

export function getDllPath(): string {
	return resolveDllPath()
}
