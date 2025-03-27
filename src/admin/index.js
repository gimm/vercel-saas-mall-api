import { Hono } from 'hono'
import userRoutes from './routes/user.js'
import productRoutes from './routes/product.js'

// APIs for admin console
const api = new Hono()


// 挂载模块路由
api.route('/users', userRoutes)
api.route('/products', productRoutes)

export default api