const express = require('express');
const { addBoutique, getBoutiqueUsers } = require('../controllers/adminController');
const router = new express.Router();

router.route('/add-boutique').post(addBoutique);
router.route('/get-boutique-users').get(getBoutiqueUsers);

module.exports = router;
