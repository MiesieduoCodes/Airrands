import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const paystackWebhook = functions.https.onRequest(async (req, res) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const hash = req.headers['x-paystack-signature'];
  const event = req.body;

  // Verify webhook signature
  const expectedHash = require('crypto')
    .createHmac('sha512', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== expectedHash) {
    res.status(401).send('Invalid signature');
    return;
  }

  // Handle different event types
  switch (event.event) {
    case 'charge.success':
      await handleSuccessfulCharge(event.data);
      break;
    case 'transfer.success':
      await handleSuccessfulTransfer(event.data);
      break;
    case 'charge.failed':
      await handleFailedCharge(event.data);
      break;
    default:
      console.log('Unhandled event type:', event.event);
  }

  res.sendStatus(200);
});

async function handleSuccessfulCharge(data: any) {
  const { reference, metadata, amount, customer } = data;
  
  try {
    // Update order status
    if (metadata?.orderId) {
      await db.collection('orders').doc(metadata.orderId).update({
        paymentStatus: 'completed',
        paymentVerified: true,
        verificationDate: admin.firestore.FieldValue.serverTimestamp(),
        paymentDetails: {
          amount: amount / 100, // Convert from kobo to naira
          reference,
          customerEmail: customer.email,
          verificationSource: 'webhook'
        }
      });
    }

    // Create payment record
    await db.collection('payments').add({
      reference,
      amount: amount / 100,
      status: 'success',
      customerEmail: customer.email,
      orderId: metadata?.orderId,
      metadata,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      verificationSource: 'webhook'
    });

    // Send notification to user
    if (metadata?.userId) {
      const notificationData = {
        title: 'Payment Successful',
        body: `Your payment of ₦${(amount / 100).toLocaleString()} has been confirmed.`,
        type: 'payment',
        data: {
          orderId: metadata.orderId,
          amount: amount / 100,
          reference
        }
      };

      await db.collection('users').doc(metadata.userId)
        .collection('notifications').add({
          ...notificationData,
          isRead: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
  } catch (error) {
    console.error('Error handling successful charge:', error);
    throw new functions.https.HttpsError('internal', 'Error processing payment webhook');
  }
}

async function handleSuccessfulTransfer(data: any) {
  // Handle successful transfers (e.g., paying runners)
  const { reference, metadata, amount, recipient } = data;
  
  try {
    await db.collection('transfers').add({
      reference,
      amount: amount / 100,
      status: 'success',
      recipient,
      metadata,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Error handling successful transfer:', error);
  }
}

async function handleFailedCharge(data: any) {
  const { reference, metadata, amount, customer } = data;
  
  try {
    // Update order status if it exists
    if (metadata?.orderId) {
      await db.collection('orders').doc(metadata.orderId).update({
        paymentStatus: 'failed',
        paymentError: data.gateway_response,
        lastUpdateAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Record failed payment
    await db.collection('payments').add({
      reference,
      amount: amount / 100,
      status: 'failed',
      customerEmail: customer.email,
      orderId: metadata?.orderId,
      error: data.gateway_response,
      metadata,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Notify user of failed payment
    if (metadata?.userId) {
      const notificationData = {
        title: 'Payment Failed',
        body: `Your payment of ₦${(amount / 100).toLocaleString()} was unsuccessful. Please try again.`,
        type: 'payment',
        data: {
          orderId: metadata.orderId,
          amount: amount / 100,
          reference,
          error: data.gateway_response
        }
      };

      await db.collection('users').doc(metadata.userId)
        .collection('notifications').add({
          ...notificationData,
          isRead: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
  } catch (error) {
    console.error('Error handling failed charge:', error);
  }
}
