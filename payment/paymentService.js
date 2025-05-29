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
  if (!webhookData) {
    throw new Error('No se recibieron datos del webhook');
  }

  // Validar que sea un webhook de pago y en modo producción (live_mode: true)
  if (webhookData.type !== 'payment' || !webhookData.live_mode) {
    console.log('Webhook ignorado (no es un pago real)');
    return;
  }

  const paymentId = webhookData.data.id;
  if (!paymentId) {
    throw new Error('No se encontró el ID del pago en el webhook');
  }

  try {
    // Consultar el pago en MercadoPago
    const response = await axios.get(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer APP_USR-6873100345219151-052215-3db26a9b390a78fbf929b41ffda94acf-1286636359`,
        },
      }
    );
console.log('Respuesta del ID %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%:', response.data);
    const paymentStatus = response.data.status;
    console.log(`Estado del pago@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ ${paymentId}:`, paymentStatus);

    // Si el pago está aprobado, actualizar la base de datos
    if (paymentStatus === 'approved') {
      const userId = response.data.external_reference;
      console.log(`---------------------------------------------------external_reference del pago: ${userId}`);
      if (!userId) {
        throw new Error('No se encontró external_reference en el webhook');
      } 

      // Aquí iría tu lógica para actualizar el usuario (ej: userService.updateUser)
      console.log(`Pago aprobado. Actualizar usuario ${userId}`);
    }
  } catch (error) {
    if (error.response?.status === 404) {
      console.error(`Pago ${paymentId} no encontrado (¿ID válido?)`);
    } else {
      throw new Error(`Error al consultar el pago: ${error.message}`);
    }
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
