const express = require('express');
const {
  AddCourierExcelPreset,
  GetCourierExcelPresets,
  RemoveCourierExcelPreset,
  UpdateCourierExcelPreset,
} = require('../controllers/excelController');
const router = new express.Router();

router.route('/courier-excel-presets').get(GetCourierExcelPresets).post(AddCourierExcelPreset);
router.route('/courier-excel-presets/:id').delete(RemoveCourierExcelPreset);
router.route('/update-courier-excel-preset/:id').patch(UpdateCourierExcelPreset);

module.exports = router;
