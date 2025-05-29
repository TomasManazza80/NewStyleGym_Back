const mercadopago = require('mercadopago');
const productService = require('../services/productService');
const userService = require('../services/userServices'); // Importar userService
// const axios = require('axios'); // Ya no es necesario para re-enviar webhooks a localhost

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

// --- Lógica de Idempotencia (Ejemplo Conceptual) ---
// ****************************************************
// ESTO DEBE ADAPTARSE A TU BASE DE DATOS REAL Y ORM
// ****************************************************

// Función para verificar si un pago ya fue procesado
const checkAndProcessPayment = async (mercadopagoId) => {
  // Aquí deberías consultar tu base de datos:
  // 1. Busca un registro de pago/transacción con `mercadopagoId`.
  // 2. Si existe y su estado indica "procesado", devuelve false (ya procesado).
  // 3. Si no existe o su estado es "pendiente", crea o actualiza el registro a "procesando" y devuelve true.
  
  // Ejemplo conceptual:
  console.log(`Verificando pago de MP ID: ${mercadopagoId}`);
  // Imagina que aquí consultas tu DB
  // const existingPayment = await PaymentModel.findOne({ mercadopagoId: mercadopagoId });
  // if (existingPayment && existingPayment.status === 'approved_by_webhook') {
  //   console.log(`Pago ${mercadopagoId} ya fue procesado.`);
  //   return false; // Ya procesado
  // }
  // if (existingPayment) {
  //   await PaymentModel.updateOne({ mercadopagoId: mercadopagoId }, { status: 'processing_webhook' });
  // } else {
  //   await PaymentModel.create({ mercadopagoId: mercadopagoId, status: 'processing_webhook' });
  // }
  return true; // Asumimos que podemos procesarlo por primera vez
};

// Función para marcar un pago como procesado exitosamente
const markPaymentAsProcessed = async (mercadopagoId) => {
  // Aquí deberías actualizar el estado de tu pago en la base de datos a "procesado"
  console.log(`Marcando pago ${mercadopagoId} como procesado exitosamente.`);
  // await PaymentModel.updateOne({ mercadopagoId: mercadopagoId }, { status: 'approved_by_webhook' });
};

// ****************************************************
// FIN Lógica de Idempotencia
// ****************************************************


const processWebhookData = async (webhookData) => {
  if (!webhookData || !webhookData.type) {
    console.warn("Datos del webhook inválidos o incompletos.");
    return; // No hacer nada si los datos son inválidos
  }

  // Si el webhook es de un pago
  if (webhookData.type === 'payment') {
    const paymentId = webhookData.data && webhookData.data.id;
    const paymentStatus = webhookData.data && webhookData.data.status;
    const externalReference = webhookData.data && webhookData.data.external_reference;

    if (!paymentId || !paymentStatus || !externalReference) {
      console.warn("Webhook de pago incompleto (falta id, status o external_reference).");
      return;
    }

    try {
      // 1. Verificar idempotencia
      const canProcess = await checkAndProcessPayment(paymentId);
      if (!canProcess) {
        console.log(`Webhook para pago ${paymentId} ya procesado. Ignorando.`);
        return; // Salir si ya fue procesado
      }

      console.log(`Procesando webhook para pago: ${paymentId}, estado: ${paymentStatus}, referencia externa (usuario ID): ${externalReference}`);

      if (paymentStatus === 'approved') {
        const userId = externalReference; // external_reference debe ser el ID de tu usuario

        if (!userId) {
          console.error(`Referencia externa (ID de usuario) no encontrada para el pago ${paymentId}.`);
          return;
        }

        // --- Obtener detalles completos del pago desde la API de Mercado Pago ---
        // Esto es recomendado para obtener toda la información y asegurar la consistencia.
        const paymentDetails = await mercadopago.payment.findById(paymentId);
        
        if (paymentDetails && paymentDetails.body.status === 'approved') {
          console.log(`Pago ${paymentId} aprobado. Detalles completos:`, paymentDetails.body);
          
          // Lógica específica para pagos de usuarios:
          // Aquí deberías actualizar el estado de tu usuario, otorgar acceso,
          // o cargar saldo, basándote en el `userId` y la información del `paymentDetails.body`.

          // Ejemplo: Suponiendo que `userService.updateUserPaymentStatus` actualiza el estado de pago del usuario
          // o activa una suscripción. Deberías adaptar esto a tu modelo de negocio.
          const amount = paymentDetails.body.transaction_amount;
          const paymentMethod = paymentDetails.body.payment_method_id;
          const payerEmail = paymentDetails.body.payer && paymentDetails.body.payer.email;

          console.log(`Actualizando estado de usuario ${userId}: Pago aprobado por ${amount} con ${paymentMethod}`);
          // Ejemplo de cómo podrías llamar a tu userService:
          // await userService.handleUserPaymentApproved(userId, {
          //   mercadopagoId: paymentId,
          //   amount: amount,
          //   paymentMethod: paymentMethod,
          //   payerEmail: payerEmail,
          //   status: 'approved'
          // });

          await markPaymentAsProcessed(paymentId); // Marcar como procesado exitosamente
          console.log(`Lógica de negocio para el usuario ${userId} ejecutada correctamente.`);

          // La función `success` ha sido eliminada o adaptada para no re-enviar el webhook
          // success(webhookData); // Si 'success' tiene otra lógica que no sea reenvío, puedes llamarla aquí
        } else {
          console.log(`El estado del pago ${paymentId} en la API de Mercado Pago no es 'approved' o no se encontraron detalles.`);
        }
      } else if (paymentStatus === 'pending' || paymentStatus === 'in_process') {
        console.log(`Pago ${paymentId} en estado pendiente/en proceso. No requiere acción inmediata.`);
        // Aquí podrías actualizar el estado en tu BD a 'pendiente' si lo gestionas.
      } else {
        console.log(`Pago ${paymentId} en estado: ${paymentStatus}. No es aprobado, no requiere acción de éxito.`);
        // Aquí podrías manejar otros estados como 'cancelled', 'rejected', etc.
        // Por ejemplo, podrías actualizar el estado del pago en tu DB a 'rechazado'.
      }

    } catch (error) {
      console.error(`Error al procesar el pago ${paymentId}:`, error.message);
      // No relanzar el error aquí, ya que la respuesta HTTP 200 ya fue enviada
      // Y el error debería ser logueado y posiblemente manejado por un sistema de monitoreo.
    }
  } else {
    console.log(`Tipo de webhook '${webhookData.type}' no manejado.`);
  }
};

// Esta función se elimina o se adapta si no es para re-enviar webhooks a localhost
// Si necesitas notificar a tu frontend, considera WebSockets o un API endpoint de consulta.
const success = async (webhookData) => {
    console.log("Función 'success' ejecutada para webhook. No se re-envía a localhost.");
    // Si necesitas hacer algo más con los datos del webhook para propósitos de logging
    // o para otras integraciones internas que no bloqueen la respuesta HTTP, hazlo aquí.
};


module.exports = {
  createPreference,
  processWebhookData,
  success // Aunque su funcionalidad se ha reducido, la exporto por si se usaba en otro lugar.
};
