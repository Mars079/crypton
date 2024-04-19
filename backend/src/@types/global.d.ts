namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string
    JWT_EXPIRY: string
    JWT_EXPIRY_REF: string
    JWT_SECRET: string
    JWT_SECRET_REF: string
    SES_ACCESS: string
    SES_SECRET: string
    SES_REGION: string
    TEST_ENV: string
    APP_MAIL: string
    MAX_REFRESH: number
    MAX_ACCESS: number
    PORT: number
  }
}
