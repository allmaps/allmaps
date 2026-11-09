import { afterAll, describe, expect, it } from 'vitest'
import { getPgContext } from '@allmaps/db'
import { createAuth } from '@allmaps/db/auth'

describe('account linking policy', () => {
  const database = getPgContext('postgresql://test:test@localhost:5432/test')
  afterAll(() => database.close())

  const { auth } = createAuth(
    {
      BETTER_AUTH_URL: 'http://localhost:5499',
      BETTER_AUTH_SECRET: 'test-secret-for-account-linking-policy',
      BETTER_AUTH_COOKIE_PREFIX: 'account-linking-test'
    },
    database.db
  )

  it('enables automatic linking without bypassing email verification', () => {
    expect(auth.options.account.accountLinking).toMatchObject({
      enabled: true,
      disableImplicitLinking: false,
      trustedProviders: [],
      allowDifferentEmails: false
    })
  })

  it('preserves the existing profile and prevents removing the last login', () => {
    expect(auth.options.account.accountLinking).toMatchObject({
      updateUserInfoOnLink: false,
      allowUnlinkingAll: false
    })
  })
})
