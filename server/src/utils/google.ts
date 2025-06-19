import { OAuth2Client } from 'google-auth-library'
import { config } from '../config/index.js'

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verified_email: boolean;
}

export class GoogleAuth {
  private static client = new OAuth2Client(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET
  )

  static async verifyIdToken (idToken: string): Promise<GoogleUserInfo> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: config.GOOGLE_CLIENT_ID
      })

      const payload = ticket.getPayload()
      if (!payload) {
        throw new Error('Invalid token payload')
      }

      return {
        id: payload.sub,
        email: payload.email!,
        name: payload.name!,
        picture: payload.picture,
        verified_email: payload.email_verified || false
      }
    } catch (error) {
      throw new Error('Invalid Google ID token')
    }
  }

  static async exchangeCodeForTokens (code: string, redirectUri: string) {
    try {
      const { tokens } = await this.client.getToken({
        code,
        redirect_uri: redirectUri
      })

      if (!tokens.id_token) {
        throw new Error('No ID token received')
      }

      return this.verifyIdToken(tokens.id_token)
    } catch (error) {
      throw new Error('Failed to exchange authorization code')
    }
  }
}
