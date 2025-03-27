import { Hono } from 'hono'
import { supabase } from '../../config/supabase.js'

const category = new Hono()

// Get all categories
category.get('/', async (c) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true }) // Sorting categories alphabetically
  
      if (error) {
        console.error('Error fetching categories:', error)
        return c.json({ message: error.message }, 500)
      }
  
      if (!data || data.length === 0) {
        return c.json({ message: 'No categories found' }, 404)
      }
  
      return c.json({ categories: data }, 200)
    } catch (error) {
      console.error('Internal server error:', error)
      return c.json({ message: 'Internal server error' }, 500)
    }
  })

// Get products by category slug
// Updated API endpoint for getting products by category slug
category.get('/:categorySlug/products', async (c) => {
  try {
    const categorySlug = c.req.param('categorySlug')

    // First get the category ID from the slug
    const { data: categoryData, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', categorySlug)
      .single()

    if (categoryError || !categoryData) {
      console.error('Error fetching category:', categoryError)
      return c.json({ message: 'Category not found' }, 404)
    }

    // Then get product IDs from the junction table
    const { data: productCategories, error: pcError } = await supabase
      .from('product_categories')
      .select('product_id')
      .eq('category_id', categoryData.id)

    if (pcError) {
      console.error('Error fetching product categories:', pcError)
      return c.json({ message: pcError.message }, 500)
    }

    if (!productCategories || productCategories.length === 0) {
      return c.json([], 200)
    }

    // Extract product IDs from the junction table results
    const productIds = productCategories.map(pc => pc.product_id)

    // Finally get the actual products
    const { data: products, error: productsError } = await supabase
      .from('products_data')
      .select('*')
      .in('id', productIds)

    if (productsError) {
      console.error('Error fetching products:', productsError)
      return c.json({ message: productsError.message }, 500)
    }

    return c.json(products || [], 200)
  } catch (error) {
    console.error('Internal server error:', error)
    return c.json({ message: 'Internal server error' }, 500)
  }
})

// Get all categories for a product
category.get('/product/:id', async (c) => {
  try {
    const productId = c.req.param('id')

    const { data, error } = await supabase
      .from('product_categories')
      .select(`
        category_id,
        categories ( id, name, slug )
      `)
      .eq('product_id', productId)

    if (error) {
      console.error(`Error fetching categories for product with ID ${productId}:`, error)
      return c.json({ message: error.message }, 500)
    }

    if (!data || data.length === 0) {
      return c.json({ message: `No categories found for product with ID ${productId}` }, 404)
    }

    return c.json(data.map(entry => entry.categories), 200)
  } catch (error) {
    console.error('Internal server error:', error)
    return c.json({ message: 'Internal server error' }, 500)
  }
})

// Get single category by slug
category.get('/:slug', async (c) => {
  try {
    const slug = c.req.param('slug')

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error) {
      console.error('Error fetching category:', error)
      return c.json({ message: error.message }, 404)
    }

    return c.json(data, 200)
  } catch (error) {
    console.error('Internal server error:', error)
    return c.json({ message: 'Internal server error' }, 500)
  }
})

// Get product IDs by category ID
category.get('/cat_prod/:categoryId', async (c) => {
  try {
    const categoryId = c.req.param('categoryId')
    console.log("Received categoryId:", categoryId);

    const { data, error } = await supabase
      .from('product_categories')
      .select('product_id')
      .eq('category_id', categoryId);

    console.log("Fetched data from Supabase:", data);

    if (error) {
      console.error('Error fetching product IDs:', error);
      return c.json({ message: error.message }, 500);
    }

    if (!data || data.length === 0) {
      console.log("No products found for category ID:", categoryId);
      return c.json({ message: 'No products found for the given category ID' }, 404);
    }

    return c.json(data.map(entry => entry.product_id), 200);
  } catch (error) {
    console.error('Internal server error:', error);
    return c.json({ message: 'Internal server error' }, 500);
  }
});


// Get products by category ID with full product info
category.get('/cat_prod_info/:categoryId', async (c) => {
  try {
    const categoryId = c.req.param('categoryId')
    console.log("Received categoryId:", categoryId);

    // First get product IDs for the category
    const { data: productIdsData, error: pcError } = await supabase
      .from('product_categories')
      .select('product_id')
      .eq('category_id', categoryId);

    if (pcError) {
      console.error('Error fetching product IDs:', pcError);
      return c.json({ message: pcError.message }, 500);
    }

    if (!productIdsData || productIdsData.length === 0) {
      console.log("No products found for category ID:", categoryId);
      return c.json({ message: 'No products found for the given category ID' }, 404);
    }

    // Extract product IDs
    const productIds = productIdsData.map(entry => entry.product_id);

    // Get full product information
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds);

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return c.json({ message: productsError.message }, 500);
    }

    return c.json(products || [], 200);
  } catch (error) {
    console.error('Internal server error:', error);
    return c.json({ message: 'Internal server error' }, 500);
  }
});


export default category
