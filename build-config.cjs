const { build } = require('esbuild')
const path = require('path')

build({
	entryPoints: [
		path.join(__dirname, 'src', 'main.ts'),
	],
	bundle: true,
	platform: 'node',
	target: 'node22',
	format: 'cjs',
	outdir: path.join(__dirname, 'dist'),
	sourcemap: true,
	external: ['koffi'],
}).catch(() => process.exit(1))
