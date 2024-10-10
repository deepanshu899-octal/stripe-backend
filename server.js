// index.js
const express = require('express');
const Stripe = require('stripe');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Stripe with your secret key
const stripe = Stripe('sk_test_51Q8HzUJru0Ak1tZZP85cmvx6FsQwGFtZVqjmxrux5pC4sY7CzSrTnK57w4QwEeY26rZnt5SjgKoWE8hj8lO61g5R00Bdhg8gML');

// Middleware
app.use(cors()); // Enable CORS
app.use(bodyParser.json()); // Parse JSON bodies

// Route to create a payment intent
app.post('/api/stripe/create-payment-intent', async (req, res) => {
    const { amount, currency, email, userId, token } = req.body; // Get amount, currency, and email from the request

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency,
            // payment_method_types: ['card'], // Specify the payment method
            automatic_payment_methods: {enabled: true},
        });

        // Log or save payment information as needed
        console.log(paymentIntent);
        console.log(`Payment intent created for ${email} , id - ${paymentIntent.id} token- ${token} with amount: ${amount}`);

        res.status(200).send({ client_secret: paymentIntent.client_secret });
    } catch (error) {
        res.status(500).send({ error: error.message });
        console.log(error.message)
    }
});

// Webhook endpoint to listen for Stripe events
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, 'your_webhook_secret_here');
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log('PaymentIntent was successful!', paymentIntent);
            // Optionally, log payment intent info to your database
            break;
        case 'payment_intent.payment_failed':
            const paymentError = event.data.object;
            console.log('PaymentIntent failed!', paymentError);
            break;
        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).send({ received: true });
});

app.get('/api/stripe/check-payment-status/:paymentIntentId', async (req, res) => {
    const { paymentIntentId } = req.params;
    
    try {
      // Fetch the payment intent from Stripe using its ID
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      // Send the status and payment intent details in the response
      res.status(200).send({
        status: paymentIntent.status,
        paymentIntent,
      });
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  });

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
