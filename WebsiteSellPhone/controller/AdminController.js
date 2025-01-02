const Account = require('../model/AccountModel'); 
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const Product = require('../model/ProductModel');
const Invoice = require('../model/InvoiceModel'); 
const Customer = require('../model/CustomerModel');
const upload = require('../middleware/upload');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const flash = require('connect-flash');
const path = require('path');
const fs = require('fs');

require('dotenv').config();


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_ADDRESS,  
        pass: process.env.MAIL_PASSWORD_APPLICATION  
    }
});


// Hàm đăng nhập
exports.postlogin = async (req, res) => {
    const { email, password } = req.body; 
    try {
        const adminAccount = await Account.findOne({ username: email });
        if (!adminAccount) {
            return res.render('login', { message: 'Tài khoản không tồn tại.' });
        }

        if(adminAccount.updated_at == null){
            return res.render('login', { message: 'Tài khoản chưa được kích hoạt. Hãy truy cập link thông qua email để đăng nhập lần đầu.' });
        }
        
        const isMatch = await bcrypt.compare(password, adminAccount.password);
        if (!isMatch) {
            // return res.status(401).send('Sai thông tin đăng nhập.');
            return res.render('login', { message: 'Sai thông tin đăng nhập.' });
        }
        
        await Account.updateOne(
            {username: email},
            { $set: { is_Active: true}}
        );
        // Lưu thông tin vào session
        req.session.admin = {
            id: adminAccount._id,
            username: adminAccount.username,   // Thêm tên người dùng
            email: adminAccount.email,
            fullname: adminAccount.fullname,
            profile_image: adminAccount.profile_image, // Ảnh đại diện
            role: adminAccount.role,
            status: adminAccount.status, // Trạng thái
            created_at: adminAccount.created_at, // Ngày tạo
            updated_at: adminAccount.updated_at, // Ngày cập nhật
        };
        if(adminAccount.role == 'staff'){
            return res.redirect('/');
        }
        res.redirect('/admin'); 
    } catch (error) {
        console.error('Lỗi đăng nhập:', error);
        res.status(500).send('Lỗi server');
    }
};

//Hàm đăng xuất
exports.logOut = async( req, res) => {
    const email = req.session.admin.email;
    
    await Account.updateOne(
        {email: req.session.admin.email},
        { $set: { is_Active: false}}
    );
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Error destroying session');
        }
        res.redirect('/'); 
    });
};
// getDashboard
exports.getDashboard = async (req, res) => {
    // check login
    if (!req.session.admin) {
        return res.redirect('/login'); 
    }
    try {
        // set ngày hiện tại và đặt time về 0h mõi ngày
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        // set time ngày tiếp theo
        const endOfToday = new Date(startOfToday);
        endOfToday.setDate(endOfToday.getDate() + 1);
        // Lấy tất cả hóa đơn ngày hiện tại
        const invoices = await Invoice.find({
            sale_date: { $gte: startOfToday, $lt: endOfToday }
        }).lean();

        // Tính tổng doanh thu từ các hóa đơn
        const totalRevenue = invoices.reduce((sum, invoice) => {
            const price = Number(invoice.total_price); // Chuyển đổi sang số
            return sum + (isNaN(price) ? 0 : price); // Cộng vào sum
        }, 0);

        // Populate product_ids trong các hóa đơn hôm nay
        const invoicesWithProducts = await Invoice.find({
            sale_date: { $gte: startOfToday, $lt: endOfToday }
        }).populate('product_ids').lean();

        // Lấy product_ids từ các hóa đơn đã populate
        const productIds = invoicesWithProducts.flatMap(invoice => 
            invoice.product_ids.map(product => product._id)
        );

        // Tìm tất cả sản phẩm theo product_id
        const products = await Product.find({ _id: { $in: productIds } }).lean();

        // Tổng giá nhập từ các sản phẩm
        const totalImportPrice = products.reduce((sum, product) => {
            const importPrice = Number(product.import_price);
            return sum + (isNaN(importPrice) ? 0 : importPrice);
        }, 0);

        // Lợi nhuận ngày hiện tại
        const profit = totalRevenue - totalImportPrice;
        const monthlyData = await Invoice.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$sale_date" } },
                    totalRevenue: { $sum: "$total_price" }
                }
            },
            {
                $project: {
                    month: "$_id",
                    totalRevenue: 1
                }
            },
            { $sort: { month: 1 } }
        ]);

        const months = monthlyData.map(item => item.month);
        const revenues = monthlyData.map(item => item.totalRevenue.toString());

        // --- Tính Top 10 khách hàng chi tiêu nhiều nhất ---
        const customers = await Customer.find().lean();
        const customerSpendingData = [];

        for (const customer of customers) {
            const customerInvoices = await Invoice.find({ phone: customer.phone }).lean();
            const totalSpent = customerInvoices.reduce((acc, invoice) => {
                const price = parseFloat(invoice.total_price);
                return acc + (isNaN(price) ? 0 : price);
            }, 0);

            customerSpendingData.push({
                customer,
                totalSpent,
            });
        }
        // Sắp xếp theo tổng chi tiêu giảm dần và lấy top 10
        const top10Customers = customerSpendingData
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 10);

        res.render('admin', {
            admin: req.session.admin,
            totalRevenue,
            totalImportPrice,
            profit,
            months,
            revenues,
            top10Customers,
        });
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu dashboard:', error);
        res.status(500).send('Lỗi server');
    }
};
// Hàm lấy báo cáo từng tháng
exports.getMonthReport = async (req, res) => {
    const { startDate, endDate } = req.query; // Lấy ngày bắt đầu và ngày kết thúc từ query parameters

    try {
        // Lấy hóa đơn theo khoảng thời gian
        const invoices = await Invoice.find({
            sale_date: {
                $gte: new Date(startDate), // Ngày bắt đầu
                $lte: new Date(endDate) // Ngày kết thúc
            }
        }).populate('product_ids').lean(); // Populate product_ids để có thông tin sản phẩm

        // Tính tổng doanh thu từ các hóa đơn
        const totalRevenue = invoices.reduce((sum, invoice) => {
            const price = Number(invoice.total_price); // Chuyển đổi sang số
            return sum + (isNaN(price) ? 0 : price); // Cộng vào sum
        }, 0);

        // Lấy product_ids từ các hóa đơn đã populate
        const productIds = invoices.flatMap(invoice => invoice.product_ids.map(product => product._id)); // Lấy ID sản phẩm từ product_ids

        // Tìm tất cả sản phẩm theo product_id
        const products = await Product.find({ _id: { $in: productIds } }).lean();

        // Tổng giá nhập từ các sản phẩm
        const totalImportPrice = products.reduce((sum, product) => {
            const importPrice = Number(product.import_price); // Chuyển đổi sang số
            return sum + (isNaN(importPrice) ? 0 : importPrice); // Cộng vào sum
        }, 0);

        // Lợi nhuận
        const profit = totalRevenue - totalImportPrice;

        // Gửi dữ liệu về client
        res.send({ totalRevenue, totalImportPrice, profit }); // Thay vì render, gửi JSON
    } catch (error) {
        console.error('Lỗi khi lấy báo cáo tùy chỉnh:', error);
        res.status(500).send('Lỗi server');
    }
};
// Hàm lấy báo cáo theo quý
exports.getQuarterlyReport = async (req, res) => {
    const { quarter, year } = req.query; // Lấy quý và năm từ query parameters

    try {
        const startDate = new Date(year, (quarter - 1) * 3, 1); // Ngày bắt đầu của quý
        const endDate = new Date(year, quarter * 3, 0); // Ngày kết thúc của quý

        // Lấy hóa đơn theo khoảng thời gian
        const invoices = await Invoice.find({
            sale_date: {
                $gte: startDate,
                $lte: endDate
            }
        }).populate('product_ids').lean(); // Populate product_ids để có thông tin sản phẩm

        // Tính tổng doanh thu từ các hóa đơn
        const totalRevenue = invoices.reduce((sum, invoice) => {
            const price = Number(invoice.total_price); // Chuyển đổi sang số
            return sum + (isNaN(price) ? 0 : price); // Cộng vào sum
        }, 0);

        // Lấy product_ids từ các hóa đơn đã populate
        const productIds = invoices.flatMap(invoice => invoice.product_ids.map(product => product._id)); // Lấy ID sản phẩm từ product_ids

        // Tìm tất cả sản phẩm theo product_id
        const products = await Product.find({ _id: { $in: productIds } }).lean();

        // Tổng giá nhập từ các sản phẩm
        const totalImportPrice = products.reduce((sum, product) => {
            const importPrice = Number(product.import_price); // Chuyển đổi sang số
            return sum + (isNaN(importPrice) ? 0 : importPrice); // Cộng vào sum
        }, 0);

        // Lợi nhuận
        const profit = totalRevenue - totalImportPrice;

        // Gửi dữ liệu về client
        res.send({ totalRevenue, totalImportPrice, profit }); // Thay vì render, gửi JSON
    } catch (error) {
        console.error('Lỗi khi lấy báo cáo theo quý:', error);
        res.status(500).send('Lỗi server');
    }
};

//
exports.getAllInvoices = async (req, res) => {
    try {
        const invoices = await Invoice.find().populate('product_ids').lean();
        res.render('Invoices/ListInvoices', { invoices }); // render view cho admin và truyền danh sách hóa đơn
    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi khi lấy danh sách hóa đơn');
    }
};
// detail
exports.getDetailsInvoices = async (req, res) => {
    const invoice_id = req.params.id;
    try {
      // Tìm hoá đơn theo ID và populate product_ids để lấy thông tin sản phẩm
      const invoice = await Invoice.findById(invoice_id)
        .populate("product_ids") // Giả sử product_ids là array các ObjectId tham chiếu đến sản phẩm
        .lean();
  
      if (!invoice) {
        return res.status(404).json({ message: "Không tìm thấy hóa đơn với ID này" });
      }
      const productsWithQuantities = invoice.product_ids.map((product, index) => ({
        name: product.name,
        quantity: invoice.quantities[index] || 0, // Lấy số lượng tương ứng từ quantities
      }));
  
      res.render("Invoices/DetailInvoices", {
        invoice,
        products: productsWithQuantities,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Lỗi khi lấy thông tin hóa đơn", error: err.message });
    }
};
  // search
exports.searchInvoices = async (req, res) => {
    try {
        const query = req.query.query; // Lấy giá trị tìm kiếm từ query
        let invoices = [];

        if (query) {
            // Kiểm tra xem có phải ObjectId không
            if (mongoose.Types.ObjectId.isValid(query)) {
                invoices = await Invoice.find({
                    $or: [
                        { _id: new mongoose.Types.ObjectId(query) },  // Tìm theo Mã hóa đơn
                        { staff_name: { $regex: query, $options: 'i' } },  // Tìm theo Người tạo
                        { customer_name: { $regex: query, $options: 'i' } },  // Tìm theo Tên khách hàng
                        { phone: { $regex: query, $options: 'i' } }  // Tìm theo Số điện thoại
                    ]
                }).lean();
            } else {
                // Nếu không phải ObjectId, tìm kiếm theo các thuộc tính khác
                invoices = await Invoice.find({
                    $or: [
                        { staff_name: { $regex: query, $options: 'i' } },
                        { customer_name: { $regex: query, $options: 'i' } },
                        { phone: { $regex: query, $options: 'i' } }
                    ]
                }).lean();
            }
        } else {
            // Nếu không có query, trả về tất cả hóa đơn
            invoices = await Invoice.find().lean();
        }

        if (invoices.length === 0) {
            return res.render('Invoices/ListInvoices', { invoices, query, message: 'Không có hoá đơn nào được tìm thấy.' });
        }
        res.render('Invoices/ListInvoices', { invoices, query }); // Gửi dữ liệu hóa đơn về view
    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi khi tìm kiếm hóa đơn: ' + error.message);
    }
};

// get all cus
exports.getAllCustomer = async (req,res) => {
    try {
        const customers = await Customer.find().lean();
        const totalSpentData  = [];
        for(const customer of customers){
            const invoices = await Invoice.find({phone:customer.phone}).lean();
            const totalSpent = invoices.reduce((acc, invoice) => {
                const price = parseFloat(invoice.total_price); // Chuyển đổi thành số
                return acc + (isNaN(price) ? 0 : price); // Kiểm tra nếu không phải số thì bỏ qua
            }, 0);

            let rank;
            if (totalSpent >= 500000000) {
                rank = "VIP";
            } else if (totalSpent >= 200000000) {
                rank = "Gold";
            } else if (totalSpent >= 100000000) {
                rank = "Silver";
            } else {
                rank = "Bronze";
            }
            await Customer.updateOne({ phone: customer.phone }, { rank });
            totalSpentData.push(totalSpent);
        }
        res.status(200).render('Customer/ListCustomer',{customers,totalSpentData});
    } catch (error) {
        console.error('Error getting products:', err);
        res.status(500).send('Error getting products');
    }
};
exports.searchCustomer = async (req,res) => {
    try {
        const query = req.query.query; // Lấy giá trị tìm kiếm từ query
        let invoices = [];
        let customers = [];
        if (query) {
            // Kiểm tra xem có phải ObjectId không
            if (mongoose.Types.ObjectId.isValid(query)) {
                customers = await Customer.find({
                    $or: [
                        { fullname: { $regex: query, $options: 'i' } },  // Tìm theo Tên khách hàng
                        { phone: { $regex: query, $options: 'i' } }  // Tìm theo Số điện thoại
                    ]
                }).lean();
            } else {
                // Nếu không phải ObjectId, tìm kiếm theo các thuộc tính khác
                customers = await Customer.find({
                    $or: [
                        { fullname: { $regex: query, $options: 'i' } },
                        { phone: { $regex: query, $options: 'i' } }
                    ]
                }).lean();
            }
        } else {
            // Nếu không có query, trả về tất cả hóa đơn
            customers = await Customer.find().lean();
        }
        // Kiểm tra nếu không có hóa đơn nào
        if (customers.length === 0) {
            return res.render('Customer/ListCustomer', { customers, query, message: 'Không có khách hàng nào được tìm thấy.' });
        }

        res.render('Customer/ListCustomer', { customers, query });
    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi khi tìm kiếm hóa đơn: ' + error.message);
    }
};
exports.viewCustomerDetail = async (req, res) => {
    const customerId = req.params.id;  // Lấy ID của khách hàng từ URL

    try {
        // Tìm khách hàng trong cơ sở dữ liệu
        const customer = await Customer.findById(customerId).lean();

        if (!customer) {
            return res.status(404).render('error', { message: 'Khách hàng không tồn tại' });
        }
        
        // Tính tổng chi tiêu của khách hàng này
        const invoices = await Invoice.find({ phone: customer.phone }).lean();
        const totalSpent = invoices.reduce((acc, invoice) => {
            const price = parseFloat(invoice.total_price); // Chuyển đổi thành số
            return acc + (isNaN(price) ? 0 : price); // Kiểm tra nếu không phải số thì bỏ qua
        }, 0);

        // Xác định hạng khách hàng
        let rank;
        if (totalSpent >= 500000000) {
            rank = "VIP";
        } else if (totalSpent >= 200000000) {
            rank = "Gold";
        } else if (totalSpent >= 100000000) {
            rank = "Silver";
        } else {
            rank = "Bronze";
        }

        // Lưu hạng vào cơ sở dữ liệu
        await Customer.updateOne({ phone: customer.phone }, { rank });

        // Render trang hiển thị chi tiết khách hàng
        res.render('Customer/DetailCustomer', {
            customer,
            invoices,
            totalSpent,
            rank
        });
    } catch (err) {
        console.error('Error getting customer details:', err);
        res.status(500).render('error', { message: 'Đã xảy ra lỗi khi lấy thông tin khách hàng' });
    }
};

// lấy danh sách nhân viên và hiển thị lên
exports.getAllEmployees = async (req, res) => {
  try{
    const employees = await Account.find().lean();
    res.status(200).render('Employee/Employees', { employees});
  } catch(error){
    console.error(error);
    res.status(500).send('Lỗi khi lấy danh sách nhân viên: ' + error.message);
  } 
};

// Khóa tài khoản nhân viên
exports.lockAccountEmployees = async (req, res) => {
    try{
        if(req.query.w == 'lock'){
            const account = await Account.findById(req.params.id);
            if(account.role == 'admin'){
                return res.render('Employee/Employees', { 
                    message: 'Không thể khóa tài khoản admin', 
                    employees: await Account.find().lean()
                });
            }
            await Account.updateOne(
                { _id: req.params.id },
                { $set: { status: false, is_Active: false } }
            );
        }
        else{
            const account = await Account.findById(req.params.id);
            console.log(account);
            await Account.updateOne(
                { _id: req.params.id },
                { $set: { status: true, is_Active: false } }
            );
        }
        res.redirect('/employees');
    }catch(error){
        console.error(error);
        res.status(500).send('Lỗi khi khóa tài khoản nhân viên: ' + error.message);
    }
}


// Hàm loại bỏ dấu tiếng Việt và chuyển thành chữ thường
function removeVietnameseTones(str) {
    var newStr = str;
    newStr = newStr.replace(/á|à|ả|ã|ạ|ă|ắ|ằ|ẳ|ẵ|ặ|â|ấ|ầ|ẩ|ẫ|ậ|Á|À|Ả|Ã|Ạ|Ă|Ắ|Ằ|Ẳ|Ẵ|Ặ|Â|Ấ|Ầ|Ẩ|Ừ|Ữ|Ự/g, 'a');
    newStr = newStr.replace(/é|è|ẻ|ẽ|ẹ|ê|ế|ề|ể|ễ|ệ|É|È|Ẻ|Ẽ|Ẹ|Ê|Ế|Ề|Ể|Ễ|Ệ/g, 'e');
    newStr = newStr.replace(/i|í|ì|ỉ|ĩ|ị|I|Í|Ì|Ỉ|Ĩ|Ị/g, 'i');
    newStr = newStr.replace(/ó|ò|ỏ|õ|ọ|ô|ố|ồ|ổ|ỗ|ộ|ơ|ớ|ờ|ở|ỡ|ợ|Ó|Ò|Ỏ|Õ|Ọ|Ô|Ố|Ồ|Ổ|ỗ|Ộ|Ơ|Ớ|Ờ|Ở|Ỡ|Ợ/g, 'o');
    newStr = newStr.replace(/ú|ù|ủ|ũ|ụ|ư|ứ|ừ|ử|ữ|ự|Ú|Ù|Ủ|Ũ|Ụ|Ư|Ứ|Ừ|Ử|Ữ|Ự/g, 'u');
    newStr = newStr.replace(/ý|ỳ|ỷ|ỹ|ỵ|Ý|Ỳ|Ỷ|Ỹ|Ỵ/g, 'y');
    newStr = newStr.replace(/đ|Đ/g, 'd');
    newStr = newStr.replace(/[^a-zA-Z0-9]/g, '');  // Loại bỏ ký tự không phải chữ và số
    return newStr;
}

// Hàm kiểm tra và tạo username duy nhất
async function generateUniqueUsername(baseUsername) {
    let username = baseUsername;
    let count = 1;
    let userExists = await Account.findOne({ username: username+'@gmail.com' });

    // Kiểm tra nếu username đã tồn tại, nếu có thì thêm số vào cuối
    while (userExists) {
        username = `${baseUsername}${count}`;
        userExists = await Account.findOne({ username: username+'@gmail.com' });
        count++;
    }

    return username;
}

// Xử lý xác thực token
exports.verifyAccountToken = async (req, res) => {
    try {
        const token = req.params.token;

        // Tìm tài khoản có token tương ứng
        const account = await Account.findOne({ loginToken: token });

        if (!account) {
            return res.status(400).send('Token không hợp lệ.');
        }

        // Kiểm tra token có hết hạn không
        if (Date.now() > account.tokenExpiration) {
            return res.status(400).send('Liên kết đã hết hiệu lực. Vui lòng yêu cầu lại từ admin.');
        }

        account.loginToken = null;  // Xóa token để không dùng lại được
        account.tokenExpiration = null;  // Xóa thời gian hết hạn
        await account.save();

        req.session.user = account;
        res.redirect('/employees/changedpass')
    } catch (error) {
        console.error('Lỗi khi xác thực tài khoản:', error);
        res.status(500).send('Đã có lỗi xảy ra.');
    }
};


// Tạo tài khoản cho nhân viên mới
exports.addNewAccountForEmployee = [
    upload.single('image_url'), 
    async (req, res) =>{
        try{
            const { fullname, email } = req.body;

            const image_url = req.file ? `${req.file.filename}` : null;
            // Loại bỏ dấu và tạo username
            const baseUsername = removeVietnameseTones(fullname).toLowerCase();
            const oldUsername = baseUsername;
            const newUsername = await generateUniqueUsername(baseUsername);

            const hashedPassword = await bcrypt.hash(baseUsername, 10); 

            // Tạo tài khoản mới
            const newAccount = new Account({
                fullname: fullname,
                email: email,
                username: newUsername + '@gmail.com',  // Thêm @gmail.com vào username
                password: hashedPassword,
                profile_image: image_url,
                role: 'staff',
                status: false,
                is_Active: false,
                created_at: Date.now(),
                updated_at: null,
                birthday: null,
                address: '',
                phone: '',
                gender: '',
            });
            await newAccount.save();
            
            // tạo token để xác thực 
            const token = crypto.randomBytes(20).toString('hex');
            const expirationTime = Date.now() + 1 * 60 * 1000;

            // cập nhập account với token
            newAccount.loginToken = token;
            newAccount.tokenExpiration = expirationTime;
            await newAccount.save();

            // Tạo liên kết với token
            const loginLink = `http://localhost:3000/employees/verify/${token}`;

            // Gửi email cho nhân viên
            const mailOptions = {
            from: process.env.MAIL_ADDRESS,
                to: email,
                subject: 'Tài khoản nhân viên mới đã được tạo',
                text: `Chào ${fullname},\n\nTài khoản của bạn đã được tạo thành công. Vui lòng sử dụng liên kết sau để đăng nhập vào hệ thống lần đầu tiên:\n\n${loginLink}\n\nLiên kết này sẽ hết hiệu lực trong 1 phút.\n\nTrân trọng, \nAdmin`
            };
            
            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    console.log(err);
                    return res.status(500).send('Lỗi khi gửi email.');
                }
                console.log('Email sent: ' + info.response);
                if(oldUsername !== newUsername){
                    return  res.render('Employee/AddEmployee', {
                        message: `Tài khoản được cấp ${oldUsername + '@gmail.com'} đã tòn tại. Username mới cho nhân viên sẽ là: ${newUsername + '@gmail.com'}`,
                        redirectUrl: '/employees', 
                    });
                }
                res.render('Employee/AddEmployee', {
                    message: `Tài khoản được tạo thành công. Username của nhân viên sẽ là: ${newUsername + '@gmail.com'}`,
                    redirectUrl: '/employees', 
                });
            });

            
        } catch (error) {
            console.error('Lỗi khi tạo tài khoản:', error);
            res.status(500).send('Đã có lỗi xảy ra.');
        }
    }
];
// hàm đổi mật khẩu sau lần đầu đăng nhập
exports.changePassword = async (req, res) => {
    try {
        const {confirmPassword } = req.body;
        const userId = req.session.user._id; 
        const hashedPassword = await bcrypt.hash(confirmPassword, 10);

        // Cập nhật mật khẩu và đánh dấu là đã thay đổi mật khẩu
        await Account.findByIdAndUpdate(userId, {
            password: hashedPassword,
            isPasswordChanged: true,
            updated_at: Date.now()
        }, { new: true });

        // Điều hướng người dùng đến trang chủ hoặc trang quản lý
        res.redirect('/login');
    }catch (error) {
        console.error('Lỗi khi thay đổi mật khẩu:', error);
        res.status(500).send('Đã có lỗi xảy ra.');
    }
  };
  
// Hàm gửi lại email với liên kết đăng nhập mới
exports.resendLoginLink = async (req, res) => {
    try {
        // Tìm tài khoản nhân viên theo email
        const account = await Account.findById(req.params.id);

        if (!account) {
            return res.status(404).send('Không tìm thấy tài khoản với _id này.');
        }

        // Tạo token mới
        const token = crypto.randomBytes(20).toString('hex');
        const expirationTime = Date.now() + 1 * 60 * 1000; // 1 phút tính từ thời điểm hiện tại

        // Cập nhật tài khoản với token và thời gian hết hạn mới
        account.loginToken = token;
        account.tokenExpiration = expirationTime;
        await account.save();

        // Tạo liên kết với token
        const loginLink = `http://localhost:3000/employees/verify/${token}`;

        // Gửi email cho nhân viên với liên kết đăng nhập
        const mailOptions = {
            from: process.env.MAIL_ADDRESS,
            to: account.email,
            subject: 'Liên kết đăng nhập mới',
            text: `Chào ${account.fullname},\n\nBạn đã yêu cầu gửi lại liên kết đăng nhập.\nVui lòng sử dụng liên kết sau để đăng nhập vào hệ thống lần đầu tiên:\n\n${loginLink}\n\nLiên kết này sẽ hết hiệu lực trong 1 phút.\n\nTrân trọng, \nAdmin`
        };

        transporter.sendMail(mailOptions, async (err, info) => {
            if (err) {
                console.log(err);
                return res.status(500).send('Lỗi khi gửi email.');
            }
            console.log('Email sent: ' + info.response);
            req.flash('flash_message', 'Đã gửi lại liên kết đăng nhập cho nhân viên.');
            res.redirect('/employees');
        });

    } catch (error) {
        console.error('Lỗi khi gửi lại email đăng nhập:', error);
        res.status(500).send('Đã có lỗi xảy ra.');
    }
};

exports.getDetailsEmployee = async (req, res) => {
    try{
        const employee = await Account.findById(req.params.id).lean();
        console.log('dq23ynb27ayn27a8b3y4n78ny478yea78: ' + employee);
        res.render('Account/detail', {employee});
    }catch( error){
        console.error('Lỗi khi lấy thông tin nhân viên:', error);
        res.status(500).send('Đã có lỗi xảy ra.');
    }; 
};

exports.getProfileEmployee = async (req, res) => {
    try{
        const employee = await Account.findById(req.params.id).lean();
        req.session.employee = employee;
        console.log('ADminControllers: ' + req.session.employee);
        res.redirect('/employees/profile');
    }catch ( error){
        console.error('Lỗi khi lấy thông tin nhân viên:', error);
        res.status(500).send('Đã có lỗi xảy ra.');
    }
};

exports.getAccountEmployee = async (req, res) => {
    try{
        const account = await Account.findById(req.params.id).lean();
        req.session.account = account;
        res.redirect('/employees/account');
    }catch ( error){
        console.error('Lỗi khi lấy thông tin tài khoản nhân viên:', error);
        res.status(500).send('Đã có lỗi xảy ra.');
    }
};

exports.updateProfileEmployee = [
    upload.single('image_url'),
    async (req, res) =>{
    try{
        const employeeId = req.params.id; 
        const { email, fullname, gender, birthday, address } = req.body;

        // Kiểm tra xem có ảnh mới không
        const imageUrl = req.file ? `${req.file.filename}` : null;

        const employee = await Account.findById(employeeId);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found!' });
        }
        const updateFields = {};

        if (email && email !== employee.email) updateFields.email = email;
        if (fullname && fullname !== employee.fullname) updateFields.fullname = fullname;
        if (gender && gender !== employee.gender) updateFields.gender = gender;
        if (birthday && birthday !== employee.birthday) updateFields.birthday = birthday;
        if (address && address !== employee.address) updateFields.address = address;

        // Nếu có ảnh mới, cập nhật ảnh
        if (imageUrl && imageUrl !== employee.profile_image) {
            updateFields.profile_image = imageUrl;

            // Nếu có ảnh cũ, xóa ảnh cũ
            if (employee.profile_image) {
                const oldImagePath = path.join(__dirname, '..', 'public/img/employees_img/', employee.profile_image);
                console.log(oldImagePath);
                fs.unlink(oldImagePath, (err) => {
                    if (err) {
                        console.error('Error deleting old image:', err);
                    }
                });
            }
        }

        // Cập nhật thông tin nhân viên
        const updatedEmployee = await Account.findByIdAndUpdate(employeeId, updateFields, { new: true }).lean();

        req.session.employee = updatedEmployee;
        res.render('Employee/Profile', {employee: updatedEmployee, message: 'Cập nhập thông tin thành công'});


    }catch(error){
        console.error('Lỗi khi cập nhật thông tin nhân viên:', error);
        req.session.employee = await Account.findById(req.params.id).lean();
        res.render('Employee/Profile', {employee: await Account.findById(req.params.id).lean(), message: 'Cập nhập thông tin thất bại'});
    }
}];

exports.updateAccountEmployee = async (req, res) =>{
    try{
        let account = await Account.findById(req.params.id).lean();
        const passwordNew = await bcrypt.hash(req.body.passwordNew, 10);
        if(!await bcrypt.compare(req.body.passwordOld, account.password)){
            return res.render('Employee/Account', {message: 'Mật khẩu cũ không đúng', account: account});
        }
        await Account.updateOne(
            { _id: req.params.id },
            { $set: { password: passwordNew} }
        );
        account = await Account.findById(req.params.id).lean();
        req.session.account = account;
        req.session.message = 'Cập nhập mật khẩu thành công';
        res.redirect('/employees/account');
    }catch(error){
        console.error('Lỗi khi cập nhật thông tin tài khoản nhân viên:', error);
        res.status(500).send('Đã có lỗi xảy ra');
    }
}

exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.find().lean(); 
        res.status(200).render('Employee/WorkSpace', { products});
    } catch (err) {
        console.error('Error getting products:', err);
        res.status(500).send('Error getting products');
    }
};


exports.getInvoicesForWorkSpace = async (req, res) => {
    try{
        const invoices = await Invoice.find().lean();
        res.status(200).render('Employee/InvoicesWk', {invoices: invoices});
    }catch(error){
        console.error('Lỗi khi lấy hóa đơn:', error);
        res.status(500).send('Đã có lỗi xảy ra');
    }
};

exports.getDetailInvoiceForWorkSpace = async( req, res) => {
    const invoice_id = req.params.id;
    try {
      // Tìm hoá đơn theo ID và populate product_ids để lấy thông tin sản phẩm
      const invoice = await Invoice.findById(invoice_id)
        .populate("product_ids") // Giả sử product_ids là array các ObjectId tham chiếu đến sản phẩm
        .lean();
  
      if (!invoice) {
        return res.status(404).json({ message: "Không tìm thấy hóa đơn với ID này" });
      }
      const productsWithQuantities = invoice.product_ids.map((product, index) => ({
        name: product.name,
        quantity: invoice.quantities[index] || 0, // Lấy số lượng tương ứng từ quantities
      }));
  
      res.render("Employee/DetailsEvc", {
        invoice,
        products: productsWithQuantities,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Lỗi khi lấy thông tin hóa đơn", error: err.message });
    }
}