const express = require("express");
const app = express();
require('dotenv').config();
const connect =require('./db')
const user = require("./routes/auth")
const productapi= require("./routes/product")
const card= require("./routes/card")
const category = require('./routes/category')
const admin =require("./routes/admin");
const order = require("./routes/order");
connect()
app.use(express.json());
app.use('/',user)
app.use('/',category)
app.use('/',productapi)
app.use("/",card)
app.use('/',admin)
app.use("/",order)
const PORT = process.env.PORT||2000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
