const axios = require('axios');

const MERCADO_PAGO_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const API_URL = process.env.VITE_API_URL;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 segundos

const getMonthName = (date) => {
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  return monthNames[date.getMonth()];
};

const fetchPaymentWithRetry = async (paymentId, retries = MAX_RETRIES) => {
  try {
    const response = await axios.get(
      `https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    if (error.response?.status === 404 && retries > 0) {
      console.log(`Payment ${paymentId} not found, retrying (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchPaymentWithRetry(paymentId, retries - 1);
    }
    throw error;
  }
};

const processWebhookData = async (webhookData, queryParams) => {
  const paymentId = webhookData.data?.id || queryParams['data.id'];
  if (!paymentId) {
    console.log("---------------------------------");
    console.error("❌ No se encontró ID de pago en el webhook.");
    console.log("---------------------------------");
    return;
  }

  try {
    // Consultar pago con reintentos
    const payment = await fetchPaymentWithRetry(paymentId);
    
    const payerEmail = payment.payer?.email;
    if (!payerEmail) {
      console.log("---------------------------------");
      console.error(`❌ No se encontró el email del pagador para el pago ${paymentId}.`);
      console.log("---------------------------------");
      return;
    }

    console.log("---------------------------------");
    console.log(`✉️ Email del pagador encontrado: ${payerEmail}`);
    console.log("---------------------------------");

    if (payment.status === 'approved') {
      // Resto de tu lógica...
    }

  } catch (error) {
    console.log("---------------------------------");
    console.error(`❌ Error al procesar el webhook para el pago ${paymentId}:`, error.message);
    if (error.response) {
      console.error('Detalles del error:', {
        status: error.response.status,
        data: error.response.data
      });
    }
    console.log("---------------------------------");
  }
};

module.exports = {
  processWebhookData,
};