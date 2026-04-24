import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SupabaseRealtimeApi implements ICredentialType {
	name = 'supabaseRealtimeApi';
	displayName = 'Supabase Realtime API';
	// eslint-disable-next-line n8n-nodes-base/cred-class-field-documentation-url-miscased
	documentationUrl = 'https://supabase.com/docs/guides/realtime';
	properties: INodeProperties[] = [
		{
			displayName: 'Project URL',
			name: 'projectUrl',
			type: 'string',
			default: '',
			placeholder: 'https://your-project.supabase.co',
			required: true,
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Use the &lt;strong&gt;service_role&lt;/strong&gt; key (found in Supabase → Settings → API). The anon key will not receive INSERT/UPDATE events if Row Level Security is enabled on the table, which is the default for all Supabase tables.',
			required: true,
		},
	];
}
