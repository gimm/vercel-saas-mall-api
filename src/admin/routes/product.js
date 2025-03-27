import { Hono } from 'hono'

const product = new Hono()

product.get('/', (c) => {
    return c.json({
        products: [
            {
                id: 1,
                name: 'this is a product',
                price: 100,
                description: 'Product 1 description'
            }
        ]
    })
})


export default product