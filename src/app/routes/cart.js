import { Hono } from 'hono'
import { supabase } from '../../config/supabase.js'

const cart = new Hono()

// Get cart items by user ID
cart.get('/', async (c) => {
  try {
    const user_id = c.req.query('user_id');

    if (!user_id) {
      return c.json({ message: 'User ID is required' }, 400);
    }

    console.log("Fetching cart for user:", user_id); // Debugging log

    // Fetch cart items for the given user
    const { data: cartItems, error: cartError } = await supabase
      .from("cart")
      .select("*")
      .eq("user_id", user_id);

    if (cartError) {
      console.error('Error fetching cart:', cartError);
      return c.json({ message: cartError.message }, 500);
    }

    if (!cartItems || cartItems.length === 0) {
      return c.json({ message: 'No items in cart' }, 404);
    }

    // Get all product IDs from the cart items
    const productIds = cartItems.map(item => item.product_id);

    console.log("Fetching product details for product_ids:", productIds); // Debugging log

    // Fetch the product details using product_ids
    const { data: products, error: productError } = await supabase
      .from("products")
      .select("*")
      .in("id", productIds);

    if (productError) {
      console.error('Error fetching products:', productError);
      return c.json({ message: productError.message }, 500);
    }

    // Merge cart items with product details
    const cartWithProducts = cartItems.map(item => {
      const product = products.find(p => p.id === item.product_id);
      return {
        ...item,
        product: product || null, // Include the product details in the cart item
      };
    });

    console.log("Final cart data with product details:", cartWithProducts); // Debugging log

    return c.json({ code: 200, body: cartWithProducts }, 200);

  } catch (error) {
    console.error('Internal server error:', error);
    return c.json({ message: 'Internal server error' }, 500);
  }
});



// Add item to cart
cart.post('/add', async (c) => {
  try {
    const { user_id, product_id, quantity } = await c.req.json()

    if (!user_id || !product_id || !quantity) {
      return c.json({ message: 'Missing required fields' }, 400)
    }

    // Check if item exists in the cart
    const { data: existingItem, error: fetchError } = await supabase
    .from("cart")
    .select("*")
    .eq("user_id", user_id) // Ensure data types match here
    .eq("product_id", product_id)
    .maybeSingle()

    if (fetchError) {
      console.error('Error fetching cart item:', fetchError)
      return c.json({ message: fetchError.message }, 500)
    }

    if (existingItem) {
      // Update quantity if item exists
      const { data: updatedItem, error: updateError } = await supabase
        .from("cart")
        .update({ quantity: existingItem.quantity + quantity })
        .eq("user_id", user_id)
        .eq("product_id", product_id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating cart item:', updateError)
        return c.json({ message: updateError.message }, 500)
      }

      return c.json({ code: 200, message: 'Item quantity updated', body: updatedItem }, 200)
    } else {
      // Insert new item if it doesn't exist
      const { data: newItem, error: insertError } = await supabase
        .from("cart")
        .insert([{ user_id, product_id, quantity }])
        .select()
        .single()

      if (insertError) {
        console.error('Error inserting cart item:', insertError)
        return c.json({ message: insertError.message }, 500)
      }

      return c.json({ code: 200, message: 'Item added to cart', body: newItem }, 200)
    }
  } catch (error) {
    console.error('Internal server error:', error)
    return c.json({ message: 'Internal server error' }, 500)
  }
})

// Decrease item quantity in cart
cart.post('/minus', async (c) => {
  try {
    const { user_id, product_id, quantity } = await c.req.json();

    if (!user_id || !product_id || !quantity) {
      return c.json({ message: 'Missing required fields' }, 400);
    }

    // Check if item exists in cart
    const { data: item, error: fetchError } = await supabase
      .from("cart")
      .select("quantity")
      .eq("user_id", user_id)
      .eq("product_id", product_id)
      .maybeSingle();

    if (fetchError) return c.json({ message: fetchError.message }, 500);
    if (!item) return c.json({ message: 'Item not found' }, 404);

    // Remove item if quantity is zero or less
    if (item.quantity <= quantity) {
      const { error: deleteError } = await supabase
        .from("cart")
        .delete()
        .eq("user_id", user_id)
        .eq("product_id", product_id);

      return deleteError
        ? c.json({ message: deleteError.message }, 500)
        : c.json({ message: 'Item removed', code: 200 }, 200);
    }

    // Decrease quantity
    const { data: updatedItem, error: updateError } = await supabase
      .from("cart")
      .update({ quantity: item.quantity - quantity })
      .eq("user_id", user_id)
      .eq("product_id", product_id)
      .select()
      .single();

    return updateError
      ? c.json({ message: updateError.message }, 500)
      : c.json({ message: 'Quantity decreased', body: updatedItem, code: 200 }, 200);

  } catch (error) {
    console.error('Server error:', error);
    return c.json({ message: 'Internal server error' }, 500);
  }
});


// Remove item from cart
cart.post('/remove', async (c) => {
  try {
    const { user_id, product_id } = await c.req.json(); // Use correct naming

    if (!user_id || !product_id) {
      return c.json({ message: 'Missing required fields' }, 400);
    }

    // Delete item from cart
    const { error } = await supabase
      .from("cart")
      .delete()
      .eq("user_id", user_id) // Ensure correct column names
      .eq("product_id", product_id);

    if (error) {
      console.error('Error removing cart item:', error);
      return c.json({ message: error.message }, 500);
    }

    return c.json({ code: 200, message: 'Item removed from cart' }, 200);

  } catch (error) {
    console.error('Internal server error:', error);
    return c.json({ message: 'Internal server error' }, 500);
  }
});


// Clear entire cart for a user
cart.post('/clear', async (c) => {
  try {
    const { user_id } = await c.req.json(); // Ensure correct naming

    if (!user_id) {
      return c.json({ message: 'User ID is required' }, 400);
    }

    // Delete all cart items for the user
    const { error } = await supabase
      .from("cart")
      .delete()
      .eq("user_id", user_id); // Correct column name

    if (error) {
      console.error('Error clearing cart:', error);
      return c.json({ message: error.message }, 500);
    }

    return c.json({ code: 200, message: 'Cart cleared successfully' }, 200);

  } catch (error) {
    console.error('Internal server error:', error);
    return c.json({ message: 'Internal server error' }, 500);
  }
});


// Remove checked-out items from cart
cart.post('/remove-checkout', async (c) => {
  try {
    const { items } = await c.req.json()

    if (!items || !Array.isArray(items)) {
      return c.json({ message: 'Invalid request format' }, 400)
    }

    for (const item of items) {
      const { userId, productId } = item

      const { error } = await supabase
        .from("cart")
        .delete()
        .eq("userId", userId)
        .eq("productId", productId)

      if (error) {
        console.error(`Error removing checked-out item (userId: ${userId}, productId: ${productId}):`, error)
      }
    }

    return c.json({ code: 200, message: 'Checked-out items removed from cart' }, 200)
  } catch (error) {
    console.error('Internal server error:', error)
    return c.json({ message: 'Internal server error' }, 500)
  }
})

export default cart
