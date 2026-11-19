'use client'

import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient()

export const { signIn, signUp, signOut, useSession, sendVerificationEmail, verifyEmail } = {
  signIn: authClient.signIn,
  signUp: authClient.signUp,
  signOut: authClient.signOut,
  useSession: authClient.useSession,
  sendVerificationEmail: authClient.sendVerificationEmail,
  verifyEmail: authClient.verifyEmail,
}
