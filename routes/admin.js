const bcrypt = require("bcryptjs");
const User = require("../modules/auth");
const express = require("express");
const router = express.Router()
const jwt= require("jsonwebtoken")
router.post("/api/admin/register",async(req,res)=>{
    try {
        
        const {name,email,password,phone}= req.body;
        if(!name||!email||!password || !phone){
            return res.status(400).json({status:false,message:"all fields are required"})
        }
        const existingUser = await   User.findOne({email})
        if(existingUser){
            return res.status(400).json({status:false,message:"user alredy exist"})
        }
        const hashedPassword  = await bcrypt.hash(password,10);
        const admin = new User({
            name,
            email,
            password:hashedPassword,
            role:"admin",
            phone
        })
        await admin.save()

         const token =jwt.sign({
                    userId:admin._id},"manishkumartokendata",{expiresIn:"7d"})
        res.status(201).json({status:true,message:"admin created successfully",data:admin,token})
    } catch (error) {
        res.status(500).json({status:false,message:"server error"})
    }
})
router.post('/api/admin/login', async (req, res) => {
    try {
        const { email, phone, password } = req.body;
       
        if (!email && !phone) {
            return res.status(400).json({ message: "Please provide email or phone" });
        }

        const exituser = await User.findOne({
            $or: [
                { email: email || null },
                { phone: phone || null }
            ]
        });
        if (!exituser) {
            return res.status(400).json({ message: "User does not exist" });
        }

        const isMatch = await bcrypt.compare(password, exituser.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }      
        const token = jwt.sign(
            { userId: exituser._id },
            "manishkumartokendata",
            { expiresIn: "7d" }
        );

        const userData = exituser.toObject();
        delete userData.password;

        res.status(200).json({
            status: true,
            message: 'User login successful',
            user: userData,
            token
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });   
    }
});

router.post("/api/admin/logout",(req,res)=>{
    try {
        let token = null
    } catch (error) {
        res.status(500).json({message:"server error"})
    }
})
module.exports= router;