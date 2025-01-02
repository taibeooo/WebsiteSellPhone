const Product = require('../model/ProductModel');
const Invoice = require('../model/InvoiceModel');

// Get all products
exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.find().lean(); // hàm lean trả về thuần js 
        res.status(200).render('Product/ProductList', { products});
    } catch (err) {
        console.error('Error getting products:', err);
        res.status(500).send('Error getting products');
    }
};
exports.showAddProductForm = (req, res) => {
    res.render('Product/AddProduct'); // Render trang add.hbs
};
// Tạo  mới
exports.createProduct = async (req, res) => {
    try {
        const { barcode, name, description,import_price, retail_price, category, image_url } = req.body;
        // check req
        if (!barcode || !name ||!description|| !import_price || !retail_price || !category) {
            return res.status(400).json({ message: 'Tất cả các trường đều là bắt buộc' });
        }
        // kiểm tra barcode không đc trùng 
        const existingProduct = await Product.findOne({ barcode });
        if (existingProduct) {
            return res.status(400).json({ message: 'Barcode đã tồn tại, vui lòng sử dụng barcode khác.' });
        }
        // create sp 
        const newProduct = new Product({
            barcode,
            name,
            description,
            import_price,
            retail_price,
            category,
            image_url,
            created_at: new Date(), // Đặt ngày tạo
            updated_at: new Date(), // Đặt ngày cập nhật
        }); 
         // save db
        await newProduct.save();
        const products = await Product.find().lean();
        //res.status(201).json(savedProduct); // Trả về sản phẩm đã tạo
        //res.status(200).render('Product/listProduct', { products });
        res.redirect('/products');
    } catch (err) {
        res.status(500).json({ message: 'Lỗi khi tạo sản phẩm', error: err.message });
    }
};
/// xoá
exports.deleteProduct = async (req, res) => {
    const productId = req.params.id;
    const product = await Product.findById(productId);

    try {
        // Kiểm tra xem sản phẩm có trong hóa đơn không
        const productInInvoices = await Invoice.findOne({ product_ids: productId });

        if (productInInvoices) {
            return res.status(400).json({ errorMessage: 'Không thể xóa sản phẩm này vì nó đã được sử dụng trong hóa đơn.' });
        }

        // Tiến hành xóa sản phẩm nếu không có lỗi
        const deletedProduct = await Product.findByIdAndDelete(productId);
        if (!deletedProduct) {
            return res.status(400).json({ errorMessage: 'Không tìm thấy sản phẩm để xóa.' });
        }

        // Nếu xóa thành công, trả về thông báo thành công
        res.json({ successMessage: 'Sản phẩm đã được xóa!' });
    } catch (err) {
        // Nếu có lỗi, trả về thông báo lỗi
        res.status(500).json({ errorMessage: 'Có lỗi khi xóa sản phẩm: ' + err.message });
    }
};






// chi tiết sp
exports.detailProduct = async (req, res) => {
    const productId = req.params.id; 
    try {
        
        const detailProduct = await Product.findById({ _id: productId });
        if (!detailProduct) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm với ID này'});
        }
        // Trả về thông báo thành công
        //res.status(200).json({ product: detailProduct });
        const products = detailProduct.toObject();
        res.render('Product/DetailProduct', { product: products });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi khi lấy thông tin sản phẩm', error: err.message });
    }
};
// cập nhật
exports.getUpdateProduct = async (req, res) => {
    const productId = req.params.id; 
    try {
        
        const detailProduct = await Product.findById({ _id: productId });
        if (!detailProduct) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm với ID này'});
        }
        const products = detailProduct.toObject();
        res.render('Product/UpdateProduct', { product: products });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi khi lấy thông tin sản phẩm', error: err.message });
    }
};

exports.updateProduct = async (req, res) => {
    const productId = req.params.id;
    const updateData = req.body;
    try {
        if (!productId) {
            return res.status(400).json({ message: 'ID sản phẩm không hợp lệ.' });
        }
        await Product.findByIdAndUpdate(productId, updateData, { new: true, runValidators: true });
        
      //  res.render('Product/listProduct', { product: Product, message: 'Cập nhật sản phẩm thành công' });
      res.redirect('/products');
    } catch (err) {
        console.error('Lỗi khi cập nhật sản phẩm:', err);
        res.status(500).json({ message: 'Lỗi khi cập nhật sản phẩm', error: err.message });
    }
};
// search
exports.searchProduct = async (req, res) => {
    try {
        const query = req.query.query; // Lấy giá trị tìm kiếm từ query
        let products;
        if (query) {
            // Tìm kiếm sản phẩm theo tên hoặc mã code
            products = await Product.find({
                $or: [
                    { name: { $regex: query, $options: 'i' } }, // Tìm theo tên
                    { barcode: { $regex: query, $options: 'i' } }, // Tìm theo mã code
                    { category: { $regex: query, $options: 'i' } }, // Tìm theo phân loại
                ]
            }).lean();
        } else {
            products = await Product.find().lean();
        }
        res.render('Product/ProductList', { products });
    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi khi tìm kiếm sản phẩm');
    }
};

exports.getProductDetailForWorkSpace = async (req , res) =>{
    try{
        const detailProduct = await Product.findById(req.params.id);
        const product = detailProduct.toObject();
        res.render('Employee/DetailsPrd', {product: product});
    }catch(error) {
        console.error(error);
        res.status(500).send('Lỗi khi tìm kiếm sản phẩm');
    }
};