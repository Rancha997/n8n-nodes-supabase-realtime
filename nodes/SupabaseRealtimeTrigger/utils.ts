import { IDataObject } from 'n8n-workflow';

export type ConditionOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'is';

export interface FilterCondition {
	column: string;
	operator: ConditionOperator;
	value: string;
}

export function evaluateCondition(row: IDataObject, condition: FilterCondition): boolean {
	const raw = row[condition.column];
	const value = condition.value;

	switch (condition.operator) {
		case 'eq':
			// Loose equality is intentional: DB returns numbers (5), UI produces strings ("5").
			// Known side-effects: null == undefined → true, 0 == "" → true. Documented trade-off.
			// eslint-disable-next-line eqeqeq
			return raw == value;
		case 'neq':
			// eslint-disable-next-line eqeqeq
			return raw != value;
		case 'gt':
			return Number(raw) > Number(value);
		case 'gte':
			return Number(raw) >= Number(value);
		case 'lt':
			return Number(raw) < Number(value);
		case 'lte':
			return Number(raw) <= Number(value);
		case 'in':
			return value
				.split(',')
				.map((v) => v.trim())
				.includes(String(raw));
		case 'is':
			if (value === 'null') return raw === null || raw === undefined;
			// Normalize to boolean: actual true/false OR 1/0 integers OR 'true'/'false' strings
			if (value === 'true') return raw === true || raw === 1 || raw === '1' || raw === 'true';
			if (value === 'false') return raw === false || raw === 0 || raw === '0' || raw === 'false';
			return false;
		default:
			// Fail closed: unknown operators must never silently pass the condition.
			return false;
	}
}

export function rowMatchesConditions(
	row: IDataObject,
	conditions: FilterCondition[],
	combinator: 'AND' | 'OR',
): boolean {
	if (conditions.length === 0) return true;
	if (combinator === 'AND') {
		return conditions.every((c) => evaluateCondition(row, c));
	}
	return conditions.some((c) => evaluateCondition(row, c));
}
