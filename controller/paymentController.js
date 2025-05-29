const vexor = require('vexor');
const dotenv = require('dotenv');
const crypto = require('crypto'); // Importar el módulo crypto

const productService = require('../services/productService'); // Asegúrate de que la ruta sea correcta
const paymentService = require('../payment/paymentService');
console.log(paymentService);

dotenv.config();
const { Vexor } = vexor;

const vexorInstance = new Vexor({
  publishableKey: process.env.VEXOR_PUBLISHABLE_KEY,
  projectId: process.env.VEXOR_PROJECT_ID,
  apiKey: process.env.VEXOR_API_KEY,
});

// Log para depuración
console.log('Clave pública:', process.env.VEXOR_PUBLISHable_KEY);
console.log('ID del proyecto:', process.env.VEXOR_PROJECT_ID);
console.log('Clave API:', process.env.VEXOR_API_KEY);

const createPayment = async (req, res) => {
  const { product } = req.body;

  if (!product || !product.title || !product.unit_price || !product.quantity) {
    return res.status(400).json({ error: 'El producto debe tener título, precio y cantidad' });
  }

  try {
    console.log('Datos del producto:', product);
    
    const paymentResponse = await vexorInstance.pay.mercadopago({
      items: [
        {
          title: product.title,
          unit_price: product.unit_price,
          quantity: product.quantity,
        },
      ],
    });

    console.log('Respuesta de pago:', paymentResponse);

    if (paymentResponse && paymentResponse.payment_url) {
      res.status(200).json({ payment_url: paymentResponse.payment_url });
    } else {
      throw new Error('Respuesta de pago inválida');
    }
  } catch (error) {
    console.error('Error al crear el pago:', error);
    res.status(500).json({ error: 'Error al procesar el pago' });
  }
};

const handleWebhook = async (req, res) => {
  try {
    const webhookData = req.body;
    const xSignature = req.headers['x-signature']; // Obtener el header X-Signature
    const xRequestId = req.headers['x-request-id']; // Obtener el header X-Request-ID

    console.log('Datos del webhook:', webhookData);
    console.log('X-Signature:', xSignature);
    console.log('X-Request-ID:', xRequestId);
    console.log('Query Params:', req.query); // Agregado para depuración

    // --- Validación de X-Signature (CRÍTICO) ---
    const MERCADO_PAGO_WEBHOOK_SECRET = "ad9bda219685566844f7909a094560cf6c9c153d61ee93291c4585b365f0f623";

    if (!MERCADO_PAGO_WEBHOOK_SECRET) {
      console.error('Error: MERCADO_PAGO_WEBHOOK_SECRET no está configurada.');
      return res.status(500).send('Error de configuración del servidor.');
    }

    if (!xSignature) {
      console.warn('Webhook recibido sin X-Signature. Posible intento no válido.');
      return res.status(400).send('Falta la firma de seguridad.');
    }

    // Extraer ts y v1 de x-signature
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

    // CORRECCIÓN CLAVE AQUÍ: Obtener el ID de los query params si está presente
    // La documentación de MP dice `id:[data.id_url]`
    const dataId = req.query['data.id'] ? req.query['data.id'].toString().toLowerCase() : '';
    
    // Construir la plantilla para el HMAC
    let template = `id:${dataId};request-id:${xRequestId || ''};ts:${ts};`;
    
    // Si alguna parte de la plantilla no tiene valor, debe ser eliminada
    // Ejemplo: si request-id no existe, el template no debe tener `request-id:;`
    // Esta regex limpia los segmentos vacíos, pero ten cuidado con otros patrones de URL
    template = template.replace(/;[^;]*:;/, ';').replace(/;$/, ''); 

    // Generar la clave de contador (HMAC)
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
    // --- Fin de Validación de X-Signature ---

    // Responder 200 OK inmediatamente después de la validación para evitar reintentos de MP
    res.status(200).send('OK');

    // Procesar el webhook asíncronamente (sin bloquear la respuesta HTTP)
    paymentService.processWebhookData(webhookData)
      .then(() => console.log('Webhook procesado con éxito en background.'))
      .catch(error => console.error('Error procesando webhook en background:', error));

  } catch (error) {
    console.error('Error al manejar el webhook:', error);
    // Asegurar que siempre se envía una respuesta en caso de error
    if (!res.headersSent) {
      res.status(500).send('Error interno del servidor.');
    }
  }
};

module.exports = {
  createPayment,
  handleWebhook
};
