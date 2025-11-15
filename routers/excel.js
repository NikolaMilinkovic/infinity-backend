const express = require('express');
const {
  AddCourierExcelPreset,
  GetCourierExcelPresets,
  RemoveCourierExcelPreset,
} = require('../controllers/excelController');
const router = new express.Router();

router.route('/courier-excel-presets').get(GetCourierExcelPresets).post(AddCourierExcelPreset);
router.route('/courier-excel-presets/:id').delete(RemoveCourierExcelPreset);

module.exports = router;
