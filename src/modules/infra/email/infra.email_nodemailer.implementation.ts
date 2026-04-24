import * as nodemailer from 'nodemailer';
import { InfraEmailSenderInterface } from './infra.email_sender.interface';

export class InfraEmailNodemailerImplementation implements InfraEmailSenderInterface {
    private transporter: nodemailer.Transporter;

    constructor(
        private readonly host: string,
        private readonly port: number,
        private readonly user: string,
        private readonly pass: string,
    ) {
        this.transporter = nodemailer.createTransport({
            host: this.host,
            port: this.port,
            auth: { user: this.user, pass: this.pass },
        });
    }

    static create(host: string, port: number, user: string, pass: string): InfraEmailNodemailerImplementation {
        return new InfraEmailNodemailerImplementation(host, port, user, pass);
    }

    private async send(to: string, subject: string, text: string): Promise<void> {
        await this.transporter.sendMail({ from: this.user, to, subject, text });
    }

    async sendRegistrationOtp(to: string, otp: string): Promise<void> {
        await this.send(to, 'Verify your email', `Your verification code is: ${otp}\n\nIt expires in 15 minutes.`);
    }

    async sendPasswordResetOtp(to: string, otp: string): Promise<void> {
        await this.send(to, 'Reset your password', `Your password reset code is: ${otp}\n\nIt expires in 15 minutes.`);
    }

    async sendEmailChangeOtp(to: string, otp: string): Promise<void> {
        await this.send(to, 'Verify your new email', `Your email change verification code is: ${otp}\n\nIt expires in 15 minutes.`);
    }

    async sendAccountDeletionOtp(to: string, otp: string): Promise<void> {
        await this.send(to, 'Confirm account deletion', `Your account deletion code is: ${otp}\n\nIt expires in 15 minutes.`);
    }
}
