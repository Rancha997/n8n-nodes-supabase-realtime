module.exports = {
	root: true,
	env: {
		es6: true,
		node: true,
	},
	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: ['./tsconfig.json'],
		sourceType: 'module',
		extraFileExtensions: ['.json'],
	},
	ignorePatterns: ['**/*.test.ts', '__mocks__/**'],
	plugins: ['@typescript-eslint', 'n8n-nodes-base'],
	extends: [
		'plugin:n8n-nodes-base/nodes',
		'plugin:n8n-nodes-base/credentials',
	],
	rules: {},
	overrides: [
		{
			files: ['package.json'],
			parser: 'jsonc-eslint-parser',
			rules: {
				'@typescript-eslint/no-unused-expressions': 'off',
			},
		},
	],
};
