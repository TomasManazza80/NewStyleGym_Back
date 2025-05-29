const mercadopago = require('mercadopago');
const productService = require('../services/productService');
const userService = require('../services/userServices'); // Importar userService
const axios = require('axios'); // Importar axios

const createPreference = async (createPaymentDto, id) => {
  const client = {
    access_token: 'APP_USR-6873100345219151-052215-3db26a9b390a78fbf929b41ffda94acf-1286636359',
  };

  mercadopago.configure(client);

  const preferenceData = {
    items: [
      {
        title: createPaymentDto.title,
        quantity: Number(createPaymentDto.quantity),
        unit_price: Number(createPaymentDto.price),
        currency_id: 'ARS',
      },
    ],
    back_urls: {
      success: 'http://localhost:5173', 
      failure: 'http://localhost:5173',
      pending: 'http://localhost:5173',
    },
    auto_return: 'approved',
    external_reference: id,
  };

  try {
    const preference = await mercadopago.preferences.create(preferenceData);
    return preference.body;
  } catch (error) {
    throw error;
  }
};

const processWebhookData = async (webhookData) => {
  if (webhookData) {
    const userId = webhookData.data.user_id;
    const ActualyMonth = new Date().getMonth() + 1; // getMonth() devuelve un valor de 0 a 11, por eso se suma 1
    await userService.addmountserveice(userId, ActualyMonth); // Usar userId
  } else {
    console.error('No se encontró información del usuario!!!!!!');
  }
};

const success = async (webhookData) => {
  const url = 'http://localhost:5173/'; // SI LA OPERACION ES EXITOSA, SE REDIRECCIONA ESTA URL
  const data = {
    id: webhookData.id,
    type: webhookData.type,
    entity: webhookData.entity,
    action: webhookData.action,
    date: webhookData.date,
    model_version: webhookData.model_version,
    version: webhookData.version,
    data: {
      id: webhookData.data.id,
      status: webhookData.data.status,
      amount: webhookData.data.amount,
      payment_method_id: webhookData.data.payment_method_id,
      payer: {
        id: webhookData.data.payer.id,
        name: webhookData.data.payer.name,
        email: webhookData.data.payer.email
      },
      product: {
        id: webhookData.data.product.id,
        name: webhookData.data.product.name,
        quantity: webhookData.data.product.quantity
      }
    }
  };

  try {
    const response = await axios.post(url, data);
    console.log('Pago exitoso. Respuesta:', response.data);
  } catch (error) {
    console.error('Error al enviar pago exitoso:', error);
  }
};

module.exports = {
  createPreference,
  processWebhookData,
  success
};
