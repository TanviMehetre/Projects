const mongoose = require('mongoose');
const validator = require('validator')

mongoose.connect('mongodb://127.0.0.1:27017/Task5')
    .then(() => console.log('Connected Successfully!'))
    .catch(err => console.error('Connection failed:', err));