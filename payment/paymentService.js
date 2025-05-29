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
      success: 'https://gymnewstylesantafe.netlify.app/products', 
      failure: 'https://gymnewstylesantafe.netlify.app/products',
      pending: 'http://localhost:5173', // Ojo: en producción debe ser una URL pública
    },
    auto_return: 'approved',
    external_reference: id, // Usar id como referencia externa para identificar al usuario
  };

  try {
    const preference = await mercadopago.preferences.create(preferenceData);
    return preference.body;
  } catch (error) {
    throw error;
  }
};

// ****************************************************
// LÓGICA DE IDEMPOTENCIA (ADAPTAR A TU BASE DE DATOS)
// ****************************************************
// Esto es CRÍTICO para evitar que un pago se procese varias veces
// si Mercado Pago reintenta el webhook.

const hasPaymentBeenProcessed = async (paymentId) => {
  // TODO: Implementa esto con tu base de datos.
  // Ejemplo conceptual:
  // const existingRecord = await YourPaymentModel.findOne({ mercadopagoId: paymentId });
  // return existingRecord && existingRecord.status === 'processed_by_webhook';
  console.log(`[Idempotencia] Verificando si el pago ${paymentId} ya fue procesado.`);
  return false; // Por ahora, asume que no ha sido procesado (cambiar para prod)
};

const markPaymentAsProcessed = async (paymentId, userId, amount, paymentMethod) => {
  // TODO: Implementa esto con tu base de datos.
  // Guarda el ID de Mercado Pago, el ID del usuario, el monto, el método,
  // y marca el registro como procesado.
  console.log(`[Idempotencia] Marcando pago ${paymentId} como procesado para usuario ${userId}.`);
  // Ejemplo conceptual:
  // await YourPaymentModel.createOrUpdate({ 
  //   mercadopagoId: paymentId, 
  //   userId: userId, 
  //   amount: amount, 
  //   paymentMethod: paymentMethod,
  //   status: 'processed_by_webhook' 
  // });
};

// ****************************************************
// FIN LÓGICA DE IDEMPOTENCIA
// ****************************************************

// `queryParams` se pasa desde el controller para acceder a `data.id` de la URL
const processWebhookData = async (webhookData, queryParams) => {
  if (!webhookData) {
    console.warn("Webhook sin datos recibido.");
    return;
  }

  console.log(`Tipo de webhook recibido: ${webhookData.type}`);

  // Mercado Pago envía 'topic_merchant_order_wh' para órdenes de venta, pero el pago en sí es 'payment'.
  // Solo procesaremos explícitamente los webhooks de tipo 'payment'.
  // La imagen de ejemplo muestra `type: "payment"`, pero el log anterior tuyo fue `type: 'topic_merchant_order_wh'`.
  // Es importante manejar el tipo correcto. Si necesitas `merchant_order`, la lógica sería diferente.
  if (webhookData.type !== 'payment') {
      console.log(`Webhook de tipo '${webhookData.type}' ignorado. Solo se procesan 'payment' webhooks.`);
      return;
  }

  // 2. Extraer ID del pago
  // Primero intenta de webhookData.data.id (body), luego de queryParams['data.id'] (URL)
  const paymentId = webhookData.data?.id || queryParams['data.id']; 
  if (!paymentId) {
    console.error("No se encontró ID de pago en el webhook.");
    return;
  }

  // 3. Lógica de Idempotencia: Verifica si ya fue procesado
  if (await hasPaymentBeenProcessed(paymentId)) {
    console.log(`Pago ${paymentId} ya ha sido procesado. Ignorando reintento.`);
    return;
  }

  try {
    // 4. Consultar el pago a la API de MercadoPago para obtener detalles completos
    // Esto es vital para confirmar el estado y obtener todos los detalles del pago.
    const response = await axios.get(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer APP_USR-6873100345219151-052215-3db26a9b390a78fbf929b41ffda94acf-1286636359`,
        },
      }
    );

    const payment = response.data;
    console.log("Detalles completos del pago de Mercado Pago:", payment);

    // 5. Identificar al usuario (asumiendo external_reference es tu ID de usuario)
    const userId = payment.external_reference; // Asume que external_reference es el ID de tu usuario
    if (!userId) {
      console.warn(`external_reference no encontrado para el pago ${paymentId}. No se pudo asociar a un usuario.`);
      return;
    }
    console.log(`Usuario asociado: ${userId}`);

    // 6. Procesar solo pagos aprobados
    if (payment.status === 'approved') {
      console.log(`✅ Pago ${paymentId} aprobado. Usuario: ${userId}.`);
      
      // *** AQUÍ ES DONDE TOMAS COMO PAGADO EL MES ***
      // Esto es un EJEMPLO. Debes adaptar la lógica a tu modelo de usuario y suscripción.
      try {
        console.log(`Activando/actualizando mes para el usuario ${userId}...`);
        const amount = payment.transaction_amount;
        const paymentMethod = payment.payment_method_id;
        const payerEmail = payment.payer?.email;
        
        // Asumiendo que `userService.activateMonth` existe y actualiza el estado de pago del usuario
        // o agrega un mes a su suscripción.
        // await userService.activateMonth(userId, { 
        //   paymentId: paymentId, 
        //   amount: amount, 
        //   paymentMethod: paymentMethod, 
        //   payerEmail: payerEmail,
        //   dateApproved: payment.date_approved
        // });
        console.log(`Mes activado para el usuario ${userId} por el pago ${paymentId}.`);
        
        // IMPORTANTE: Marcar el pago como procesado para idempotencia
        await markPaymentAsProcessed(paymentId, userId, amount, paymentMethod);

      } catch (activationError) {
        console.error(`Error al activar el mes para el usuario ${userId} por el pago ${paymentId}:`, activationError.message);
        // Podrías querer loguear esto o enviar una alerta
      }

      // Si tenías una función `success` que NO re-enviaba webhooks a localhost,
      // y quieres que se ejecute después de procesar el pago, puedes llamarla aquí.
      // success(webhookData); 

    } else {
      console.log(`Pago ${paymentId} no está aprobado (estado actual: ${payment.status}).`);
      // Aquí puedes manejar otros estados si es necesario (ej. 'pending', 'rejected', 'cancelled')
      // await userService.updatePaymentStatus(userId, paymentId, payment.status);
    }

  } catch (error) {
    console.error(`Error al consultar detalles de pago ${paymentId} o en el procesamiento:`, error.message);
    if (error.response) {
      console.error('Datos de error de Axios:', error.response.data);
    }
    // No relanzar el error para evitar reintentos de Mercado Pago.
    // El 200 OK ya se envió en el controlador.
  }
};

// Esta función NO debe re-enviar webhooks a localhost.
// La he dejado vacía, si tiene otro propósito, adáptala.
const success = async (webhookData) => {
    console.log("Función 'success' ejecutada para webhook. Ya no re-envía a localhost.");
    // Aquí puedes poner lógica para notificar a otros sistemas internos
    // o logging adicional después del procesamiento principal.
};


module.exports = {
  createPreference,
  processWebhookData,
  success
};
