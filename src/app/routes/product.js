import { Hono } from 'hono'
import { supabase } from '../../config/supabase.js'

const product = new Hono()

// Get all products
product.get('/', async (c) => {
  try {
    const { data, error } = await supabase.from("products").select("*")

    if (error) {
      console.error('Error fetching products:', error)
      return c.json({ message: error.message }, 500)
    }

    if (!data || data.length === 0) {
      return c.json({ message: 'No products found' }, 404)
    }

    return c.json(data, 200)
  } catch (error) {
    console.error('Internal server error:', error)
    return c.json({ message: 'Internal server error' }, 500)
  }
})


// Get all products with categories
product.get('/prod_cat', async (c) => {
  try {
    console.log("Step 1: Fetching products from 'products' table...");
    const { data: products, error: productError } = await supabase
      .from("products")
      .select("*");

    if (productError) {
      console.error("Error fetching products:", productError);
      return c.json({ message: productError.message }, 500);
    }

    if (!products || products.length === 0) {
      console.log("No products found.");
      return c.json({ message: "No products found" }, 404);
    }

    console.log("Step 2: Fetching category IDs from 'product_categories' table...");
    const productIds = products.map(p => p.id); // Assuming product ID column is 'id'
    const { data: productCategories, error: categoryError } = await supabase
      .from("product_categories")
      .select("product_id, category_id")
      .in("product_id", productIds);

    if (categoryError) {
      console.error("Error fetching product categories:", categoryError);
      return c.json({ message: categoryError.message }, 500);
    }

    console.log("Fetched category IDs:", productCategories);

    console.log("Step 3: Fetching category names from 'categories' table...");
    const categoryIds = [...new Set(productCategories.map(pc => pc.category_id))]; // Get unique category IDs
    const { data: categories, error: categoriesError } = await supabase
      .from("categories")
      .select("id, name")
      .in("id", categoryIds);

    if (categoriesError) {
      console.error("Error fetching categories:", categoriesError);
      return c.json({ message: categoriesError.message }, 500);
    }

    console.log("Fetched category names:", categories);

    console.log("Step 4: Merging data...");
    const categoryMap = Object.fromEntries(categories.map(c => [c.id, c.name])); // Map category_id to category name

    const finalData = products.map(product => {
      const relatedCategories = productCategories
        .filter(pc => pc.product_id === product.id)
        .map(pc => categoryMap[pc.category_id] || "Unknown Category");

      return {
        ...product,
        categories: relatedCategories, // Adding category names to product info
      };
    });

    return c.json(finalData, 200);
  } catch (error) {
    console.error("Internal server error:", error);
    return c.json({ message: "Internal server error" }, 500);
  }
});







// Search products route - MOVED BEFORE the /:id route
product.get('/search', async (c) => {
  try {
    // Get the search query from the request URL parameters
    const query = c.req.query('query');
    console.log("Search query:", query); // Log the query value for debugging
    
    // Check if the query parameter exists
    if (!query) {
      return c.json({ message: 'Query parameter is required' }, 400);
    }

    // Log the query parameter to ensure it's being passed correctly
    console.log(`Searching for products with name containing: ${query}`);

    // Only searching in the name field using ilike for case-insensitive search
    const { data, error } = await supabase
      .from("products")
      .select("*") // Select all columns
      .ilike('name', `%${query}%`) // Search for query as substring in name field
      .limit(10); // Limit results to 10 products

    // Handle database query errors
    if (error) {
      console.error('Error searching products:', error);
      return c.json({ message: error.message }, 500);
    }

    // Handle case when no products are found
    if (!data || data.length === 0) {
      return c.json({ message: 'No products found' }, 404);
    }

    // Return the found products
    return c.json(data, 200);
  } catch (error) {
    // Handle any unexpected errors
    console.error('Internal server error:', error);
    return c.json({ message: 'Internal server error' }, 500);
  }
});

// Get a product by ID
product.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (error) {
      console.error(`Error fetching product with ID ${id}:`, error)
      return c.json({ message: error.message }, 500)
    }

    if (!data) {
      return c.json({ message: `Product with ID ${id} not found` }, 404)
    }

    return c.json(data, 200)
  } catch (error) {
    console.error('Internal server error:', error)
    return c.json({ message: 'Internal server error' }, 500)
  }
})

// Create a new product
product.post('/', async (c) => {
  try {
    const data = await c.req.json()

    const { data: createdProduct, error } = await supabase
      .from("products")
      .insert([data])
      .select()
      .single()

    if (error) {
      console.error('Error inserting product:', error)
      return c.json({ message: error.message }, 500)
    }

    return c.json({ message: 'Product created', createdProduct }, 201)
  } catch (error) {
    console.error('Internal server error:', error)
    return c.json({ message: 'Internal server error' }, 500)
  }
})

// Update a product by ID
product.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()

    const { data: updatedProduct, error } = await supabase
      .from("products")
      .update(data)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error(`Error updating product with ID ${id}:`, error)
      return c.json({ message: error.message }, 500)
    }

    if (!updatedProduct) {
      return c.json({ message: `Product with ID ${id} not found` }, 404)
    }

    return c.json({ message: 'Product updated', updatedProduct }, 200)
  } catch (error) {
    console.error('Internal server error:', error)
    return c.json({ message: 'Internal server error' }, 500)
  }
})

// Delete a product by ID
product.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id)

    if (error) {
      console.error(`Error deleting product with ID ${id}:`, error)
      return c.json({ message: error.message }, 500)
    }

    return c.json({ message: 'Product deleted' }, 200)
  } catch (error) {
    console.error('Internal server error:', error)
    return c.json({ message: 'Internal server error' }, 500)
  }
})



export default product