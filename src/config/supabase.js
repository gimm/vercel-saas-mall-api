import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

console.log('Supabase URL:', process.env.SUPABASE_URL)
console.log('Supabase Key:', process.env.SUPABASE_ANON_KEY)


if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials')
}

export const supabase = createClient(supabaseUrl, supabaseKey)
