import { evaluateCondition, rowMatchesConditions, FilterCondition } from '../nodes/SupabaseRealtimeTrigger/utils';

describe('evaluateCondition', () => {
	describe('eq', () => {
		it('match', () => expect(evaluateCondition({ s: 'pending' }, { column: 's', operator: 'eq', value: 'pending' })).toBe(true));
		it('no match', () => expect(evaluateCondition({ s: 'sent' }, { column: 's', operator: 'eq', value: 'pending' })).toBe(false));
		it('number as string', () => expect(evaluateCondition({ n: 5 }, { column: 'n', operator: 'eq', value: '5' })).toBe(true));
	});
	describe('neq', () => {
		it('differ', () => expect(evaluateCondition({ s: 'sent' }, { column: 's', operator: 'neq', value: 'pending' })).toBe(true));
		it('same', () => expect(evaluateCondition({ s: 'pending' }, { column: 's', operator: 'neq', value: 'pending' })).toBe(false));
	});
	describe('gt', () => {
		it('greater', () => expect(evaluateCondition({ n: 10 }, { column: 'n', operator: 'gt', value: '5' })).toBe(true));
		it('equal', () => expect(evaluateCondition({ n: 5 }, { column: 'n', operator: 'gt', value: '5' })).toBe(false));
		it('less', () => expect(evaluateCondition({ n: 3 }, { column: 'n', operator: 'gt', value: '5' })).toBe(false));
	});
	describe('gte', () => {
		it('greater', () => expect(evaluateCondition({ n: 10 }, { column: 'n', operator: 'gte', value: '5' })).toBe(true));
		it('equal', () => expect(evaluateCondition({ n: 5 }, { column: 'n', operator: 'gte', value: '5' })).toBe(true));
		it('less', () => expect(evaluateCondition({ n: 3 }, { column: 'n', operator: 'gte', value: '5' })).toBe(false));
	});
	describe('lt', () => {
		it('less', () => expect(evaluateCondition({ n: 3 }, { column: 'n', operator: 'lt', value: '5' })).toBe(true));
		it('equal', () => expect(evaluateCondition({ n: 5 }, { column: 'n', operator: 'lt', value: '5' })).toBe(false));
		it('greater', () => expect(evaluateCondition({ n: 10 }, { column: 'n', operator: 'lt', value: '5' })).toBe(false));
	});
	describe('lte', () => {
		it('less', () => expect(evaluateCondition({ n: 3 }, { column: 'n', operator: 'lte', value: '5' })).toBe(true));
		it('equal', () => expect(evaluateCondition({ n: 5 }, { column: 'n', operator: 'lte', value: '5' })).toBe(true));
		it('greater', () => expect(evaluateCondition({ n: 10 }, { column: 'n', operator: 'lte', value: '5' })).toBe(false));
	});
	describe('in', () => {
		it('in list', () => expect(evaluateCondition({ s: 'pending' }, { column: 's', operator: 'in', value: 'pending,sent,draft' })).toBe(true));
		it('not in list', () => expect(evaluateCondition({ s: 'archived' }, { column: 's', operator: 'in', value: 'pending,sent,draft' })).toBe(false));
		it('handles spaces', () => expect(evaluateCondition({ s: 'sent' }, { column: 's', operator: 'in', value: 'pending , sent , draft' })).toBe(true));
		it('numeric', () => expect(evaluateCondition({ n: 2 }, { column: 'n', operator: 'in', value: '1,2,3' })).toBe(true));
	});
	describe('is', () => {
		it('null: null value', () => expect(evaluateCondition({ d: null }, { column: 'd', operator: 'is', value: 'null' })).toBe(true));
		it('null: undefined', () => expect(evaluateCondition({}, { column: 'd', operator: 'is', value: 'null' })).toBe(true));
		it('null: real value', () => expect(evaluateCondition({ d: '2026-01-01' }, { column: 'd', operator: 'is', value: 'null' })).toBe(false));
		it('true: boolean true', () => expect(evaluateCondition({ b: true }, { column: 'b', operator: 'is', value: 'true' })).toBe(true));
		it('true: integer 1', () => expect(evaluateCondition({ b: 1 }, { column: 'b', operator: 'is', value: 'true' })).toBe(true));
		it('true: string "1"', () => expect(evaluateCondition({ b: '1' }, { column: 'b', operator: 'is', value: 'true' })).toBe(true));
		it('true: string "true"', () => expect(evaluateCondition({ b: 'true' }, { column: 'b', operator: 'is', value: 'true' })).toBe(true));
		it('true: false is not true', () => expect(evaluateCondition({ b: false }, { column: 'b', operator: 'is', value: 'true' })).toBe(false));
		it('true: 0 is not true', () => expect(evaluateCondition({ b: 0 }, { column: 'b', operator: 'is', value: 'true' })).toBe(false));
		it('false: boolean false', () => expect(evaluateCondition({ b: false }, { column: 'b', operator: 'is', value: 'false' })).toBe(true));
		it('false: integer 0', () => expect(evaluateCondition({ b: 0 }, { column: 'b', operator: 'is', value: 'false' })).toBe(true));
		it('false: string "0"', () => expect(evaluateCondition({ b: '0' }, { column: 'b', operator: 'is', value: 'false' })).toBe(true));
		it('false: string "false"', () => expect(evaluateCondition({ b: 'false' }, { column: 'b', operator: 'is', value: 'false' })).toBe(true));
		it('false: true is not false', () => expect(evaluateCondition({ b: true }, { column: 'b', operator: 'is', value: 'false' })).toBe(false));
		it('false: 1 is not false', () => expect(evaluateCondition({ b: 1 }, { column: 'b', operator: 'is', value: 'false' })).toBe(false));
		it('unknown value', () => expect(evaluateCondition({ b: true }, { column: 'b', operator: 'is', value: 'maybe' })).toBe(false));
	});
});

describe('rowMatchesConditions', () => {
	describe('empty conditions', () => {
		it('AND: always true', () => expect(rowMatchesConditions({ s: 'x' }, [], 'AND')).toBe(true));
		it('OR: always true', () => expect(rowMatchesConditions({ s: 'x' }, [], 'OR')).toBe(true));
	});
	describe('single condition', () => {
		const c: FilterCondition = { column: 'status', operator: 'eq', value: 'pending' };
		it('AND match', () => expect(rowMatchesConditions({ status: 'pending' }, [c], 'AND')).toBe(true));
		it('AND no match', () => expect(rowMatchesConditions({ status: 'sent' }, [c], 'AND')).toBe(false));
		it('OR match', () => expect(rowMatchesConditions({ status: 'pending' }, [c], 'OR')).toBe(true));
		it('OR no match', () => expect(rowMatchesConditions({ status: 'sent' }, [c], 'OR')).toBe(false));
	});
	describe('AND logic', () => {
		const conditions: FilterCondition[] = [
			{ column: 'status', operator: 'eq', value: 'pending' },
			{ column: 'language', operator: 'eq', value: 'english' },
		];
		it('all match', () => expect(rowMatchesConditions({ status: 'pending', language: 'english' }, conditions, 'AND')).toBe(true));
		it('first fails', () => expect(rowMatchesConditions({ status: 'sent', language: 'english' }, conditions, 'AND')).toBe(false));
		it('second fails', () => expect(rowMatchesConditions({ status: 'pending', language: 'serbian' }, conditions, 'AND')).toBe(false));
		it('both fail', () => expect(rowMatchesConditions({ status: 'sent', language: 'serbian' }, conditions, 'AND')).toBe(false));
	});
	describe('OR logic', () => {
		const conditions: FilterCondition[] = [
			{ column: 'status', operator: 'eq', value: 'pending' },
			{ column: 'language', operator: 'eq', value: 'english' },
		];
		it('both match', () => expect(rowMatchesConditions({ status: 'pending', language: 'english' }, conditions, 'OR')).toBe(true));
		it('only first', () => expect(rowMatchesConditions({ status: 'pending', language: 'serbian' }, conditions, 'OR')).toBe(true));
		it('only second', () => expect(rowMatchesConditions({ status: 'sent', language: 'english' }, conditions, 'OR')).toBe(true));
		it('none match', () => expect(rowMatchesConditions({ status: 'sent', language: 'serbian' }, conditions, 'OR')).toBe(false));
	});
	describe('real-world scenarios', () => {
		it('pending english outreach triggers', () => {
			const c: FilterCondition[] = [
				{ column: 'status', operator: 'eq', value: 'pending' },
				{ column: 'language', operator: 'eq', value: 'english' },
			];
			expect(rowMatchesConditions({ company: 'Supabase', status: 'pending', language: 'english' }, c, 'AND')).toBe(true);
		});
		it('high-priority company triggers regardless of status (OR)', () => {
			const c: FilterCondition[] = [
				{ column: 'status', operator: 'eq', value: 'pending' },
				{ column: 'company', operator: 'in', value: 'Linear,PostHog,Supabase' },
			];
			expect(rowMatchesConditions({ company: 'Linear', status: 'sent' }, c, 'OR')).toBe(true);
		});
		it('low-priority sent row does not trigger (OR)', () => {
			const c: FilterCondition[] = [
				{ column: 'status', operator: 'eq', value: 'pending' },
				{ column: 'company', operator: 'in', value: 'Linear,PostHog,Supabase' },
			];
			expect(rowMatchesConditions({ company: 'RandomCorp', status: 'sent' }, c, 'OR')).toBe(false);
		});
		it('triggers when deleted_at is null', () => {
			const c: FilterCondition[] = [{ column: 'deleted_at', operator: 'is', value: 'null' }];
			expect(rowMatchesConditions({ company: 'Supabase', deleted_at: null }, c, 'AND')).toBe(true);
		});
		it('does not trigger for soft-deleted rows', () => {
			const c: FilterCondition[] = [{ column: 'deleted_at', operator: 'is', value: 'null' }];
			expect(rowMatchesConditions({ company: 'Supabase', deleted_at: '2026-04-24' }, c, 'AND')).toBe(false);
		});
		it('triggers for is_active=1 (integer)', () => {
			const c: FilterCondition[] = [{ column: 'is_active', operator: 'is', value: 'true' }];
			expect(rowMatchesConditions({ company: 'PostHog', is_active: 1 }, c, 'AND')).toBe(true);
		});
		it('does not trigger for is_active=0 (integer)', () => {
			const c: FilterCondition[] = [{ column: 'is_active', operator: 'is', value: 'true' }];
			expect(rowMatchesConditions({ company: 'PostHog', is_active: 0 }, c, 'AND')).toBe(false);
		});
	});
});
