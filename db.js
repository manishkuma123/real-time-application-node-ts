const mongoose = require('mongoose');
let db =  "mongodb+srv://manishpdotpitchtechnologies_db_user:gNXocYdQAZmHV28H@cluster0.wzbzone.mongodb.net/?appName=Cluster0"
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(db);
    console.log(`✅ MongoDB Connected: `);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1); 
  }
};

module.exports = connectDB;
