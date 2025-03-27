import { supabase } from '../../config/supabase.js'
import bcrypt from 'bcryptjs'

// 生成 token（实际项目中应该使用 JWT）
export const generateToken = async (user) => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// 简单的密码验证
export const verifyPassword = async (inputPassword, hashedPassword) => {
    // console.log(inputPassword, hashedPassword, 'verifyPassword')
    return inputPassword === hashedPassword
    // return await bcrypt.compare(inputPassword, hashedPassword)
}

export const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10)
}