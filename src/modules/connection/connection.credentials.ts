export type TelegramCredentials = {
    provider: 'telegram';
    bot_token: string;
    chat_id: string;
};

export type SlackCredentials = {
    provider: 'slack';
    webhook_url: string;
};

export type EmailCredentials = {
    provider: 'email';
    address: string;
};

export type ConnectionCredentials =
    | TelegramCredentials
    | SlackCredentials
    | EmailCredentials;
