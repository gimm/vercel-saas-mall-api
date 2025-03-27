import { findUserByToken } from '../data/users.js'

export const authMiddleware = async (c, next) => {
    // 从 cookie 中获取 token
    const token = c.req.cookie('token')

    if (!token) {
        return c.json({
            code: 401,
            message: 'Authentication required'
        }, 401)
    }

    try {
        // 通过 token 查找用户
        const user = await findUserByToken(token)

        if (!user) {
            // token 无效，清除 cookie
            c.cookie('token', '', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Strict',
                path: '/',
                maxAge: 0
            })

            return c.json({
                code: 401,
                message: 'Invalid token'
            }, 401)
        }

        // 将用户信息添加到上下文
        c.set('user', user)
        await next()
    } catch (error) {
        console.error('Auth middleware error:', error)
        return c.json({
            code: 401,
            message: 'Invalid token'
        }, 401)
    }
}