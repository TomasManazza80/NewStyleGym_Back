const axios = require('axios');

// Considera mover esta clave a una variable de entorno para mayor seguridad.
const MERCADO_PAGO_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL ;

// Función auxiliar para obtener el nombre del mes
const getMonthName = (date) => {
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  return monthNames[date.getMonth()];
};

const processWebhookData = async (webhookData, queryParams) => {
  // 1. Obtener el ID del pago
  const paymentId = webhookData.data?.id || queryParams['data.id'];
  if (!paymentId) {
    console.log("---------------------------------");
    console.error("❌ No se encontró ID de pago en el webhook.");
    console.log("---------------------------------");
    return;
  }

  try {
    // 2. Obtener detalles del pago desde Mercado Pago
    const response = await axios.get(
      `https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
        },
      }
    );
    const payment = response.data;

    // 3. Extraer el email del pagador
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

    // 4. Si el pago está aprobado, proceder
    if (payment.status === 'approved') {
      console.log("---------------------------------");
      console.log(`✅ Pago ${paymentId} aprobado.`);
      console.log("---------------------------------");

      // 5. Obtener el ID numérico del usuario usando el email
      let userId;
      try {
        console.log("---------------------------------");
        console.log(`Buscando ID de usuario para el email: ${payerEmail}...`);
        console.log("---------------------------------");
        const getIdResponse = await axios.get(`${BACKEND_BASE_URL}/getId/${payerEmail}`);
        userId = getIdResponse.data; // Asumiendo que devuelve el ID directamente
        console.log("---------------------------------");
        console.log(`👤 ID de usuario obtenido: ${userId}`);
        console.log("---------------------------------");
        if (!userId) {
          console.log("---------------------------------");
          console.error(`❌ No se pudo obtener el ID numérico para el email: ${payerEmail}`);
          console.log("---------------------------------");
          return;
        }
      } catch (error) {
        console.log("---------------------------------");
        console.error(`❌ Error al obtener ID de usuario por email (${payerEmail}):`, error.message);
        console.log("---------------------------------");
        return;
      }

      // 6. Registrar el mes actual como pagado
      try {
        const currentMonth = getMonthName(new Date());
        const addMonthBody = {
          userId: Number(userId), // Asegurarse de que sea un número
          month: currentMonth
        };

        console.log("---------------------------------");
        console.log(`🔄 Enviando solicitud para registrar el mes ${currentMonth} para el usuario ${userId}...`);
        console.log("---------------------------------");
        await axios.post(`${BACKEND_BASE_URL}/addMount`, addMonthBody);
        console.log("---------------------------------");
        console.log(`🎉 Mes "${currentMonth}" registrado con éxito para el usuario ${userId}.`);
        console.log("---------------------------------");
      } catch (error) {
        console.log("---------------------------------");
        console.error(`❌ Error al registrar el mes para el usuario ${userId}:`, error.message);
        if (error.response) console.error('Detalles del error:', error.response.data);
        console.log("---------------------------------");
      }

    } else {
      console.log("---------------------------------");
      console.log(`❕ Pago ${paymentId} no está aprobado (estado actual: ${payment.status}). No se realiza ninguna acción.`);
      console.log("---------------------------------");
    }

  } catch (error) {
    console.log("---------------------------------");
    console.error(`❌ Error al procesar el webhook o consultar el pago ${paymentId}:`, error.message);
    if (error.response) console.error('Detalles del error:', error.response.data);
    console.log("---------------------------------");
  }
};

module.exports = {
  processWebhookData,
};
