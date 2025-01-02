const Product = require('../model/ProductModel');
exports.viewCheckout = async (req, res) => {

    const cart = req.session.cart || [];
    if (cart.length === 0) {
        return res.render('cart', {
            error: 'Giỏ hàng của bạn trống. Vui lòng thêm sản phẩm vào giỏ hàng.'
        });
    }
    const detailedCart = [];
    let total = 0;
    for (const item of cart) {
      const product = await Product.findById(item.productId).lean();
      if (product) {
          const price = parseFloat(product.retail_price.toString());
          const quantity = parseInt(item.quantity);

          if (!isNaN(price) && !isNaN(quantity)) {
              const subtotal = Math.floor(price * quantity);
              total += subtotal;
              detailedCart.push({
                  productId: product._id,
                  name: product.name,
                  price: price,
                  img: product.image_url,
                  quantity: quantity,
                  subtotal: subtotal,
              });
          }
      }
  }

  res.render('checkout', { cart: detailedCart, total: total, sessionID: req.session.id,error: req.query.error || null });
};