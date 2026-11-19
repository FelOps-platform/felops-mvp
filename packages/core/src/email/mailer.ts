import { loadEnv } from '@felops/config'

export type MailInput = {
  to: string
  subject: string
  text: string
  html?: string
}

export async function sendMail(input: MailInput): Promise<void> {
  const env = loadEnv()
  if (!env.RESEND_API_KEY) {
    console.info(
      JSON.stringify({
        level: 'info',
        type: 'email.dev',
        to: input.to,
        subject: input.subject,
        text: input.text,
      }),
    )
    return
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: env.RESEND_FROM,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  })
  if (!response.ok) {
    throw new Error(`Resend rejected the email (${response.status})`)
  }
}

export async function sendVerificationEmail(input: {
  to: string
  code: string
  url: string
}): Promise<void> {
  await sendMail({
    to: input.to,
    subject: 'Verify your Felops account',
    text: `Your Felops verification code is ${input.code}.\n\nOr open: ${input.url}`,
  })
}

export async function sendInvitationEmail(input: {
  to: string
  url: string
  workspaceName: string
}): Promise<void> {
  await sendMail({
    to: input.to,
    subject: `Join ${input.workspaceName} on Felops`,
    text: `You have been invited to join ${input.workspaceName} on Felops.\n\nAccept the invitation: ${input.url}\n\nThis link expires in 72 hours.`,
  })
}
