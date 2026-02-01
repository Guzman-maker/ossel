const nodemailer = require('nodemailer');

// Configuración del transportador
// Si tienes un servicio real como SendGrid, Mailgun o Gmail, actualiza aquí.
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'tu-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'tu-contraseña-o-app-password'
    }
});

const sendOrderNotification = async (order) => {
    const recipientsStr = process.env.EMAIL_RECIPIENTS || 'Ventas@osellzc.com,Administracion@osellzc.com';
    const recipients = recipientsStr.split(',').map(email => email.trim());

    // Construir tabla de productos para el email
    const itemsHtml = order.items.map(item => `
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.qty}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toLocaleString()}</td>
        </tr>
    `).join('');

    const mailOptions = {
        from: `"Tienda Online OSEL" <${process.env.EMAIL_USER || 'no-reply@osellzc.com'}>`,
        to: recipients.join(', '),
        subject: `🔔 Nuevo Pedido Recibido: ${order.id_custom}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 20px; border-radius: 10px;">
                <h1 style="color: #2C3E50; border-bottom: 2px solid #2C3E50; padding-bottom: 10px;">Nuevo Pedido OSEL</h1>
                
                <p>Se ha recibido un nuevo pedido a través de la tienda web.</p>
                
                <h3>Datos del Cliente:</h3>
                <ul style="list-style: none; padding: 0;">
                    <li><strong>Nombre:</strong> ${order.client.name}</li>
                    <li><strong>Email:</strong> ${order.client.email}</li>
                    <li><strong>Teléfono:</strong> ${order.client.phone}</li>
                </ul>

                <h3>Información de Envío:</h3>
                <p style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
                    <strong>Dirección:</strong> ${order.shipping.address}<br>
                    <strong>Colonia:</strong> ${order.shipping.colonia}<br>
                    <strong>Ciudad/CP:</strong> ${order.shipping.city} (${order.shipping.zip})<br>
                    <strong>Referencias:</strong> ${order.shipping.references || 'Sin referencias particulares'}
                </p>

                <h3>Detalle de Compra:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #f2f2f2;">
                            <th style="padding: 10px; text-align: left;">Producto</th>
                            <th style="padding: 10px; text-align: center;">Cant.</th>
                            <th style="padding: 10px; text-align: right;">Precio</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="2" style="padding: 10px; text-align: right;"><strong>Total:</strong></td>
                            <td style="padding: 10px; text-align: right;"><strong>$${order.totalAmount.toLocaleString()}</strong></td>
                        </tr>
                    </tfoot>
                </table>

                <p style="margin-top: 20px;"><strong>Método de Pago:</strong> ${order.paymentMethod}</p>
                <p><strong>ID de Orden:</strong> ${order.id_custom}</p>
                
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #777; text-align: center;">Este es un mensaje automático generado por el sistema de ventas de OSEL Lázaro Cárdenas.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[MAILER] Emails enviados exitosamente a ${recipients.length} destinatarios.`);
    } catch (error) {
        console.error('[MAILER] Error enviando email de notificación:', error);
    }
};

module.exports = { sendOrderNotification };
