import { definePreset } from 'unbuild';

// @see https://github.com/unjs/unbuild
export default definePreset({
	clean: true,
	declaration: true,
	rollup: {
		emitCJS: false,
		inlineDependencies: true,
		esbuild: {
			minify: false,
			sourceMap: false,
		},
	},
});
