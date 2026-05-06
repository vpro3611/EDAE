import { z } from 'zod';

export const ConnectionCredentialsSchema = z.union([
    z.object({ provider: z.literal('telegram'), bot_token: z.string().min(1), chat_id: z.string().min(1) }),
    z.object({
        provider: z.literal('slack'),
        webhook_url: z.string().url().optional(),
        bot_token: z.string().min(1).optional(),
        channel_id: z.string().min(1).optional(),
    }).refine(
        d => d.webhook_url || (d.bot_token && d.channel_id),
        { message: 'Must provide webhook_url or both bot_token and channel_id.' },
    ),
    z.object({ provider: z.literal('email'), address: z.string().email() }),
]);
