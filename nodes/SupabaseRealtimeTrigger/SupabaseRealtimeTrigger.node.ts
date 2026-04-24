import {
	ITriggerFunctions,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
	IDataObject,
} from 'n8n-workflow';

import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { evaluateCondition, rowMatchesConditions, FilterCondition } from './utils';

export class SupabaseRealtimeTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Supabase Realtime Trigger',
		name: 'supabaseRealtimeTrigger',
		icon: 'file:supabase.svg',
		group: ['trigger'],
		version: 1,
		description: 'Triggers a workflow when rows are inserted, updated, or deleted in a Supabase table',
		defaults: {
			name: 'Supabase Realtime Trigger',
		},
		credentials: [
			{
				name: 'supabaseRealtimeApi',
				required: true,
			},
		],
		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Schema',
				name: 'schema',
				type: 'string',
				default: 'public',
				description: 'The Postgres schema to listen on',
				required: true,
			},
			{
				displayName: 'Table',
				name: 'table',
				type: 'string',
				default: '',
				placeholder: 'users',
				description: 'The table to listen on. Use * to listen on all tables in the schema.',
				required: true,
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: [
					{ name: 'Insert', value: 'INSERT' },
					{ name: 'Update', value: 'UPDATE' },
					{ name: 'Delete', value: 'DELETE' },
				],
				default: ['INSERT'],
				description: 'Which database events to listen for',
				required: true,
			},
			// ── Conditions ────────────────────────────────────────────────────────
			{
				displayName: 'Conditions',
				name: 'conditions',
				type: 'fixedCollection',
				placeholder: 'Add Condition',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				description:
					'Filter events by column values. Conditions are evaluated against the new row (or old row for DELETE). Leave empty to receive all events.',
				options: [
					{
						name: 'condition',
						displayName: 'Condition',
						values: [
							{
								displayName: 'Column',
								name: 'column',
								type: 'string',
								default: '',
								placeholder: 'status',
								description: 'The column name to filter on',
								required: true,
							},
							{
								displayName: 'Operator',
								name: 'operator',
								type: 'options',
								options: [
									{ name: 'Equals', value: 'eq' },
									{ name: 'Greater Than', value: 'gt' },
									{ name: 'Greater Than or Equal', value: 'gte' },
									{ name: 'In (Comma-Separated List)', value: 'in' },
									{ name: 'Is (Null / True / False)', value: 'is' },
									{ name: 'Less Than', value: 'lt' },
									{ name: 'Less Than or Equal', value: 'lte' },
									{ name: 'Not Equals', value: 'neq' },
								],
								default: 'eq',
								description: 'Comparison operator',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								placeholder: 'pending',
								description:
									'The value to compare against. For "In", provide comma-separated values. For "Is", use null, true, or false.',
							},
						],
					},
				],
			},
			{
				displayName: 'Combine Conditions With',
				name: 'conditionCombinator',
				type: 'options',
				options: [
					{ name: 'AND — All Conditions Must Match', value: 'AND' },
					{ name: 'OR — Any Condition Must Match', value: 'OR' },
				],
				default: 'AND',
				description: 'How multiple conditions are combined when more than one is defined',
			},
			// ── Advanced ──────────────────────────────────────────────────────────
			{
				displayName: 'Include Old Record on Update/Delete',
				name: 'includeOldRecord',
				type: 'boolean',
				default: false,
				description:
					'Whether to include the previous row values on UPDATE and DELETE events. Requires REPLICA IDENTITY FULL on the table.',
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const credentials = await this.getCredentials('supabaseRealtimeApi');
		const schema = this.getNodeParameter('schema', 0) as string;
		const table = this.getNodeParameter('table', 0) as string;
		const events = this.getNodeParameter('events', 0) as string[];
		const conditionsRaw = this.getNodeParameter('conditions', 0) as {
			condition?: FilterCondition[];
		};
		const conditionCombinator = (
			(this.getNodeParameter('conditionCombinator', 0) as string) || 'AND'
		) as 'AND' | 'OR';
		const includeOldRecord = this.getNodeParameter('includeOldRecord', 0) as boolean;

		const conditions: FilterCondition[] = conditionsRaw?.condition ?? [];

		const supabase = createClient(
			credentials.projectUrl as string,
			credentials.apiKey as string,
		);

		let channel: RealtimeChannel;

		const closeFunction = async () => {
			if (channel) {
				try {
					await supabase.removeChannel(channel);
				} catch (_) {
					// channel already removed or network gone; proceed to disconnect
				}
			}
			await supabase.realtime.disconnect();
		};

		const manualTriggerFunction = async () => {
			await new Promise<void>((resolve, reject) => {
				const timeout = setTimeout(async () => {
					if (channel) {
						await supabase.removeChannel(channel).catch(() => {});
					}
					await supabase.realtime.disconnect().catch(() => {});
					reject(
						new Error(
							'No event received within 30 seconds. Check that Realtime is enabled for this table in the Supabase dashboard.',
						),
					);
				}, 30000);

				channel = setupChannel(() => {
					clearTimeout(timeout);
					resolve();
				});
			});
		};

		const setupChannel = (onFirstEvent?: () => void): RealtimeChannel => {
			const useWildcard = events.length === 3;
			const eventList = useWildcard ? ['*'] : events;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const handlePayload = (payload: any) => {
				// For DELETE we check old (pk only); for INSERT/UPDATE we check new
				const rowToEvaluate: IDataObject =
					payload.eventType === 'DELETE'
						? (payload.old as IDataObject) ?? {}
						: (payload.new as IDataObject) ?? {};

				if (!rowMatchesConditions(rowToEvaluate, conditions, conditionCombinator)) {
					return;
				}

				const outputData: IDataObject = {
					eventType: payload.eventType,
					schema: payload.schema,
					table: payload.table,
					new: payload.new ?? null,
				};

				if (includeOldRecord) {
					outputData.old = payload.old ?? null;
				}

				if (payload.errors && payload.errors.length > 0) {
					outputData.errors = payload.errors;
				}

				this.emit([this.helpers.returnJsonArray([outputData])]);

				if (onFirstEvent) {
					onFirstEvent();
					onFirstEvent = undefined;
				}
			};

			// Sanitize user input to avoid invalid characters in the channel name
			const safeName = `n8n-${schema}-${table}-${Date.now()}`.replace(
				/[^a-zA-Z0-9_\-:.]/g,
				'_',
			);
			let ch = supabase.channel(safeName);

			for (const event of eventList) {
				const channelConfig: Record<string, unknown> = { event, schema, table };
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				ch = ch.on('postgres_changes' as any, channelConfig, handlePayload);
			}

			ch.subscribe((status: string) => {
				if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
					this.emitError(
						new Error(
							'Supabase Realtime subscription error. Check credentials and table Realtime settings.',
						),
					);
				}
			});

			return ch;
		};

		if (this.getMode() === 'trigger') {
			channel = setupChannel();
		}

		return {
			closeFunction,
			manualTriggerFunction,
		};
	}
}
