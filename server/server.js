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
  const { message, vehicle } = req.body;

  console.log('\n--------------------------------');
  console.log('📨 INCOMING:', message);
  if (vehicle) {
    console.log('🚗 VEHICLE:', `${vehicle.year} ${vehicle.make} ${vehicle.model}`);
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
  let systemPrompt = 'You are Wrenchy, an expert mechanic AI. Keep answers technical, concise, and formatted for mobile reading.';

  if (vehicle) {
    systemPrompt += ` The user is working on a ${vehicle.year} ${vehicle.make} ${vehicle.model}`;
    if (vehicle.engine) systemPrompt += ` with a ${vehicle.engine} engine`;
    if (vehicle.trim) systemPrompt += ` (${vehicle.trim} trim)`;
    systemPrompt += '. ALWAYS tailor your answer to this specific car\'s specs (torque, fluids, firing order).';
  } else {
    systemPrompt += ' The user has NOT selected a vehicle. If they ask for specs, ask them what car they are driving.';
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