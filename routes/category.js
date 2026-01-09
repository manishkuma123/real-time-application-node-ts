const express = require("express");
const fs = require("fs");
const Category = require("../modules/category");
const router = express.Router();

router.post("/api/categories",  async (req, res) => {
  try {
    const { name } = req.body;
    const category = await Category.create({
      name
    });
    res.status(201).json({ success: true, category });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/api/category/:id", async(req,res)=>{
  try { 
    const { userid } = req.params;
    const categories = await Category.findOneAndUpdate(userid,req.body);
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
})
router.delete("/api/category/:id", async(req,res)=>{
  try {
     
    const { userid } = req.params;
    const categories = await Category.deleteOne(userid);
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
})
router.get("/api/categories", async (req, res) => {
  try {
    const categories = await Category.find();
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
