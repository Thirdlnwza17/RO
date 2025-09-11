
import { MongoClient, ServerApiVersion } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable in .env.local');
}

const uri = process.env.MONGODB_URI;
const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  maxPoolSize: 10, // Maximum number of connections in the connection pool
  connectTimeoutMS: 10000, // Time to wait for a connection to be established
  socketTimeoutMS: 45000, // Time to wait for a response
};

let client;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable to preserve the connection across hot-reloads
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    try {
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect();
      // Add error listeners
      client.on('error', (err) => {
        console.error('MongoDB client error:', err);
      });
    } catch (error) {
      console.error('Failed to create MongoDB client:', error);
      throw error;
    }
  }
  clientPromise = globalWithMongo._mongoClientPromise!;
} else {
  // In production mode, avoid using a global variable
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Export the client promise for use in API routes
export default clientPromise;
