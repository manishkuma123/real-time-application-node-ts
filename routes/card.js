const express = require("express");
const router = express.Router();
const User = require("../modules/auth");
const Product = require("../modules/product");
const authMiddleware = require("./middleware");
const Order = require("../modules/order")

router.post("/api/cart/add", authMiddleware, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user._id;

    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({ 
        status: false, 
        message: "Invalid product or quantity" 
      });
    }
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ 
        status: false, 
        message: "Product not found" 
      });
    }
    if (product.quantity < quantity) {
      return res.status(400).json({ 
        status: false, 
        message: "Insufficient stock available" 
      });
    }
    const user = await User.findById(userId);
    if (!user.cart) {
      user.cart = [];
    }
    const existingItemIndex = user.cart.findIndex(
      item => item.product.toString() === productId
    );
    if (existingItemIndex > -1) {
      const newQuantity = user.cart[existingItemIndex].quantity + quantity;
      if (newQuantity > product.quantity) {
        return res.status(400).json({ 
          status: false, 
          message: "Requested quantity exceeds available stock" 
        });
      }
      user.cart[existingItemIndex].quantity = newQuantity;
    } else {

      user.cart.push({
        product: productId,
        quantity: quantity
      });
    }

    await user.save();

    await user.populate({
      path: 'cart.product',
      select: 'productName price quantity description'
    });

    res.status(200).json({
      status: true,
      message: "Item added to cart successfully",
      cart: user.cart
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      status: false, 
      message: "Server error" 
    });
  }
});

router.get("/api/cart", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).populate({
      path: 'cart.product',
      select: 'productName price quantity description category',
      populate: {
        path: 'category',
        select: 'name -_id'
      }
    });
    if (!user.cart || user.cart.length === 0) {
      return res.status(200).json({
        status: true,
        message: "Cart is empty",
        cart: [],
        total: 0
      });
    }
    let total = 0;
    const cartItems = user.cart.map(item => {
      if (item.product) {
        const itemTotal = item.product.price * item.quantity;
        total += itemTotal;
        return {
          product: item.product,
          quantity: item.quantity,
          itemTotal: itemTotal
        };
      }
      return null;
    }).filter(item => item !== null);
    res.status(200).json({
      status: true,
      message: "Cart fetched successfully",
      cart: cartItems,
      total: total.toFixed(2)
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      status: false, 
      message: "Server error" 
    });
  }
});

router.put("/api/cart/update", authMiddleware, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user._id;

    if (!productId || quantity < 0) {
      return res.status(400).json({ 
        status: false, 
        message: "Invalid input" 
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ 
        status: false, 
        message: "Product not found" 
      });
    }

    if (quantity > product.quantity) {
      return res.status(400).json({ 
        status: false, 
        message: "Insufficient stock available" 
      });
    }
    const user = await User.findById(userId);
    if (quantity === 0) {
      user.cart = user.cart.filter(
        item => item.product.toString() !== productId
      );
    } else {
      const itemIndex = user.cart.findIndex(
        item => item.product.toString() === productId
      );

      if (itemIndex === -1) {
        return res.status(404).json({ 
          status: false, 
          message: "Item not found in cart" 
        });
      }
      user.cart[itemIndex].quantity = quantity;
    }
    await user.save();
    await user.populate({
      path: 'cart.product',
      select: 'productName price quantity description'
    });
    res.status(200).json({
      status: true,
      message: "Cart updated successfully",
      cart: user.cart
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      status: false, 
      message: "Server error" 
    });
  }
});

router.delete("/api/cart/remove/:productId", authMiddleware, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id;
    const user = await User.findById(userId);
    user.cart = user.cart.filter(
      item => item.product.toString() !== productId
    );
    await user.save();
    await user.populate({
      path: 'cart.product',
      select: 'productName price quantity description'
    });
    res.status(200).json({
      status: true,
      message: "Item removed from cart successfully",
      cart: user.cart
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      status: false, 
      message: "Server error" 
    });
  }
});

router.delete("/api/cart/clear", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    await User.findByIdAndUpdate(userId, { cart: [] });
    res.status(200).json({
      status: true,
      message: "Cart cleared successfully",
      cart: []
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      status: false, 
      message: "Server error" 
    });
  }
});


router.post("/api/cart/checkout", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).populate({
      path: "cart.product",
      select: "productName price quantity description category"
    });
    if (!user.cart || user.cart.length === 0) {
      return res.status(400).json({ status: false, message: "Cart is empty" });
    }
    let total = 0;
    const orderItems = [];
const  responseItemsdata= [];
if(responseItemsdata.length>0){
    for(let i=0; i<responseItemsdata.length; i++){
        responseItemsdata.push({

              product: product._id,
        quantity: item.quantity,
        price: product.price,
        itemTotal
        })
    }

}

    for (let item of user.cart) {
      const product = await Product.findById(item.product._id);

      if (!product) {
        return res.status(400).json({
          status: false,
          message: `Product ${item.product.productName} no longer exists`
        });
      }

      if (item.quantity > product.quantity) {
        return res.status(400).json({
          status: false,
          message: `Insufficient stock for ${product.productName}`
        });
      }

      // Deduct stock
      product.quantity -= item.quantity;
      await product.save();

      const itemTotal = product.price * item.quantity;
      total += itemTotal;

      orderItems.push({
        product: product._id, // only ObjectId, not full object
        quantity: item.quantity,
        price: product.price,
        itemTotal
      });
    }

    // Create order
    const order = new Order({
      userId,
      items: orderItems,
      total: total.toFixed(2),
      status: "pending",
      orderDate: new Date()
    });

    await order.save();

    // Clear user cart
    user.cart = [];
    await user.save();

    // Prepare response with product details
    const responseItems = orderItems.map(item => {
      const productData = user.cart.find(c => c.product._id.equals(item.product));
      return {
        ...item,
        productName: productData?.product.productName || "N/A"
      };
    });

    res.status(200).json({
      status: true,
      message: "Order placed successfully",
      order: {
        orderId: order._id,
        userId: order.userId,
        items: orderItems, // sending the order items with ObjectId references
        total: order.total,
        status: order.status,
        orderDate: order.orderDate
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});
module.exports = router;


// const express = require("express");
// const router = express.Router();
// const User = require("../modules/auth");
// const Product = require("../modules/product");
// const Order = require("../modules/order"); // Make sure you have an Order model
// const authMiddleware = require("./middleware");

// router.post("/api/cart/checkout", authMiddleware, async (req, res) => {
//   try {
//     const userId = req.user._id;

//     // Get user and populate cart products
//     const user = await User.findById(userId).populate({
//       path: "cart.product",
//       select: "productName price quantity description category"
//     });

//     if (!user.cart || user.cart.length === 0) {
//       return res.status(400).json({ status: false, message: "Cart is empty" });
//     }

//     let total = 0;
//     const orderItems = [];

//     // Validate stock and prepare order items
//     for (let item of user.cart) {
//       const product = await Product.findById(item.product._id);

//       if (!product) {
//         return res.status(400).json({
//           status: false,
//           message: `Product ${item.product.productName} no longer exists`
//         });
//       }

//       if (item.quantity > product.quantity) {
//         return res.status(400).json({
//           status: false,
//           message: `Insufficient stock for ${product.productName}`
//         });
//       }

//       // Deduct stock
//       product.quantity -= item.quantity;
//       await product.save();

//       const itemTotal = product.price * item.quantity;
//       total += itemTotal;

//       orderItems.push({
//         product: product._id, // only ObjectId, not full object
//         quantity: item.quantity,
//         price: product.price,
//         itemTotal
//       });
//     }

//     // Create order
//     const order = new Order({
//       userId,
//       items: orderItems,
//       total: total.toFixed(2),
//       status: "pending",
//       orderDate: new Date()
//     });

//     await order.save();

//     // Clear user cart
//     user.cart = [];
//     await user.save();

//     // Prepare response with product details
//     const responseItems = orderItems.map(item => {
//       const productData = user.cart.find(c => c.product._id.equals(item.product));
//       return {
//         ...item,
//         productName: productData?.product.productName || "N/A"
//       };
//     });

//     res.status(200).json({
//       status: true,
//       message: "Order placed successfully",
//       order: {
//         orderId: order._id,
//         userId: order.userId,
//         items: orderItems, // sending the order items with ObjectId references
//         total: order.total,
//         status: order.status,
//         orderDate: order.orderDate
//       }
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ status: false, message: "Server error" });
//   }
// });

