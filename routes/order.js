const express = require("express");
const router = express.Router();
const Order = require("../modules/order")
const authMiddleware= require("./middleware") 

router.post("/api/order",(req,res)=>{
    res.send("order route work")
})
router.get("/api/orders", async(req,res)=>{
    try {  
       const orders  =  await Order.find();
       res.status(200).json({orders})
    } catch (error) {
        res.status(500).json({message:"server error"})
    }
})


module.exports= router