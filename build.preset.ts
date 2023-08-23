import { definePreset } from 'unbuild';

// @see https://github.com/unjs/unbuild
export default definePreset({
	failOnWarn: false,
	clean: true,
	declaration: true,
	rollup: {
		emitCJS: false,
		esbuild: {
			target: ['es2022'],
		},
	},
});
