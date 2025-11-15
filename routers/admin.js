const express = require('express');
const { addBoutique, getBoutiqueUsers, getBoutiques } = require('../controllers/adminController');
const router = new express.Router();

router.route('/add-boutique').post(addBoutique);
router.route('/get-boutique-users').get(getBoutiqueUsers);
router.route('/get-boutiques').get(getBoutiques);

module.exports = router;
