// Configuration for companion-surface-build packaging tool
module.exports = {
	// Force removal of node-gyp from the package
	forceRemoveNodeGypFromPkg: true,
	// Mark koffi as external - it will be loaded at runtime
	externals: {
		koffi: 'commonjs koffi',
	},
	// Include vendor SDK files in the package
	extraFiles: ['vendor/**/*'],
}

// Also run esbuild for local development builds when called directly
if (require.main === module) {
	const { build } = require('esbuild')
	const path = require('path')

	build({
		entryPoints: [path.join(__dirname, 'src', 'main.ts')],
		bundle: true,
		platform: 'node',
		target: 'node22',
		format: 'cjs',
		outdir: path.join(__dirname, 'dist'),
		sourcemap: true,
		external: ['koffi'],
	}).catch(() => process.exit(1))
}
