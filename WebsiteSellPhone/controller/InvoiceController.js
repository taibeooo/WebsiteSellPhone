const Invoice = require('../model/InvoiceModel');
const Product = require('../model/ProductModel');
const Customer = require('../model/CustomerModel');

const PDFDocument = require('pdfkit');
const path = require('path');


exports.createInvoice = async (req, res) => {
    try {
        const cart = req.session.cart || [];
        const { phone, fullname, address, amount_given } = req.body;
        const salesperson = req.session.admin ? req.session.admin.fullname : '';

        // Lấy danh sách product_ids và quantities từ cart
        const product_ids = cart.map(item => item.productId);
        const quantities = cart.map(item => item.quantity);

        // Tính tổng giá từ cart
        let total_price = 0;
        const productDetails = []; // Mảng chứa thông tin sản phẩm

        for (const item of cart) {
            const product = await Product.findById(item.productId).lean();
            if (product) {
                total_price += product.retail_price * item.quantity;
                productDetails.push({
                    name: product.name,
                    quantity: item.quantity,
                    price: product.retail_price,
                    subtotal: product.retail_price * item.quantity
                });
            }
        }

        const change_due = amount_given - total_price;

        if (change_due < 0) {
            // Truyền lại toàn bộ dữ liệu vào view, bao gồm cả thông tin giỏ hàng
            return res.render('checkout', { 
                cart: productDetails, // Đảm bảo thông tin giỏ hàng đầy đủ
                total: total_price, 
                phone, 
                fullname, 
                address, 
                amount_given, 
                message: 'Số tiền nhận không đủ để thanh toán', 
                error: true 
            });
        }

        const newInvoice = new Invoice({
            product_ids,
            staff_name: salesperson,
            customer_name: fullname,
            customer_address: address,
            phone,
            quantities,
            total_price,
            amount_given,
            change_due,
            products: productDetails
        });

        await newInvoice.save();

        // Cập nhật rank của khách hàng
        const invoices = await Invoice.find({ phone }).lean();
        const totalSpent = invoices.reduce((acc, invoice) => {
            const price = parseFloat(invoice.total_price);
            return acc + (isNaN(price) ? 0 : price);
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

        await Customer.updateOne({ phone }, { rank });

        req.session.cart = [];
        res.render('invoices', { 
            invoice: newInvoice, 
            salesperson,
            phone,
            fullname,
            address,
            total: total_price,
            amount_given,
            change_due,
            productDetails,
            message: 'Hóa đơn đã được tạo thành công!',
            invoiceId: newInvoice._id
        });
    } catch (error) {
        console.error(error);
        res.render('checkout', { 
            cart: req.session.cart || [], 
            phone: req.body.phone || '', 
            fullname: req.body.fullname || '', 
            address: req.body.address || '', 
            amount_given: req.body.amount_given || '', 
            message: 'Lỗi khi tạo hóa đơn: ' + error.message, 
            error: true 
        });
    }
};



exports.downloadInvoicePdf = async (req, res) => {
    try {
        const invoiceId = req.params.id; // Lấy ID hóa đơn từ URL
        const invoice = await Invoice.findById(invoiceId).populate('product_ids').lean(); // Tìm hóa đơn theo ID và populate thông tin sản phẩm

        if (!invoice) {
            return res.status(404).send('Hóa đơn không tồn tại');
        }

        const doc = new PDFDocument();
        let filename = `invoice-${invoiceId}.pdf`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/pdf');

        doc.pipe(res); // Gửi PDF đến response
        const fontPath = path.join(__dirname, '../public/fonts/ARIAL.TTF'); // Đảm bảo font có tồn tại
        doc.font(fontPath);

        // Thêm nội dung vào PDF
        doc.fontSize(20).text('Hóa Đơn', { align: 'center' });
        doc.moveDown();

        // Thêm thông tin hóa đơn
        doc.fontSize(12).text(`Mã hóa đơn: ${invoiceId}`);
        doc.text(`Nhân viên bán hàng: ${invoice.staff_name}`);

        doc.text(`Họ và tên: ${invoice.customer_name}`);
        doc.text(`Họ và tên: ${invoice.phone}`);
        doc.text(`Địa chỉ: ${invoice.customer_address}`);
        
        doc.text(`Ngày tạo: ${new Date(invoice.created_at).toLocaleDateString('vi-VN')}`); // Thêm ngày tạo
        doc.moveDown();

        // Thêm danh sách sản phẩm
        doc.text('Danh mục sản phẩm mua:', { underline: true });
        doc.moveDown();

        if (Array.isArray(invoice.product_ids) && invoice.product_ids.length > 0) {
            // Tạo tiêu đề cho bảng sản phẩm
            const headers = ['Tên sản phẩm', 'Thông tin giá'];
        
            // Vị trí x cho từng cột
            const startX = 50; // Vị trí x bắt đầu
            const rightAlignX = 500; // Vị trí x cho tiêu đề "Thông tin giá" bên phải
        
            // In tiêu đề trên một hàng
            doc.text(headers[0], { x: startX, align: 'left' }); // Tên sản phẩm bên trái
            doc.text(headers[1], { x: rightAlignX, align: 'right' }); // Thông tin giá bên phải

        
            // Xuống dòng sau khi in tất cả tiêu đề
            doc.moveDown(); 
        
            // In thông tin sản phẩm
            invoice.product_ids.forEach((product, index) => {
                const quantity = invoice.quantities[index] || 0; // Đảm bảo quantity tồn tại
                const price = product.retail_price ? product.retail_price.toString() : '0'; // Đảm bảo price tồn tại
                const subtotal = (quantity * parseFloat(price)).toFixed(2); // Tính thành tiền và định dạng
        
                // In tên sản phẩm
                doc.text(product.name, { x: startX, align: 'left', lineBreak: true });
        
                // In số lượng, giá và thành tiền trong cùng một hàng
                doc.text('Số lượng:'+ quantity.toString(), { x: rightAlignX - 100, align: 'right' });
                doc.text('Giá:'+price.toString(), { x: rightAlignX - 50, align: 'right' });
                doc.text('Thành tiền:'+subtotal, { x: rightAlignX, align: 'right' });
        
                // Xuống dòng sau khi in tất cả thông tin của sản phẩm
                doc.moveDown();
            });
        } else {
            doc.text('Không có sản phẩm nào trong hóa đơn.');
        }
        
        // Đặt vị trí x cho các dòng thông tin bên phải
        const rightAlignX = 500;
        const lineY = doc.y + 10;
        doc.moveTo(rightAlignX - 150, lineY); // Bắt đầu từ bên trái so với rightAlignX
        doc.lineTo(rightAlignX + 50, lineY); // Kết thúc bên phải so với rightAlignX
        doc.stroke(); // Vẽ đường kẻ
        doc.moveDown();
        doc.text(`Tổng tiền: ${invoice.total_price.toString()}`, { x: rightAlignX, align: 'right' });
        doc.text(`Số tiền nhận: ${invoice.amount_given.toString()}`, { x: rightAlignX, align: 'right' });
        doc.text(`Số tiền thối lại: ${invoice.change_due.toString()}`, { x: rightAlignX, align: 'right' });

        doc.end(); // Kết thúc và gửi PDF
    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi khi tạo PDF');
    }
};





