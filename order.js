const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  productName: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  itemTotal: { type: Number, required: true }
});

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"],
    default: "pending"
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed", "refunded"],
    default: "pending"
  },
  paymentMethod: {
    type: String,
    enum: ["cod", "card", "upi", "wallet"],
    default: "cod"
  },
  shippingAddress: {
    fullName: String,
    phone: String,
    address: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: "India" }
  },
  trackingNumber: String,
  deliveryDate: Date,
  cancelReason: String,
  notes: String
}, {
  timestamps: true
});

module.exports = mongoose.model("Order", orderSchema);



const express = require("express");
const router = express.Router();
const Order = require("../modules/order");
const User = require("../modules/auth");
const Product = require("../modules/product");
const authMiddleware = require("./middleware");
const adminMiddleware = require("./adminauth");

// Create Order from Cart (Checkout)
router.post("/api/order/create", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { shippingAddress, paymentMethod, notes } = req.body;

    // Validate shipping address
    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone || 
        !shippingAddress.address || !shippingAddress.city || !shippingAddress.pincode) {
      return res.status(400).json({
        status: false,
        message: "Complete shipping address is required"
      });
    }

    // Get user cart
    const user = await User.findById(userId).populate({
      path: 'cart.product',
      select: 'productName price quantity'
    });

    if (!user.cart || user.cart.length === 0) {
      return res.status(400).json({
        status: false,
        message: "Cart is empty"
      });
    }

    // Validate stock for all items
    for (let item of user.cart) {
      if (!item.product) {
        return res.status(400).json({
          status: false,
          message: "Some products in cart are no longer available"
        });
      }

      const product = await Product.findById(item.product._id);
      if (product.quantity < item.quantity) {
        return res.status(400).json({
          status: false,
          message: `Insufficient stock for ${item.product.productName}`
        });
      }
    }

    // Calculate total and prepare order items
    let totalAmount = 0;
    const orderItems = [];

    for (let item of user.cart) {
      const product = await Product.findById(item.product._id);
      
      // Reduce stock
      product.quantity -= item.quantity;
      await product.save();

      const itemTotal = item.product.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        product: item.product._id,
        productName: item.product.productName,
        price: item.product.price,
        quantity: item.quantity,
        itemTotal: itemTotal
      });
    }

    // Generate unique order ID
    const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create order
    const order = new Order({
      orderId,
      user: userId,
      items: orderItems,
      totalAmount: totalAmount.toFixed(2),
      shippingAddress,
      paymentMethod: paymentMethod || "cod",
      notes
    });

    await order.save();

    // Clear user's cart
    user.cart = [];
    await user.save();

    await order.populate('user', 'name email phone');

    res.status(201).json({
      status: true,
      message: "Order created successfully",
      order
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "Server error"
    });
  }
});

// Get All Orders (User's own orders)
router.get("/api/orders", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, page = 1, limit = 10 } = req.query;

    const query = { user: userId };
    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('items.product', 'productName category')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.status(200).json({
      status: true,
      message: "Orders fetched successfully",
      orders,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "Server error"
    });
  }
});

// Get Single Order Details
router.get("/api/order/:orderId", authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;

    const order = await Order.findOne({ orderId })
      .populate('user', 'name email phone')
      .populate('items.product', 'productName description category');

    if (!order) {
      return res.status(404).json({
        status: false,
        message: "Order not found"
      });
    }

    // Check if user owns this order or is admin
    if (order.user._id.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        status: false,
        message: "Access denied"
      });
    }

    res.status(200).json({
      status: true,
      message: "Order details fetched successfully",
      order
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "Server error"
    });
  }
});

// Cancel Order (User)
router.put("/api/order/:orderId/cancel", authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { cancelReason } = req.body;
    const userId = req.user._id;

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({
        status: false,
        message: "Order not found"
      });
    }

    // Check ownership
    if (order.user.toString() !== userId.toString()) {
      return res.status(403).json({
        status: false,
        message: "Access denied"
      });
    }

    // Can only cancel pending or confirmed orders
    if (!["pending", "confirmed"].includes(order.status)) {
      return res.status(400).json({
        status: false,
        message: "Order cannot be cancelled at this stage"
      });
    }

    // Restore product stock
    for (let item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { quantity: item.quantity }
      });
    }

    order.status = "cancelled";
    order.cancelReason = cancelReason || "Cancelled by user";
    await order.save();

    res.status(200).json({
      status: true,
      message: "Order cancelled successfully",
      order
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "Server error"
    });
  }
});

// ============================================
// ADMIN ORDER MANAGEMENT ROUTES
// ============================================

// Get All Orders (Admin)
router.get("/api/admin/orders", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { 'shippingAddress.fullName': { $regex: search, $options: 'i' } }
      ];
    }

    const orders = await Order.find(query)
      .populate('user', 'name email phone')
      .populate('items.product', 'productName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    // Get order statistics
    const stats = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" }
        }
      }
    ]);

    res.status(200).json({
      status: true,
      message: "Orders fetched successfully",
      orders,
      statistics: stats,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "Server error"
    });
  }
});

// Update Order Status (Admin)
router.put("/api/admin/order/:orderId/status", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, trackingNumber, deliveryDate } = req.body;

    const validStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: false,
        message: "Invalid status"
      });
    }

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({
        status: false,
        message: "Order not found"
      });
    }

    order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (deliveryDate) order.deliveryDate = deliveryDate;

    await order.save();

    res.status(200).json({
      status: true,
      message: "Order status updated successfully",
      order
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "Server error"
    });
  }
});

// Update Payment Status (Admin)
router.put("/api/admin/order/:orderId/payment", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentStatus } = req.body;

    const validStatuses = ["pending", "paid", "failed", "refunded"];
    if (!validStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        status: false,
        message: "Invalid payment status"
      });
    }

    const order = await Order.findOneAndUpdate(
      { orderId },
      { paymentStatus },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        status: false,
        message: "Order not found"
      });
    }

    res.status(200).json({
      status: true,
      message: "Payment status updated successfully",
      order
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "Server error"
    });
  }
});

// Get Order Statistics (Admin)
router.get("/api/admin/orders/stats", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);

    const statusBreakdown = await Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name email');

    res.status(200).json({
      status: true,
      statistics: {
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        statusBreakdown,
        recentOrders
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "Server error"
    });
  }
});

module.exports = router;





# Order API - Postman Testing Guide

## Setup

Add these environment variables:
- `orderId`: (will be saved after creating order)

---

## USER ORDER ENDPOINTS

### 1. Create Order (Checkout)
```
POST {{base_url}}/api/order/create
```

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "shippingAddress": {
    "fullName": "John Doe",
    "phone": "9876543210",
    "address": "123 Main Street, Apartment 4B",
    "city": "Ahmedabad",
    "state": "Gujarat",
    "pincode": "380001",
    "country": "India"
  },
  "paymentMethod": "cod",
  "notes": "Please deliver between 10 AM - 6 PM"
}
```

**Test Script:**
```javascript
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

pm.test("Order created and save orderId", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.status).to.be.true;
    pm.expect(jsonData.order).to.exist;
    pm.environment.set("orderId", jsonData.order.orderId);
});

pm.test("Cart should be cleared", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.order.items).to.be.an('array');
    pm.expect(jsonData.order.items.length).to.be.greaterThan(0);
});
```

**Expected Response:**
```json
{
  "status": true,
  "message": "Order created successfully",
  "order": {
    "orderId": "ORD-1704887654321-456",
    "user": {...},
    "items": [...],
    "totalAmount": "2599.98",
    "status": "pending",
    "paymentStatus": "pending",
    "paymentMethod": "cod",
    "shippingAddress": {...}
  }
}
```

---

### 2. Get My Orders
```
GET {{base_url}}/api/orders
```

**Headers:**
```
Authorization: Bearer {{token}}
```

**Query Parameters:**
- `status`: (optional) Filter by status - pending, confirmed, processing, shipped, delivered, cancelled
- `page`: (optional) Page number (default: 1)
- `limit`: (optional) Items per page (default: 10)

**Examples:**
```
GET {{base_url}}/api/orders?status=pending
GET {{base_url}}/api/orders?page=1&limit=5
GET {{base_url}}/api/orders?status=delivered&page=2
```

**Test Script:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Orders array exists", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.orders).to.be.an('array');
    pm.expect(jsonData.pagination).to.exist;
});
```

---

### 3. Get Order Details
```
GET {{base_url}}/api/order/{{orderId}}
```

**Headers:**
```
Authorization: Bearer {{token}}
```

**Test Script:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Order details fetched", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.order).to.exist;
    pm.expect(jsonData.order.orderId).to.equal(pm.environment.get("orderId"));
});
```

---

### 4. Cancel Order
```
PUT {{base_url}}/api/order/{{orderId}}/cancel
```

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "cancelReason": "Changed my mind"
}
```

**Test Script:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Order cancelled", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.status).to.be.true;
    pm.expect(jsonData.order.status).to.equal("cancelled");
});
```

---

## ADMIN ORDER ENDPOINTS

### 5. Get All Orders (Admin)
```
GET {{base_url}}/api/admin/orders
```

**Headers:**
```
Authorization: Bearer {{token}}
```

**Query Parameters:**
- `status`: Filter by status
- `page`: Page number
- `limit`: Items per page
- `search`: Search by orderId or customer name

**Examples:**
```
GET {{base_url}}/api/admin/orders?status=pending
GET {{base_url}}/api/admin/orders?search=John
GET {{base_url}}/api/admin/orders?page=1&limit=20
```

**Test Script:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Admin can see all orders", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.orders).to.be.an('array');
    pm.expect(jsonData.statistics).to.exist;
});
```

---

### 6. Update Order Status (Admin)
```
PUT {{base_url}}/api/admin/order/{{orderId}}/status
```

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "status": "confirmed"
}
```

**Valid Status Values:**
- `pending`
- `confirmed`
- `processing`
- `shipped`
- `delivered`
- `cancelled`

**With Tracking (for shipped status):**
```json
{
  "status": "shipped",
  "trackingNumber": "TRACK123456789",
  "deliveryDate": "2024-01-15"
}
```

**Test Script:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Order status updated", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.order.status).to.exist;
});
```

---

### 7. Update Payment Status (Admin)
```
PUT {{base_url}}/api/admin/order/{{orderId}}/payment
```

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "paymentStatus": "paid"
}
```

**Valid Payment Status Values:**
- `pending`
- `paid`
- `failed`
- `refunded`

---

### 8. Get Order Statistics (Admin)
```
GET {{base_url}}/api/admin/orders/stats
```

**Headers:**
```
Authorization: Bearer {{token}}
```

**Test Script:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Statistics exist", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.statistics).to.exist;
    pm.expect(jsonData.statistics.totalOrders).to.exist;
    pm.expect(jsonData.statistics.totalRevenue).to.exist;
});
```

**Expected Response:**
```json
{
  "status": true,
  "statistics": {
    "totalOrders": 150,
    "totalRevenue": 125000.50,
    "statusBreakdown": [
      { "_id": "delivered", "count": 80 },
      { "_id": "pending", "count": 20 },
      { "_id": "processing", "count": 30 }
    ],
    "recentOrders": [...]
  }
}
```

---

## Complete Testing Workflow

### User Journey:
1. **Login** → Get token
2. **Add items to cart** → Add multiple products
3. **Get cart** → Verify items
4. **Create order** → Checkout with shipping address
5. **Get my orders** → View order history
6. **Get order details** → View specific order
7. **Cancel order** (optional) → Cancel if needed

### Admin Journey:
1. **Login as admin** → Get admin token
2. **Get all orders** → View all customer orders
3. **Update order status** → Process orders (pending → confirmed → processing → shipped → delivered)
4. **Update payment status** → Mark payments as paid
5. **Get statistics** → View business metrics

---

## Testing Different Scenarios

### Scenario 1: Successful Order Flow
```
1. Add items to cart
2. Create order with valid address
3. Admin confirms order
4. Admin marks as processing
5. Admin ships order (add tracking)
6. Admin marks as delivered
```

### Scenario 2: Order Cancellation
```
1. Create order
2. User cancels order (while status is pending)
3. Check product stock restored
4. Verify order status is cancelled
```

### Scenario 3: Failed Scenarios
```
- Create order with empty cart → Should fail
- Create order without shipping address → Should fail
- Cancel order after shipped → Should fail
- Update order status with invalid status → Should fail
```

---

## Error Responses

### Empty Cart:
```json
{
  "status": false,
  "message": "Cart is empty"
}
```

### Insufficient Stock:
```json
{
  "status": false,
  "message": "Insufficient stock for Laptop Dell XPS 15"
}
```

### Order Not Found:
```json
{
  "status": false,
  "message": "Order not found"
}
```

### Cannot Cancel:
```json
{
  "status": false,
  "message": "Order cannot be cancelled at this stage"
}
```

---

## Order Status Flow

```
pending → confirmed → processing → shipped → delivered
   ↓
cancelled (only from pending/confirmed)
```

---

## Payment Status Flow

```
pending → paid
   ↓         ↓
failed    refunded
```