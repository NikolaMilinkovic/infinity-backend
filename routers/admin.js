const express = require('express');
const { addBoutique } = require('../controllers/adminController');
const router = new express.Router();

router.route('/add-boutique').post(addBoutique);

module.exports = router;
