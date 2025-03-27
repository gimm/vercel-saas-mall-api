import { Hono } from 'hono';
import { supabase } from '../../config/supabase.js';

const user = new Hono();

// Get all users
user.get('/', async (c) => {
  try {
    const { data, error } = await supabase.from("users").select("*");

    // Handle error fetching from Supabase
    if (error) {
      console.error('Error fetching users:', error);
      return c.json({ message: error.message }, 500);
    }

    // Handle case where no users exist
    if (!data || data.length === 0) {
      return c.json({ message: 'No users found' }, 404);
    }

    // Successfully return users data
    return c.json(data, 200);
  } catch (error) {
    console.error('Internal server error:', error);
    return c.json({ message: 'Internal server error' }, 500);
  }
});


// Get a user by ID
user.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error(`Error fetching user with ID ${id}:`, error);
      return c.json({ message: error.message }, 500);
    }

    if (!data) {
      return c.json({ message: `User with ID ${id} not found` }, 404);
    }

    return c.json(data, 200);
  } catch (error) {
    console.error('Internal server error:', error);
    return c.json({ message: 'Internal server error' }, 500);
  }
});

// Sign up (Create a new user)
user.post('/signup', async (c) => {
  try {
    const { name, email, password } = await c.req.json();

    // Input validation
    if (!name || !email || !password) {
      return c.json({ message: 'Name, email, and password are required' }, 400);
    }

    // Check if email exists
    const { data: existingUsers } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUsers?.email) {
      return c.json({ message: 'Email already exists' }, 400);
    }

    // Generate token
    const token = `token_${Date.now()}`;

    // Insert user data
    const { data: createdUser, error } = await supabase
      .from("users")
      .insert([{
        name,
        email,
        password, // Note: In production, you should hash passwords
        token
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return c.json({ message: error.message }, 500);
    }

    return c.json({ 
      message: 'User created', 
      user: createdUser
    }, 201);
  } catch (error) {
    console.error('Internal server error:', error);
    return c.json({ message: 'Internal server error' }, 500);
  }
});

// Login (User login)
user.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ message: 'Email and password are required' }, 400);
    }

    const { data: userData, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .eq("password", password) // Note: In production, you should hash passwords
      .single();

    if (error || !userData) {
      console.error('Login error:', error);
      return c.json({ message: 'Invalid email or password' }, 401);
    }

    // Update token
    const token = `token_${Date.now()}`;

    const { error: updateError } = await supabase
      .from("users")
      .update({ token })
      .eq("id", userData.id);

    if (updateError) {
      console.error('Token update error:', updateError);
      return c.json({ message: 'Error updating token' }, 500);
    }

    return c.json({ 
      message: 'Login successful', 
      token: token,
      name: userData.name, 
      userId: userData.id,
    }, 200);
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ message: 'Internal server error' }, 500);
  }
});

// User logout
user.post('/logout', async (c) => {
  try {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return c.json({ message: 'Authentication required' }, 401);
    }

    // Clear token in database
    const { error } = await supabase
      .from("users")
      .update({ token: null })
      .eq("token", token);

    if (error) {
      console.error('Logout error:', error);
      return c.json({ message: error.message }, 500);
    }

    return c.json({ message: 'Logout successful' }, 200);
  } catch (error) {
    console.error('Logout error:', error);
    return c.json({ message: 'Internal server error' }, 500);
  }
});

// Get current user profile
user.get('/profile/me', async (c) => {
  try {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return c.json({ message: 'Authentication required' }, 401);
    }

    const { data: userData, error } = await supabase
      .from("users")
      .select("id, name, email, created_at, updated_at")
      .eq("token", token)
      .single();

    if (error || !userData) {
      return c.json({ message: 'Invalid or expired token' }, 401);
    }

    return c.json({ user: userData }, 200);
  } catch (error) {
    console.error('Profile fetch error:', error);
    return c.json({ message: 'Internal server error' }, 500);
  }
});

export default user;
