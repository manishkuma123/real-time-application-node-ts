const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, default: 1 },
});
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: Number,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    notificationStatus: {
        type: String,
        enum: ["on", "off"],
        default: "on"
    },
    joinedAt: {
        type: Date,
        default: Date.now
    },
   role:{
    type:String,
    enum:["user","admin"],
    default:"user"
   },
  profile: {
    url: { type: String },
    public_id: { type: String } 
  },
    createdAt: {
        type: Date,
        default: Date.now
    },
    cart:[cartItemSchema]
});

module.exports = mongoose.model("User", userSchema);

