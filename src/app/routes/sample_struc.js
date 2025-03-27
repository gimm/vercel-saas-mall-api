import { Hono } from 'hono'
import { findUserByUsername, getAllUsers, updateUserToken, clearUserToken } from '../data/users.js'
import { verifyPassword, generateToken } from '../utils/auth.js'

const user = new Hono()

user.post('/login', async (c) => {
    try {
        const { username, password } = await c.req.json()

        // Validate request data
        if (!username || !password) {
            return c.json({
                code: 400,
                message: 'Username and password are required'
            }, 400)
        }

        // Find user
        const user = await findUserByUsername(username)
        if (!user) {
            return c.json({
                code: 401,
                message: 'Invalid credentials'
            }, 401)
        }

        // Verify password
        const isValidPassword = await verifyPassword(password, user.password)
        if (!isValidPassword) {
            return c.json({
                code: 401,
                message: 'Invalid credentials'
            }, 401)
        }

        // Generate token
        const token = await generateToken(user)

        // Save token to database
        await updateUserToken(user.id, token)

        // Set cookie
        c.cookie('token', token, {
            httpOnly: true,          // 防止 JavaScript 访问
            secure: process.env.NODE_ENV === 'production',  // 生产环境使用 HTTPS
            sameSite: 'Strict',      // CSRF 保护
            path: '/',               // Cookie 可用路径
            maxAge: 7 * 24 * 60 * 60  // 7天过期
        })

        // Return user info and token
        return c.json({
            code: 200,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    username: user.username
                }
            }
        })
    } catch (error) {
        console.error('Login error:', error)
        return c.json({
            code: 500,
            message: 'Internal server error'
        }, 500)
    }
})

user.get('/list', async (c) => {
    try {
        const page = parseInt(c.req.query('page')) || 1
        const pageSize = parseInt(c.req.query('pageSize')) || 10

        const { users, total } = await getAllUsers(page, pageSize)
        return c.json({
            code: 200,
            message: 'Users retrieved successfully',
            data: {
                total,
                page,
                pageSize,
                list: users
            }
        })
    } catch (error) {
        console.error('List users error:', error)
        return c.json({
            code: 500,
            message: 'Internal server error'
        }, 500)
    }
})

user.post('/logout', async (c) => {
    const token = c.req.cookie('token')

    if (token) {
        // 清除数据库中的 token
        await clearUserToken(token)
    }

    // 清除 cookie
    c.cookie('token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        path: '/',
        maxAge: 0
    })

    return c.json({
        code: 200,
        message: 'Logout successful'
    })
})

export default user