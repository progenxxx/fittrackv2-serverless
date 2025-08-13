// Test script you can run locally
const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://rianna232321:ucdyYdpPNLOb5IlW@cluster0.ak56qgq.mongodb.net/fittrack?retryWrites=true&w=majority&appName=Cluster0&maxPoolSize=1&serverSelectionTimeoutMS=10000&socketTimeoutMS=45000&connectTimeoutMS=10000&heartbeatFrequencyMS=30000&family=4&maxIdleTimeMS=30000";

async function testConnection() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected successfully!');
        
        // Test a simple query
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));
        
        await mongoose.disconnect();
        console.log('✅ Disconnected successfully!');
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
    }
}

testConnection();