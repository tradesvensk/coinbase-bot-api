const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

function createSignature(secret, timestamp, method, path, body = '') {
    const message = timestamp + method + path + body;
    return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

app.post('/api/balance', async (req, res) => {
    const { apiKey, apiSecret } = req.body;
    try {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const method = 'GET';
        const path = '/v2/accounts';
        const signature = createSignature(apiSecret, timestamp, method, path);
        
        const response = await axios({
            method: 'GET',
            url: 'https://api.coinbase.com' + path,
            headers: {
                'CB-ACCESS-KEY': apiKey,
                'CB-ACCESS-SIGN': signature,
                'CB-ACCESS-TIMESTAMP': timestamp,
                'CB-ACCESS-VERSION': '2023-01-01'
            }
        });
        
        const usdcAccount = response.data.data.find(acc => acc.currency === 'USDC');
        const balance = usdcAccount ? parseFloat(usdcAccount.balance.amount) : 0;
        res.json({ success: true, balance: balance });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.post('/api/order', async (req, res) => {
    const { apiKey, apiSecret, productId, side, amount } = req.body;
    try {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const method = 'POST';
        const path = '/api/v3/brokerage/orders';
        const orderData = {
            client_order_id: Date.now().toString(),
            product_id: productId,
            side: side.toUpperCase(),
            order_configuration: { market_market_ioc: { quote_size: amount.toString() } }
        };
        const body = JSON.stringify(orderData);
        const signature = createSignature(apiSecret, timestamp, method, path, body);
        
        const response = await axios({
            method: 'POST',
            url: 'https://api.coinbase.com' + path,
            headers: {
                'CB-ACCESS-KEY': apiKey,
                'CB-ACCESS-SIGN': signature,
                'CB-ACCESS-TIMESTAMP': timestamp,
                'CB-ACCESS-VERSION': '2023-01-01',
                'Content-Type': 'application/json'
            },
            data: orderData
        });
        res.json({ success: true, order: response.data });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
