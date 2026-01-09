const express = require("express");
const router= express.Router();
const Product= require("../modules/product")
const authMiddleware= require("./middleware");
const adminMiddleware = require("./adminauth");
const category= require("../modules/category")
router.get("/api/product",(req,res)=>{
    res.send('product router work')
})
  
router.post("/api/product", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { productName, description, category, price, quantity } = req.body;

   
    const product = new Product({
      productName,
      description,
      // category:req.category._id,
      category,
      price,
      quantity,
      createdBy: req.user._id, 
    });

    const productResult = await product.save();

    res.status(201).json({
      status: true,
      message: "Product created successfully",
      data: productResult,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get('/api/products',async(req,res)=>{
  try {
    const products = await Product.find()
     .populate("createdBy", "name")
     .populate("category","name -_id")

    res.status(200).json({status:true,data:products})
  } catch (error) {
    res.status(500).json({message:"server error"})
  }
})
 router.put('/api/product/:id', async(req,res)=>{
  try {
    const {id}= req.params;

    const updatedata = await Product.findByIdAndUpdate(id,
    req.body
   ,{new:true})
  res.status(200).json({status:true,message:"product updated successfully",data:updatedata })
  } catch (error) {
    res.status(500).json({message:"server error"})
  }
 })
 router.delete("/api/product/:id",async (req,res)=>{
  try {
    
    const {id}= req.params;
    await Product.findByIdAndDelete(id);
    res.status(200).json({status:true,message:"product deleted successfully"})
  } catch (error) {
    res.status(500).json({message:"server error"})
  }
 })

module.exports= router;