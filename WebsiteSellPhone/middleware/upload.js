const multer = require('multer');
const path = require('path');


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Lưu vào thư mục 'public/img/employees_img
        cb(null, 'public/img/employees_img');
    },
    filename: (req, file, cb) => {
        // Đặt tên file là tên gốc của file (với đuôi .jpg/.png/.jpeg)
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// Khởi tạo middleware multer
const upload = multer({ storage: storage });

module.exports = upload;