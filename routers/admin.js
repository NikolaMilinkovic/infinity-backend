const express = require('express');
const { addBoutique, getBoutiqueUsers, getBoutiques, changeBoutique } = require('../controllers/adminController');
const router = new express.Router();

router.route('/add-boutique').post(addBoutique);
router.route('/get-boutique-users').get(getBoutiqueUsers);
router.route('/get-boutiques').get(getBoutiques);

router.route('/change-boutique/:id').post(changeBoutique);
module.exports = router;
