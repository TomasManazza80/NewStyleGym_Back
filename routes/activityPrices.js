const express = require('express');
const router = express.Router();
const activityPricesController = require('../controller/activityPricesController');
// const { verifyToken } = require('../middleware/auth');

router.get('/prices', activityPricesController.getPrices);
router.post('/update-prices', activityPricesController.updatePrices);

module.exports = router;