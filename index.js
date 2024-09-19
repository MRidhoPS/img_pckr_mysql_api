const express = require('express')
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const app = express();

const cors = require('cors');
app.use(cors());


const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'mysql10',
    database: 'image_test',
});

db.connect(err => {
    if (err) throw err;
    console.log('MySQL Connected...');
});



// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage: storage });

// Endpoint to upload image
app.post('/upload', upload.single('image'), (req, res) => {
    const imagePath = `/uploads/${req.file.filename}`;
    const sql = 'INSERT INTO images (image_name, image_path) VALUES (?, ?)';
    db.query(sql, [req.file.originalname, imagePath], (err, result) => {
        if (err) throw err;
        res.json({ message: 'Image uploaded successfully', imagePath });
    });
});

// Endpoint to fetch image
app.get('/images/:id', (req, res) => {
    const sql = 'SELECT * FROM images WHERE image_id = ?';
    db.query(sql, [req.params.id], (err, result) => {
        if (err) throw err;
        const image = result[0];
        res.sendFile(path.join(__dirname, image.image_path));
    });
});

// Endpoint to fetch the list of all uploaded images
app.get('/images', (req, res) => {
    const sql = 'SELECT * FROM images';
    db.query(sql, (err, result) => {
        if (err) throw err;
        res.json(result);
    });
});

// Endpoint to edit/replace an existing image
app.put('/edit-image/:id', upload.single('image'), (req, res) => {
    const id = req.params.id;
    const imageName = req.file.filename;
    const imagePath = '/uploads/' + imageName;

    // First, find the old image file path to delete it from the server (optional)
    const findOldImageQuery = 'SELECT image_path FROM images WHERE image_id = ?';
    db.query(findOldImageQuery, [id], (err, result) => {
        if (err) throw err;

        const oldImagePath = result[0].image_path;

        // Optionally delete the old image from the file system
        const fs = require('fs');
        fs.unlink(`.${oldImagePath}`, (err) => {
            if (err) console.log('Failed to delete old image:', err);
            else console.log('Old image deleted:', oldImagePath);
        });

        // Update the image in the database
        const sql = 'UPDATE images SET image_name = ?, image_path = ? WHERE image_id = ?';
        db.query(sql, [imageName, imagePath, id], (err, result) => {
            if (err) throw err;
            res.json({ message: 'Image updated successfully', imagePath: imagePath });
        });
    });
});



// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

// Start the server
app.listen(3000, () => {
    console.log('Server started on port 3000');
});