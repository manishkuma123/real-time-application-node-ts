const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
      },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
      itemTotal: { type: Number, required: true }
    }
  ],address:[
    {
        street:{type:String,required:true},
        pincode:{type:Number,required:true},
        building:{type:String,required:true},
        city:{type:String,required:true},
    }
  ],

  total: { type: Number, required: true },
  status: {
    type: String,
    enum: ["pending", "paid", "shipped", "delivered", "cancelled"],
    default: "pending"
  },
paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'], 
    default: 'pending',
    required: true
  },
  orderDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Order", orderSchema);
