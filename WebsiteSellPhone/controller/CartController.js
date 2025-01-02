// controllers/CartController.js
const Product = require('../model/ProductModel');

exports.viewCart = async (req, res) => {
  const cart = req.session.cart || [];
  const detailedCart = [];
  let total = 0;
  for (const item of cart) {
      const product = await Product.findById(item.productId).lean();
      if (product) {
          // Chuyển đổi giá thành số
          const price = parseFloat(product.retail_price.toString()); // Chuyển đổi giá Decimal128 thành số
          const quantity = parseInt(item.quantity); // Chuyển đổi số lượng thành số nguyên

          // Kiểm tra xem giá và số lượng có hợp lệ không
          if (!isNaN(price) && !isNaN(quantity)) {
              const subtotal = Math.floor(price * quantity);
              total += subtotal;
              detailedCart.push({
                  productId: product._id,
                  name: product.name,
                  price: price,
                  img : product.image_url,
                  quantity: quantity,
                  subtotal: subtotal, // Tính subtotal và làm tròn xuống
              });
          } else {
              console.error('Invalid price or quantity:', price, quantity); // In ra lỗi nếu có
          }
      }
  }
  res.render('cart', { cart: detailedCart , total: total});
};


exports.addToCart = (req, res) => {
  const { productId, quantity } = req.body;

  // Kiểm tra xem giỏ hàng đã tồn tại trong session chưa
  if (!req.session.cart) {
      req.session.cart = []; // Nếu chưa, khởi tạo giỏ hàng
  }

  // Kiểm tra xem sản phẩm đã tồn tại trong giỏ hàng chưa
  const itemIndex = req.session.cart.findIndex(item => item.productId === productId);
  if (itemIndex > -1) {
      // Nếu đã tồn tại, cộng dồn số lượng
      req.session.cart[itemIndex].quantity += Number(quantity);
  } else {
      // Nếu không, thêm sản phẩm mới vào giỏ hàng
      req.session.cart.push({ productId, quantity: Number(quantity) });
  }

  // Redirect đến trang giỏ hàng sau khi thêm sản phẩm
  res.redirect('/cart'); // Đổi đường dẫn đến trang giỏ hàng
};



exports.updateQuantity = (req, res) => {
  const { productId, quantity } = req.body;

  // Tìm sản phẩm trong giỏ hàng và cập nhật số lượng
  const itemIndex = req.session.cart.findIndex(item => item.productId === productId);
  if (itemIndex > -1) {
      req.session.cart[itemIndex].quantity = Number(quantity);
      res.json({ success: true }); // Trả về thành công
  } else {
      res.json({ success: false }); // Không tìm thấy sản phẩm
  }
};



exports.removeFromCart = (req, res) => {
  const { productId } = req.body;

  // Tìm sản phẩm trong giỏ hàng và xóa nó
  const itemIndex = req.session.cart.findIndex(item => item.productId === productId);
  if (itemIndex > -1) {
      req.session.cart.splice(itemIndex, 1); // Xóa sản phẩm khỏi giỏ hàng
      res.json({ success: true }); // Trả về thành công
  } else {
      res.json({ success: false }); // Không tìm thấy sản phẩm
  }
};
