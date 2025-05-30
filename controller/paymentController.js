const vexor = require('vexor');
const dotenv = require('dotenv');
const crypto = require('crypto'); // Necesario si decides usar la validación de firma

const productService = require('../services/productService'); // Asegúrate de que la ruta sea correcta
const paymentService = require('../payment/paymentService');


dotenv.config();
const { Vexor } = vexor;

const vexorInstance = new Vexor({
  publishableKey: process.env.VEXOR_PUBLISHABLE_KEY,
  projectId: process.env.VEXOR_PROJECT_ID,
  apiKey: process.env.VEXOR_API_KEY,
});



const createPayment = async (req, res) => {
  const { product } = req.body;

  if (!product || !product.title || !product.unit_price || !product.quantity) {
    return res.status(400).json({ error: 'El producto debe tener título, precio y cantidad' });
  }

  try {

    
    const paymentResponse = await vexorInstance.pay.mercadopago({
      items: [
        {
          title: product.title,
          unit_price: product.unit_price,
          quantity: product.quantity,
        },
      ],
    });

   

    if (paymentResponse && paymentResponse.payment_url) {
      res.status(200).json({ payment_url: paymentResponse.payment_url });
    } else {
      throw new Error('Respuesta de pago inválida');
    }
  } catch (error) {
 
    res.status(500).json({ error: 'Error al procesar el pago' });
  }
};



const handleWebhook = async (req, res) => {
  try {
    const webhookData = req.body;
    const xSignature = req.headers['x-signature']; // Obtener el header X-Signature
    const xRequestId = req.headers['x-request-id']; // Obtener el header X-Request-ID
    const queryParams = req.query; // Obtener los query parameters

  

    // Verificación básica de datos
    if (!webhookData || !webhookData.type) {
  
      return res.status(400).send('Datos del webhook inválidos.');
    }

    // --- LÓGICA DE VALIDACIÓN DE X-SIGNATURE (ALTAMENTE RECOMENDADO) ---
    // Si realmente NO quieres validar la firma, puedes comentar o eliminar este bloque.
    // PERO ES UN RIESGO DE SEGURIDAD MUY ALTO PARA PRODUCCIÓN.
    /*
    const MERCADO_PAGO_WEBHOOK_SECRET = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

    if (!MERCADO_PAGO_WEBHOOK_SECRET) {
      console.error('Error: MERCADO_PAGO_WEBHOOK_SECRET no está configurada.');
      return res.status(500).send('Error de configuración del servidor.');
    }

    if (!xSignature) {
      console.warn('Webhook recibido sin X-Signature. Posible intento no válido.');
      return res.status(400).send('Falta la firma de seguridad.');
    }

    const signatureParts = xSignature.split(',');
    let ts = '';
    let v1 = '';
    signatureParts.forEach(part => {
      if (part.startsWith('ts=')) {
        ts = part.substring(3);
      } else if (part.startsWith('v1=')) {
        v1 = part.substring(3);
      }
    });

    if (!ts || !v1) {
      console.warn('X-Signature con formato inválido.');
      return res.status(400).send('Firma de seguridad inválida.');
    }

    // Obtener el ID de los query params (data.id_url) si existe
    const dataId = queryParams['data.id'] ? queryParams['data.id'].toString().toLowerCase() : '';
    
    let template = `id:${dataId};request-id:${xRequestId || ''};ts:${ts};`;
    template = template.replace(/;[^;]*:;/, ';').replace(/;$/, ''); 

    const hmac = crypto.createHmac('sha256', MERCADO_PAGO_WEBHOOK_SECRET);
    hmac.update(template);
    const generatedV1 = hmac.digest('hex');

    if (generatedV1 !== v1) {
      console.error('Firma de seguridad inválida. El webhook no es auténtico.');
      console.error('Template generado:', template);
      console.error('Expected v1:', v1);
      console.error('Generated v1:', generatedV1);
      return res.status(401).send('No autorizado: Firma inválida.');
    }
    // --- FIN LÓGICA DE VALIDACIÓN DE X-SIGNATURE ---
    */

    // IMPORTANTE: Responder 200 OK inmediatamente después de la validación
    // (o después de las comprobaciones básicas si no validas la firma)
    // Esto es CRÍTICO para que Mercado Pago no reintente la notificación.
    res.status(200).send('OK');

    // Procesar el webhook asíncronamente en segundo plano
    // Pasa los queryParams si paymentService los necesita
    paymentService.processWebhookData(webhookData, queryParams)
      .then(() => console.log('Webhook procesado con éxito en background.'))
      .catch(error => console.error('Error procesando webhook en background:', error));

  } catch (error) {
    console.error('Error en handleWebhook (captura general):', error);
    // Asegurar que siempre se envía una respuesta en caso de error
    if (!res.headersSent) {
      res.status(500).send('Error al procesar el webhook');
    }
  }
};

module.exports = { createPayment, handleWebhook };
