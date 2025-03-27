import { Hono } from 'hono';
import { supabase } from '../../config/supabase.js'; // Assuming you have Supabase setup

const order = new Hono();

// Add Order
order.post('/add', async (c) => {
  try {
    // Changed to match the request structure - accepting pay_type instead of paymentMethod
    const { user_id, pay_type, total, items, status } = await c.req.json();

    if (!user_id || !pay_type || !total || !items) {
      return c.json({ message: 'Missing required fields' }, 400);
    }

    // Get the maximum order_id from the entire orders table
    const { data: maxOrderResult, error: maxOrderError } = await supabase
      .from('orders')
      .select('order_id')
      .order('order_id', { ascending: false })
      .limit(1);
      
    if (maxOrderError) {
      console.error('Error fetching max order ID:', maxOrderError.message);
      return c.json({ message: 'Error fetching order information', error: maxOrderError.message }, 500);
    }

    // Calculate the next order_id
    const order_id = maxOrderResult.length > 0 ? maxOrderResult[0].order_id + 1 : 1;

    const { data: orderData, error: orderInsertError } = await supabase
      .from('orders')
      .insert([{
        order_id,
        user_id,
        pay_type, // Using pay_type directly from the request
        status: status || 'to-pay',
        total,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (orderInsertError) {
      console.error('Error inserting order:', orderInsertError.message);
      return c.json({ message: 'Error creating order', error: orderInsertError.message }, 500);
    }

    const orderDetails = items.map(item => ({
      order_id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      price: item.price,
      image: item.image,
    }));

    const { error: orderDetailsInsertError } = await supabase
      .from('order_details')
      .insert(orderDetails);

    if (orderDetailsInsertError) {
      console.error('Error inserting order details:', orderDetailsInsertError.message);
      return c.json({ message: 'Error adding order details', error: orderDetailsInsertError.message }, 500);
    }

    return c.json({ message: 'Order added successfully', body: orderData }, 201);
  } catch (error) {
    console.error('Internal server error:', error);
    return c.json({ message: 'Internal server error' }, 500);
  }
});

// Update Order Status
order.post('/update', async (c) => {
  try {
    const { user_id, order_id, status } = await c.req.json();

    if (!user_id || !order_id || !status) {
      return c.json({ message: 'Missing required fields' }, 400);
    }

    const { data: orderData, error: findOrderError } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user_id)
      .eq('order_id', order_id)
      .single();

    if (findOrderError || !orderData) {
      return c.json({ message: 'Order not found', error: findOrderError ? findOrderError.message : 'Order not found' }, 404);
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({ status })
      .eq('order_id', order_id)
      .eq('user_id', user_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating order:', updateError.message);
      return c.json({ message: 'Error updating order', error: updateError.message }, 500);
    }

    return c.json({ message: 'Order status updated', body: updatedOrder }, 200);
  } catch (error) {
    console.error('Internal server error:', error);
    return c.json({ message: 'Internal server error' }, 500);
  }
});

// Get Orders for a User
order.get('/', async (c) => {
  try {
    const { user_id } = c.req.query();

    if (!user_id) {
      return c.json({ message: 'User ID is required' }, 400);
    }

    const { data: orders, error: fetchOrdersError } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user_id);

    if (fetchOrdersError) {
      console.error('Error fetching orders:', fetchOrdersError.message);
      return c.json({ message: 'Error fetching orders', error: fetchOrdersError.message }, 500);
    }

    const { data: orderDetails, error: fetchOrderDetailsError } = await supabase
      .from('order_details')
      .select('*')
      .in('order_id', orders.map(order => order.order_id));

    if (fetchOrderDetailsError) {
      console.error('Error fetching order details:', fetchOrderDetailsError.message);
      return c.json({ message: 'Error fetching order details', error: fetchOrderDetailsError.message }, 500);
    }

    const enrichedOrders = orders.map(order => {
      const items = orderDetails.filter(od => od.order_id === order.order_id);
      return { ...order, items };
    });

    return c.json({ message: 'Orders fetched successfully', body: enrichedOrders }, 200);
  } catch (error) {
    console.error('Internal server error:', error);
    return c.json({ message: 'Internal server error' }, 500);
  }
});

export default order;