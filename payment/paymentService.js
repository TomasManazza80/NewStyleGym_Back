const mercadopago = require('mercadopago');
const productService = require('../services/productService');
const userService = require('../services/userServices'); // Importar userService
const axios = require('axios'); // Importar axios

// Función auxiliar para obtener el nombre del mes
const getMonthName = (date) => {
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  return monthNames[date.getMonth()];
};

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

const hasPaymentBeenProcessed = async (paymentId) => {
  // TODO: Implementa esto con tu base de datos.
  console.log(`[Idempotencia] Verificando si el pago ${paymentId} ya fue procesado.`);
  return false; // Por ahora, asume que no ha sido procesado (cambiar para prod)
};

const markPaymentAsProcessed = async (paymentId, userId, amount, paymentMethod) => {
  // TODO: Implementa esto con tu base de datos.
  console.log(`[Idempotencia] Marcando pago ${paymentId} como procesado para usuario ${userId}.`);
};

// ****************************************************
// FIN LÓGICA DE IDEMPOTENCIA
// ****************************************************

const processWebhookData = async (webhookData, queryParams) => {
  if (!webhookData) {
    console.warn("Webhook sin datos recibido.");
    return;
  }

  console.log(`Tipo de webhook recibido: ${webhookData.type}`);

  if (webhookData.type !== 'payment') {
    console.log(`Webhook de tipo '${webhookData.type}' ignorado. Solo se procesan 'payment' webhooks.`);
    return;
  }

  const paymentId = webhookData.data?.id || queryParams['data.id'];
  if (!paymentId) {
    console.error("No se encontró ID de pago en el webhook.");
    return;
  }

  if (await hasPaymentBeenProcessed(paymentId)) {
    console.log(`Pago ${paymentId} ya ha sido procesado. Ignorando reintento.`);
    return;
  }

  try {
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

    let userIdCandidate = payment.external_reference; // Usamos un nombre temporal para evitar confusión
    const payerEmail = payment.payer?.email;

    // Si external_reference está vacío, intentamos usar payerEmail
    if (!userIdCandidate) {
      console.warn(`external_reference no encontrado para el pago ${paymentId}. Intentando usar payerEmail.`);
      if (payerEmail) {
        userIdCandidate = payerEmail;
        console.log(`Usando payerEmail como posible ID/Email de usuario: ${userIdCandidate}`);
      } else {
        console.warn(`Ni external_reference ni payerEmail encontrados. No se pudo asociar a un usuario.`);
        return;
      }
    }
    console.log(`Valor inicial para userIdCandidate: ${userIdCandidate}`);

    let finalUserId;

    // AHORA SÍ, VERIFICAMOS SI userIdCandidate ES UN EMAIL Y LO USAMOS COMO TAL
    if (userIdCandidate.includes('@')) {
      const userEmail = userIdCandidate; // Renombramos para mayor claridad
      console.log(`El valor de userIdCandidate (${userEmail}) parece ser un email. Obteniendo ID numérico...`);
      try {
        // *** CORRECCIÓN CLAVE AQUÍ: usar userEmail en la URL ***
        const getIdResponse = await axios.get(`https://newstylegym-back.onrender.com/getId/${userEmail}`);
        finalUserId = getIdResponse;
        console.log(`ID numérico obtenido para ${userEmail}: ${finalUserId}`);
        if (!finalUserId) {
          console.error(`No se pudo obtener el ID numérico para el email: ${userEmail}`);
          return;
        }
      } catch (getEmailIdError) {
        console.error(`Error al obtener ID del usuario por email (${userEmail}):`, getEmailIdError.message);
        return;
      }
    } else {
      // Si no es un email, asumimos que ya es el ID numérico
      finalUserId = userIdCandidate;
      console.log(`El valor de userIdCandidate (${userIdCandidate}) se considera un ID numérico.`);
    }

    finalUserId = Number(finalUserId);
    if (isNaN(finalUserId)) {
      console.error(`El ID final del usuario no es un número válido: ${finalUserId}`);
      return;
    }

    if (payment.status === 'approved') {
      console.log(`✅ Pago ${paymentId} aprobado. Usuario: ${finalUserId}.`);

      try {
        console.log(`Activando/actualizando mes para el usuario ${finalUserId}...`);
        const amount = payment.transaction_amount;
        const paymentMethod = payment.payment_method_id;

        const currentMonth = getMonthName(new Date());
        console.log(`Mes actual para el pago: ${currentMonth}`);

        const addMountBody = {
          userId: finalUserId,
          month: currentMonth
        };

        console.log("Enviando POST a /addMount con body:", addMountBody);

        await axios.post('https://newstylegym-back.onrender.com/addMount', addMountBody);
        console.log(`POST a /addMount enviado con éxito para el usuario ${finalUserId}.`);

        await markPaymentAsProcessed(paymentId, finalUserId, amount, paymentMethod);

      } catch (activationError) {
        console.error(`Error al activar el mes para el usuario ${finalUserId} por el pago ${paymentId} o al enviar a /addMount:`, activationError.message);
        if (activationError.response) {
          console.error('Datos de error de Axios desde /addMount:', activationError.response.data);
        }
      }

    } else {
      console.log(`Pago ${paymentId} no está aprobado (estado actual: ${payment.status}).`);
    }

  } catch (error) {
    console.error(`Error al consultar detalles de pago ${paymentId} o en el procesamiento:`, error.message);
    if (error.response) {
      console.error('Datos de error de Axios:', error.response.data);
    }
  }
};

const success = async (webhookData) => {
  console.log("Función 'success' ejecutada para webhook. Ya no re-envía a localhost.");
};

module.exports = {
  createPreference,
  processWebhookData,
  success
};
