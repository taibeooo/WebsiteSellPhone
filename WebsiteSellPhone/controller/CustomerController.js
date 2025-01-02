// controllers/CustomerController.js
const Customer = require('../model/CustomerModel');


exports.getAll = async (req, res) => {
  try {
      const customers = await Customer.find().lean(); // Lấy tất cả khách hàng từ DB
      res.status(200).json(customers); // Trả về danh sách khách hàng dưới dạng JSON
  } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ message: 'Internal Server Error' }); // Trả về lỗi nếu có
  }
};


// Thêm khách hàng mới
exports.addCustomer = async (req, res) => {
    const { phone, fullname, address } = req.body;
    try {
        // Kiểm tra xem khách hàng có đã tồn tại chưa
        const existingCustomer = await Customer.findOne({ phone });
        if (existingCustomer) {
            return res.status(400).json({ message: 'Số điện thoại đã tồn tại!' });
        }

        // Tạo khách hàng mới
        const newCustomer = new Customer({
            phone,
            fullname,
            address,
            rank: 'Bronze',
        });

        // Lưu khách hàng vào cơ sở dữ liệu
        await newCustomer.save();
        res.status(201).json({
            message: 'Customer added successfully',
            customer: newCustomer,
        });
    } catch (error) {
        console.error('Error adding customer:', error);

        if (error.code === 11000) { // Lỗi trùng lặp
            return res.status(400).json({ message: 'Phone number must be unique' });
        }

        res.status(500).json({ message: 'Internal Server Error' });
    }
};

  
// search
exports.searchCustomer = async (req, res) => {
    const { phone } = req.query;

    if (!phone) {
        return res.status(400).json({ message: 'Phone number is required' });
    }

    try {
        const customer = await Customer.findOne({ phone }, 'phone fullname address rank').lean();
        if (!customer) {
            return res.status(200).json({
                message: 'Customer not found',
                customer: null,
            });
        }

        res.status(200).json({
            message: 'Customer found',
            customer,
        });
    } catch (error) {
        console.error('Error fetching customer by phone:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
// detail
exports.viewCustomerDetail = async (req, res) => {
    const customerId = req.params.id;  // Lấy ID của khách hàng từ URL
    console.log('customerId',customerId);
    try {
        // Tìm khách hàng trong cơ sở dữ liệu
        const customer = await Customer.findById(customerId).lean();
        
        if (!customer) {
            return res.status(404).render('error', { message: 'Khách hàng không tồn tại' });
        }

        // Lấy danh sách hóa đơn của khách hàng này
        const invoices = await Invoice.find({ customer_id: customerId }).lean();

        // Nếu không có hóa đơn nào
        if (invoices.length === 0) {
            return res.render('Customer/DetailCustomer', { customer, message: 'Khách hàng chưa có lịch sử mua hàng.' });
        }
        console.log('taibeo:',customer);
        console.log('invoices:',invoices);
        // Render trang hiển thị lịch sử mua hàng của khách hàng
        res.render('Customer/DetailCustomer', { customer, invoices });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Đã xảy ra lỗi khi lấy thông tin lịch sử mua hàng' });
    }
};