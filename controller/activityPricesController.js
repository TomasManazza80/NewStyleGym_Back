const ActivityPrices = require('../models/activity/ActivityPrices');

const activityPricesController = {
    // Get all prices
    getPrices: async (req, res) => {
        try {
            const prices = await ActivityPrices.findOne();
            res.json(prices);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Update prices
    updatePrices: async (req, res) => {
        try {
            const { unaActividad, paseLibre, estudiante3dias } = req.body;
            
            const prices = await ActivityPrices.findOne();
            if (prices) {
                prices.unaActividad = unaActividad;
                prices.paseLibre = paseLibre;
                prices.estudiante3dias = estudiante3dias;
                prices.updatedAt = Date.now();
                await prices.save();
            } else {
                await ActivityPrices.create({
                    unaActividad,
                    paseLibre,
                    estudiante3dias
                });
            }
            
            res.json({ message: 'Prices updated successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};

module.exports = activityPricesController;