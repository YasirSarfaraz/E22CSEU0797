require('dotenv').config();

const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 9876;

const WINDOW_SIZE = 10;
const TIMEOUT_MS = 500;
const SERVER = process.env.SERVER || 'http://20.244.56.144/evaluation-service';
const TOKEN = process.env.TOKEN;
 
const endp = {
  'p': '/primes',     
  'f': '/fibo',      
  'e': '/even',      
  'r': '/rand'     
};

const nww = {
  'p': [], 
  'f': [], 
  'e': [], 
  'r': []  
};
function calculateAverage(numbers) {
  if (numbers.length === 0) return 0;
  const sum = numbers.reduce((a,b) => a+b,0);
  return (sum / numbers.length).toFixed(2);
}
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

app.get('/numbers/:numberid', async (req, res) => {
  const { numberid } = req.params;
  
  if (!['p', 'f', 'e', 'r'].includes(numberid)) {
    return res.status(400).json({ error: 'Invalid number' });
  }

  try {
    const windowPrevState = [...nww[numberid]];
    const endpoint = endp[numberid];
    
    const response = await axios.get(`${SERVER}${endpoint}`, {
      timeout: TIMEOUT_MS,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const receivedNumbers = response.data.numbers || [];
    const uniqueNewNumbers = [];
    for (const num of receivedNumbers) {
      if (!nww[numberid].includes(num) && !uniqueNewNumbers.includes(num)) {
        uniqueNewNumbers.push(num);
      }
    }

    for (const num of uniqueNewNumbers) {
      if (nww[numberid].length >= WINDOW_SIZE) {
        nww[numberid].shift();
      }
      nww[numberid].push(num);
    }
    if (Date.now() - req.startTime > TIMEOUT_MS) {
      return res.status(408).json({ error: 'Request timeout' });
    }
  
    return res.json({
      windowPrevState: windowPrevState,
      windowCurrState: nww[numberid],
      numbers: receivedNumbers,
      avg: calculateAverage(nww[numberid])
    });
    
  } catch (error) {
    if (error.code === 'ECONNABORTED' || error.timeout) {
      return res.status(408).json({ error: 'Third-party server timeout' });
    }
    
    return res.status(500).json({ 
      error: 'Error fetching numbers', 
      message: error.message 
    });
  }
});
app.listen(port, () => {
  console.log(`Avg Calculator port ${port}`);
  console.log(` endpoints:`);
  console.log(`  prime numbers: http://localhost:${port}/numbers/p`);
  console.log(`  Fibonacci numbers: http://localhost:${port}/numbers/f`);
  console.log(`  even numbers: http://localhost:${port}/numbers/e`);
  console.log(`  random numbers: http://localhost:${port}/numbers/r`);
});