const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express(); 
const PORT = process.env.PORT || 3000;

// 1. MIDDLEWARE (Crucial)
app.use(cors()); 
app.use(express.json());

// 2. CHAT ENDPOINT
app.post('/chat', async (req, res) => {
  // 1. EXTRACT DATA
  const { message, vehicle, carContext, units } = req.body;
  const selectedVehicle = carContext || vehicle;

  console.log('\n--------------------------------');
  console.log('📨 INCOMING:', message);
  if (selectedVehicle) {
    console.log('🚗 VEHICLE:', `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`);
  }

  // Validation
  if (!req.body || !req.body.message) {
    console.error('❌ REJECTED: Message was empty.');
    return res.status(400).json({ reply: "Error: I didn't hear what you said (Empty Message)." });
  }

  // Check Key
  if (!process.env.DEEPSEEK_API_KEY) {
    console.error('❌ ERROR: Key Missing');
    return res.status(500).json({ reply: 'System Error: Brain Key Missing.' });
  }

  // 2. BUILD THE PERSONA
  // 1. Define the rules based on the user's choice
  const isMetric = units === 'metric';
  const unitRules = isMetric
    ? 'STRICT METRIC MODE. - You must ONLY use Metric units: Kilometers (km), Liters (L), Celsius (°C), Newton-Meters (Nm), Bar/kPa. - DO NOT convert to Imperial. DO NOT mention miles, quarts, gallons, or ft-lbs. - If your internal data is in Imperial, mathematically convert it to Metric before speaking. - Example: Instead of "30 ft-lbs", say "40 Nm".'
    : 'IMPERIAL MODE. - Use standard US units: Miles, Quarts, Fahrenheit, Foot-Pounds (ft-lbs).';

  // 2. Inject it into the System Prompt
  const systemPrompt = `You are Wrenchy, an expert automotive AI.

*** CRITICAL INSTRUCTION ***
${unitRules}

Format your response with Markdown (bolding, lists). The user's car context is: ${carContext || 'General Car'}.`;

  if (selectedVehicle) {
    console.log('🚗 VEHICLE CONTEXT:', selectedVehicle);
  } else {
    console.log('🚗 VEHICLE CONTEXT: none');
  }

  try {
    // 3. TALK TO DEEPSEEK (Direct Fetch)
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        stream: false
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('❌ DEEPSEEK ERROR:', data);
      return res.status(400).json({ reply: `DeepSeek Error: ${data.error?.message || 'Unknown'}` });
    }

    const aiReply = data.choices[0].message.content;
    console.log('✅ REPLY SENT');
    res.json({ reply: aiReply });
  } catch (error) {
    console.error('❌ CRASH:', error);
    res.status(500).json({ reply: 'My brain is offline.' });
  }
});

app.listen(PORT, '0.0.0.0', () => { 
  console.log(`\n🚀 WRENCHY IS ALIVE on Port ${PORT}`); 
});