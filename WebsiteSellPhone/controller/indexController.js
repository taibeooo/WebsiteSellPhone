
const Product = require('../model/ProductModel');
// get product new
exports.getIndex = async (req, res) => {
  try {
    // Lấy 6 sản phẩm mới nhất, sắp xếp theo ngày tạo giảm dần
    const newProducts = await Product.find({category: { $in: ["Laptop", "Màn hình", "Điện thoại"] }}).sort({ created_at: -1 }).limit(6).lean();
    // Chia sản phẩm thành từng cặp
    const pairedProducts = [];
    for (let i = 0; i < newProducts.length; i += 2) {
      pairedProducts.push(newProducts.slice(i, i + 2)); // slice(start, end) lấy ra 2 sản phẩm từ newProducts bắt đầu từ vị trí i đến i + 2 (không bao gồm i + 2 ).
    }

    // lấy sản phẩm với mục laptop
    const laptopProducts = await Product.find({ category: 'Laptop' }).lean();
    const pairedLaptopProducts = [];

    for (let i = 0; i < laptopProducts.length; i += 1) {
      pairedLaptopProducts.push(laptopProducts[i]);
    }
    // lấy sản phẩm với mục màn hình
    const screenProducts = await Product.find({ category: 'Màn hình' }).lean();
    const pairedScreenProducts = [];
    for (let i = 0; i < screenProducts.length; i += 1) {
        pairedScreenProducts.push(screenProducts[i]);
    }
    // Lấy sản phẩm với mục phụ kiện
    const accessoryProducts = await Product.find({ category: 'Phụ kiện' }).lean();
    const pairedAccessoryProducts = [];
    for (let i = 0; i < accessoryProducts.length; i += 2) {
        pairedAccessoryProducts.push(accessoryProducts.slice(i, i + 2));
    }
    res.render('index',{ 
        title: 'Home Page',
        pairedProducts: pairedProducts,
        pairedLaptopProducts: pairedLaptopProducts ,
        pairedScreenProducts : pairedScreenProducts,
        pairedAccessoryProducts : pairedAccessoryProducts
       });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách sản phẩm mới:', error);
    res.status(500).send('Lỗi khi tải trang chủ');
  }
};
exports.getProductById = async (req, res) => {
  try {
    const productId = req.params.id; // Lấy ID từ params
    const product = await Product.findById(productId).lean(); // Tìm sản phẩm theo ID

    if (!product) {
      return res.status(404).send('Sản phẩm không tồn tại'); // Kiểm tra nếu sản phẩm không tồn tại
    }

    res.render('product', { title: product.name, product }); // Render trang chi tiết sản phẩm
  } catch (error) {
    console.error('Lỗi khi lấy sản phẩm:', error);
    res.status(500).send('Lỗi khi lấy sản phẩm');
  }
};
let sortedProducts = {
  default: [],
  nameAsc: [],
  nameDesc: [],
  priceAsc: [],
  priceDesc: []
};

exports.getProductShop = async (req, res) => {
  try {
    const products = await Product.find().lean();
    
    // Nhận giá trị search từ query
    const search = req.query.search || '';

    // Sắp xếp các danh sách sản phẩm
    sortedProducts.default = products;
    sortedProducts.nameAsc = [...products].sort((a, b) => a.name.localeCompare(b.name));
    sortedProducts.nameDesc = [...products].sort((a, b) => b.name.localeCompare(a.name));
    sortedProducts.priceAsc = [...products].sort((a, b) => a.retail_price - b.retail_price);
    sortedProducts.priceDesc = [...products].sort((a, b) => b.retail_price - a.retail_price);

    // Nhận các giá trị sort và category từ query
    const sort = req.query.sort || 'Position';
    const category = req.query.category ? req.query.category.split(',') : [];
    const minPrice = parseFloat(req.query.minPrice) || 0;
    const maxPrice = parseFloat(req.query.maxPrice) || Infinity;

    // Bắt đầu lọc sản phẩm theo phân loại, giá, và từ khóa tìm kiếm
    let productsToDisplay = [...sortedProducts.default];
    if (category.length > 0) {
      productsToDisplay = productsToDisplay.filter(product => category.includes(product.category));
    }
    productsToDisplay = productsToDisplay.filter(product => 
      product.retail_price >= minPrice && product.retail_price <= maxPrice &&
      (product.name.toLowerCase().includes(search.toLowerCase()) || product.description.toLowerCase().includes(search.toLowerCase()))
    );

    // Sắp xếp sản phẩm theo tiêu chí đã lưu
    switch (sort) {
      case 'Product Name':
        productsToDisplay = sortedProducts.nameAsc.filter(product => 
          (category.length > 0 ? category.includes(product.category) : true) && 
          product.retail_price >= minPrice && product.retail_price <= maxPrice &&
          (product.name.toLowerCase().includes(search.toLowerCase()) || product.description.toLowerCase().includes(search.toLowerCase()))
        );
        break;
      case 'Name Desc':
        productsToDisplay = sortedProducts.nameDesc.filter(product => 
          (category.length > 0 ? category.includes(product.category) : true) && 
          product.retail_price >= minPrice && product.retail_price <= maxPrice &&
          (product.name.toLowerCase().includes(search.toLowerCase()) || product.description.toLowerCase().includes(search.toLowerCase()))
        );
        break;
      case 'Price':
        productsToDisplay = sortedProducts.priceAsc.filter(product => 
          (category.length > 0 ? category.includes(product.category) : true) && 
          product.retail_price >= minPrice && product.retail_price <= maxPrice &&
          (product.name.toLowerCase().includes(search.toLowerCase()) || product.description.toLowerCase().includes(search.toLowerCase()))
        );
        break;
      case 'Price Desc':
        productsToDisplay = sortedProducts.priceDesc.filter(product => 
          (category.length > 0 ? category.includes(product.category) : true) && 
          product.retail_price >= minPrice && product.retail_price <= maxPrice &&
          (product.name.toLowerCase().includes(search.toLowerCase()) || product.description.toLowerCase().includes(search.toLowerCase()))
        );
        break;
      default:
        productsToDisplay = sortedProducts.default.filter(product => 
          (category.length > 0 ? category.includes(product.category) : true) && 
          product.retail_price >= minPrice && product.retail_price <= maxPrice &&
          (product.name.toLowerCase().includes(search.toLowerCase()) || product.description.toLowerCase().includes(search.toLowerCase()))
        );
    }

    // Phân trang
    const perPage = 12;
    const page = parseInt(req.query.page) || 1;
    const totalProducts = productsToDisplay.length;
    const totalPages = Math.ceil(totalProducts / perPage);
    const productsPage = productsToDisplay.slice((page - 1) * perPage, page * perPage);
     // Đếm tổng sản phẩm tìm thấy
     const totalFoundProducts = productsToDisplay.length;
    // Render trang shop
    res.status(200).render('shop', { 
      products: productsPage,
      currentPage: page,
      totalPages,
      totalFoundProducts,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      sort,
      category,
      search // Gửi giá trị search đến view
    });
  } catch (err) {
    console.error('Error getting products:', err);
    res.status(500).send('Error getting products');
  }
};
