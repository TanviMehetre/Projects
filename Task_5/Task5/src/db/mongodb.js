const { MongoClient } = require('mongodb');

const connectionURL = 'mongodb://127.0.0.1:27017';
const databaseName = 'Task5';

let clientInstance = null;
let dbInstance = null;

async function connectDB() {
    if (dbInstance) return dbInstance;

    try {
        clientInstance = new MongoClient(connectionURL, {
            serverSelectionTimeoutMS: 1000,
        });
        await clientInstance.connect();
        console.log("Connected Successfully!");

        dbInstance = clientInstance.db(databaseName);

        clientInstance.on('close', () => {
            console.error('MongoDB connection closed!');
            dbInstance = null;
        });

        clientInstance.on('error', (err) => {
            console.error('MongoDB client error:', err);
            dbInstance = null;
        });

        return dbInstance;
    } catch (e) {
        console.error('Failed to connect to MongoDB:', e);
        console.log('Database is currently disconnected. Please try again later.');
        return null;
    }
}

module.exports = connectDB;