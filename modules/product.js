const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  description: String,
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  quantity:{type:Number,required:true},
  price:{type:Number,required:true},
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);