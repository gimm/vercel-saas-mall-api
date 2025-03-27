import 'dotenv/config'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import productRoutes from './app/routes/product.js'
import cartRoutes from './app/routes/cart.js'
import userRoutes from './app/routes/user.js'
import orderRoutes from './app/routes/order.js'
import categoryRoutes from './app/routes/category.js'

const app = new Hono()

// CORS Options
const corsOptions = {
    origin: '*',  
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Origin', 'Content-Type', 'Accept', 'Authorization']
}

// Middleware
app.use('*', logger()) // Log incoming requests
app.use('*', cors(corsOptions)) // Enable CORS with the defined options

// API Route Group
const api = new Hono()

// Mount module routes
api.route('/products', productRoutes) // Mount productRoutes to /api/products route
api.route('/cart', cartRoutes) // Mount cartRoutes to /api/cart route
api.route('/user', userRoutes) // Mount userRoutes to /api/user route
api.route('/order', orderRoutes) // Mount orderRoutes to /api/order route
api.route('/category', categoryRoutes) // Mount orderRoutes to /api/order route

// Mount API Routes
app.route('/api', api) // Mount the API routes under /api

// Start the server
const port = process.env.PORT || 3000

serve({
    fetch: app.fetch,
    port: port
}, (info) => {
    console.log(`Server is running on port ${info.port}`)
})
