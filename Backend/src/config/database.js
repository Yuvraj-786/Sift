const mongoose = require("mongoose");

let connectionPromise;

async function connectToDB() {
    if (mongoose.connection.readyState === 1) return mongoose.connection;
    if (!connectionPromise) {
        connectionPromise = mongoose.connect(process.env.MONGODB_URI)
            .then(() => {
                console.log("connected to database");
                return mongoose.connection;
            })
            .catch((error) => {
                connectionPromise = null;
                throw error;
            });
    }
    return connectionPromise;
}

module.exports = connectToDB;