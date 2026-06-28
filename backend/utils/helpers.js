import bcrypt from 'bcryptjs'

const BCRYPT_ROUNDS = 10

const parseNumber = (value, fallback = 0) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

const isBcryptHash = (value) => typeof value === 'string' && value.startsWith('$2')

const hashPassword = (plain) => bcrypt.hashSync(plain, BCRYPT_ROUNDS)

const ensureHashedPassword = (raw) => {
    if (!raw) return ''
    return isBcryptHash(raw) ? raw : hashPassword(raw)
}

const todayIsoDate = () => new Date().toISOString().split('T')[0]

const getAdminUsername = () => (process.env.ADMIN_USERNAME || '').trim().toLowerCase()
const getAdminPassword = () => process.env.ADMIN_PASSWORD || ''

export{
    parseNumber,
    hashPassword,
    ensureHashedPassword,
    todayIsoDate,
    getAdminUsername,
    getAdminPassword,
}