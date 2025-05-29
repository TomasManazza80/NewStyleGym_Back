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





const processWebhookData = async (webhookData, req) => {
  if (!webhookData) {
    console.log("Webhook sin datos recibido");
    return; // Salir silenciosamente
  }

  // 1. Aceptar tanto webhooks reales como de prueba (ignorar merchant_order)
  if (webhookData.type !== 'payment') {
    console.log(`Webhook ignorado (tipo no soportado): ${webhookData.type}`);
    return;
  }

  // 2. Extraer ID del pago (del webhook o de la URL)
  // Se agregó 'req' como parámetro para acceder a req.query
  const paymentId = webhookData.data?.id || req.query['data.id']; // Compatibilidad con MercadoPago
  if (!paymentId) {
    console.error("No se encontró ID de pago");
    return;
  }

  try {
    // 3. Consultar el pago a la API de MercadoPago (sin importar live_mode)
    const response = await axios.get(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      
      {
        headers: {
          // Asegúrate de que MERCADOPAGO_ACCESS_TOKEN esté configurado correctamente en tu archivo .env
          Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        },
      }
    );

    const payment = response.data;
    console.log("Estado del pago:", payment.status);

    // 4. Identificar al usuario (flexible)
    const userId = payment.external_reference || payment.payer?.id || 'guest';
    console.log(`Usuario asociado: ${userId}`);

    // 5. Procesar pagos aprobados (incluyendo pruebas)
    if (payment.status === 'approved') {
      console.log(`✅ Pago ${paymentId} aprobado. Usuario: ${userId}`);
      // Ejemplo: Actualizar base de datos (compatible con pruebas)
      // await userService.updateSubscription(userId, { active: true });
    }

  } catch (error) {
    console.error(`Error al procesar el pago ${paymentId}:`, error.message);
    // No relanzar el error para evitar reintentos de MercadoPago
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
