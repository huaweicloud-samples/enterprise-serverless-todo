// Authentication functions (JWT) - Huawei Cloud replacement for Cognito
// Register, Login, Token validation

const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const { DB_URI, JWT_SECRET, REGION } = process.env;

let client = null;

async function getClient() {
  if (!client) {
    client = new MongoClient(DB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    await client.connect();
  }
  return client;
}

const response = (statusCode, body, additionalHeaders = {}) => ({
  statusCode,
  body: JSON.stringify(body),
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,HEAD,GET,PUT,POST,DELETE',
    ...additionalHeaders,
  },
});

// POST /auth/register
exports.register = async (event, context) => {
  console.log('register invoked');

  if (event.httpMethod !== 'POST' || !event.body) {
    return response(400, { message: 'Invalid request' });
  }

  try {
    const { email, password } = JSON.parse(event.body);

    if (!email || !password) {
      return response(400, { message: 'Email and password are required' });
    }

    if (password.length < 6) {
      return response(400, { message: 'Password must be at least 6 characters' });
    }

    const mongoClient = await getClient();
    const usersCollection = mongoClient.db().collection('users');

    // Check if user exists
    const existing = await usersCollection.findOne({ email });
    if (existing) {
      return response(409, { message: 'User already exists' });
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      email,
      password: hashedPassword,
      created_at: new Date().toISOString(),
    };

    await usersCollection.insertOne(user);

    // Generate JWT
    const token = jwt.sign(
      { sub: email, email, region: REGION },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return response(200, { token, user: { email } });
  } catch (err) {
    console.error('Error:', err.message);
    return response(500, { message: err.message });
  }
};

// POST /auth/login
exports.login = async (event, context) => {
  console.log('login invoked');

  if (event.httpMethod !== 'POST' || !event.body) {
    return response(400, { message: 'Invalid request' });
  }

  try {
    const { email, password } = JSON.parse(event.body);

    if (!email || !password) {
      return response(400, { message: 'Email and password are required' });
    }

    const mongoClient = await getClient();
    const usersCollection = mongoClient.db().collection('users');

    const user = await usersCollection.findOne({ email });
    if (!user) {
      return response(401, { message: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return response(401, { message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { sub: email, email, region: REGION },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return response(200, { token, user: { email: user.email } });
  } catch (err) {
    console.error('Error:', err.message);
    return response(500, { message: err.message });
  }
};
