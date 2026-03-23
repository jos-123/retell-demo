import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from '@hubspot/api-client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const hubspotClient = new Client({ accessToken: process.env.HUBSPOT_TOKEN });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static('public'));

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Retell AI Chat: Create a new chat session
app.post('/api/create-chat', async (req, res) => {
    const { agent_id } = req.body;
    console.log(process.env.RETELL_API_KEY);
    console.log(process.env.RETELL_CHAT_AGENT_ID);
    console.log(process.env.RETELL_API_KEY)
    const API_KEY = process.env.RETELL_API_KEY;
    // Dedicated Chat Agent
    const CHAT_AGENT_ID = process.env.RETELL_CHAT_AGENT_ID;

    try {
        // Try Retell API first (v1 endpoint as discovered)
        const response = await fetch("https://api.retellai.com/create-chat", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                agent_id: agent_id || CHAT_AGENT_ID,
            })
        });

        if (response.ok) {
            const data = await response.json();
            return res.json(data);
        }

        // Fallback: If agent is not chat-enabled, create a local simulation
        console.warn(`Retell Chat API failed (${response.status}), switching to local simulation.`);
        res.json({ chat_id: `local_sim_${Date.now()}` });

    } catch (error) {
        console.error("Error creating chat:", error);
        // Fallback on network error too
        res.json({ chat_id: `local_sim_${Date.now()}` });
    }
});

// Retell AI Chat: Send message and get completion
app.post('/api/chat-completion', async (req, res) => {
    const { chat_id, message } = req.body;
    const API_KEY = process.env.RETELL_API_KEY;

    // Handle Local Simulation
    if (chat_id && chat_id.startsWith('local_sim_')) {
        const lowerMsg = message.toLowerCase();
        let reply = "I can assist with HR queries, scheduling interviews, and providing information about Softnotions. How can I help you?";

        if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
            reply = "Hello! I am Scira, the advanced virtual HR assistant for Softnotions. How can I assist you today?";
        } else if (lowerMsg.includes('meeting') || lowerMsg.includes('schedule') || lowerMsg.includes('book')) {
            reply = "I can certainly help you schedule a meeting. Could you please provide your preferred date and time?";
        } else if (lowerMsg.includes('softnotions') || lowerMsg.includes('company')) {
            reply = "Softnotions is a leading software company known for innovation in AI, web, and mobile development. We pride ourselves on our culture of empathy and professionalism.";
        } else if (lowerMsg.includes('job') || lowerMsg.includes('interview') || lowerMsg.includes('career')) {
            reply = "I can help manage HR meetings and interviews. Are you looking to apply or check your application status?";
        }

        // Simulate network delay for realism
        setTimeout(() => res.json({ message: reply }), 600);
        return;
    }

    try {
        // Try Retell API
        const response = await fetch("https://api.retellai.com/create-chat-completion", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                chat_id,
                content: message
            })
        });

        if (!response.ok) {
            throw new Error(`Retell API error: ${response.statusText}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("Error in chat completion:", error);
        res.status(500).json({ error: "Failed to get chat response" });
    }
});

// Retell AI Token Generation
app.post('/api/create-web-call', async (req, res) => {
    const { agent_id } = req.body;

    // Use environment variables in production
    const API_KEY = process.env.RETELL_API_KEY;
    const DEFAULT_AGENT_ID = process.env.RETELL_CALL_AGENT_ID;

    try {
        const response = await fetch("https://api.retellai.com/v2/create-web-call", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                agent_id: agent_id || DEFAULT_AGENT_ID,
            })
        });

        if (!response.ok) {
            throw new Error(`Retell API error: ${response.statusText}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("Error creating web call:", error);
        res.status(500).json({ error: "Failed to create web call" });
    }
});

// Lead Capture Endpoint
// app.post('/api/retell-lead', async (req, res) => {

//   try {

//     const event = req.body.event;

//     // Only process final analyzed call
//     if (event !== "call_analyzed") {
//       return res.status(200).json({ message: "Event ignored" });
//     }

//     const call = req.body.call;

//     const transcript = call.transcript || "";
//     const summary = call.call_analysis?.call_summary || "";

//     // Extract email
//     const emailMatch = transcript.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/);
//     const email = emailMatch ? emailMatch[0] : null;

//     // Extract phone
//     const phoneMatch = transcript.match(/\+\d{10,15}/);
//     const phone = phoneMatch ? phoneMatch[0] : null;

//     // Extract name
//     const nameMatch = transcript.match(/Name:\s([A-Za-z]+)/);
//     const name = nameMatch ? nameMatch[1] : null;

//     console.log("Lead extracted:");
//     console.log({
//       name,
//       email,
//       phone,
//       summary
//     });

//     res.json({
//       success: true,
//       lead: {
//         name,
//         email,
//         phone,
//         summary
//       }
//     });

//   } catch (error) {

//     console.error("Webhook error:", error);

//     res.status(500).json({
//       success: false,
//       error: "Webhook processing failed"
//     });

//   }

// });

// app.post("/api/retell-lead", async (req, res) => {

//   console.log("Webhook received");

//   const event = req.body.event;

//   if (event !== "call_analyzed") {
//     return res.status(200).json({ message: "Event ignored" });
//   }

//   const call = req.body.call;

//   const transcript = call.transcript || "";
//   const summary = call.call_analysis?.call_summary || "";

//   const email = transcript.match(/[^\s]+@[^\s]+/)?.[0];
//   const phone = transcript.match(/\+\d{10,15}/)?.[0];
//   const name = transcript.match(/Name:\s([A-Za-z]+)/)?.[1];

//   console.log({ name, email, phone, summary });

//   res.json({ success: true });
// });


app.post("/api/retell-lead", async (req, res) => {
  console.log("Webhook received");

  const { event, call } = req.body;

  // 1. Guard Clause
  if (event !== "call_analyzed" || !call) {
    return res.status(200).json({ message: "Event ignored or call data missing" });
  }

  const transcript = call.transcript || "";
  const summary = call.call_analysis?.call_summary || "";

  // 2. Extraction (Improved Regex)
  const email = transcript.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0];
  const phone = transcript.match(/\+?\d{10,15}/)?.[0];
  // Note: Finding a name in a transcript via regex is tricky; 
  // ensure your Retell prompt explicitly outputs "Name: [Value]"
  const name = transcript.match(/Name:\s*([A-Za-z]+)/i)?.[1];

  console.log("Extracted Data:", { name, email, phone, summary });

  // 3. Prepare HubSpot Properties
  const properties = {
    firstname: name || "Retell Lead",
    email: email,
    phone: phone,
    message: summary 
  };

  // 4. HubSpot Logic
  if (!email) {
    console.error("No email found in transcript. Cannot create/update HubSpot contact.");
    return res.status(400).json({ error: "Missing email" });
  }

  try {
    const apiResponse = await hubspotClient.crm.contacts.basicApi.create({ properties });
    console.log(`Contact created. ID: ${apiResponse.id}`);
  } catch (error) {
    // Check specifically for 409 Conflict (Contact already exists)
    if (error.code === 409 || error.status === 409) {
      console.log("Contact exists. Updating via email...");
      try {
        // We use the email as the unique identifier for the update
        await hubspotClient.crm.contacts.basicApi.update(email, { properties }, 'email');
        console.log("Contact updated successfully.");
      } catch (updateError) {
        console.error("Update failed:", updateError.body?.message || updateError.message);
      }
    } else {
      console.error("HubSpot API Error:", error.body?.message || error.message);
    }
  }

  res.json({ success: true });
});


// app.post("/api/retell-lead", async (req, res) => {

//   if (req.body.event !== "call_analyzed") {
//     return res.status(200).json({ message: "Ignored" });
//   }

//   const call = req.body.call;

//   const transcript = call.transcript || "";
//   const summary = call.call_analysis?.call_summary || "";

//   const email = transcript.match(/[^\s]+@[^\s]+/)?.[0];
//   const phone = transcript.match(/\+\d{10,15}/)?.[0];
//   const name = transcript.match(/Name:\s([A-Za-z]+)/)?.[1];

//   try {

//     // Search contact
//     const search = await axios.post(
//       "https://api.hubapi.com/crm/v3/objects/contacts/search",
//       {
//         filterGroups: [{
//           filters: [{
//             propertyName: "email",
//             operator: "EQ",
//             value: email
//           }]
//         }]
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`
//         }
//       }
//     );

//     const contactId = search.data.results[0]?.id;

//     // Update phone
//     await axios.patch(
//       `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`,
//       {
//         properties: {
//           phone: phone
//         }
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`
//         }
//       }
//     );

//     // Create note with summary
//     await axios.post(
//       "https://api.hubapi.com/crm/v3/objects/notes",
//       {
//         properties: {
//           hs_note_body: summary
//         },
//         associations: [{
//           to: { id: contactId },
//           types: [{
//             associationCategory: "HUBSPOT_DEFINED",
//             associationTypeId: 202
//           }]
//         }]
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`
//         }
//       }
//     );

//     res.json({ success: true });

//   } catch (error) {
//     console.error(error.response?.data || error.message);
//     res.status(500).json({ error: "HubSpot update failed" });
//   }

// });

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
