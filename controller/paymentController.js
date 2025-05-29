const vexor = require('vexor');
const dotenv = require('dotenv');

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
console.log('Clave pública:', process.env.VEXOR_PUBLISHABLE_KEY);
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
    // Intenta obtener los datos del cuerpo o de los parámetros de consulta
    const webhookData = req.body && Object.keys(req.body).length > 0 ? req.body : req.query;
    console.log('Webhook data received:', webhookData);

    // Asegúrate de que webhookData tenga la estructura esperada o adapta processWebhookData
    // Si el ID viene como data.id en la query, webhookData.data.id será accesible.
    // Si el ID viene como id en la query, webhookData.id será accesible.
    // Si viene en el body, la estructura original debería funcionar.

    await paymentService.processWebhookData(webhookData);
    res.status(200).send('Webhook received successfully');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Error processing webhook');
  }
};

module.exports = { createPayment, handleWebhook };
