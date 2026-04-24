/** @type {import('jest').Config} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	testMatch: ['**/__tests__/**/*.test.ts'],
	moduleNameMapper: {
		'n8n-workflow': '<rootDir>/__mocks__/n8n-workflow.ts',
	},
	collectCoverageFrom: [
		'nodes/**/*.ts',
		'!nodes/**/*.test.ts',
		'!nodes/**/*.node.ts',
	],
};
