import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

// Use the API key directly since we're running this as a one-time script
const elevenlabs = new ElevenLabsClient({
  apiKey: "sk_1ee9cf0f83d237d1447419cba03afb247326af181a2223ba"
});

async function createAgent() {
  try {
    console.log("Creating Ongea Pesa conversational agent...");
    
    const agent = await elevenlabs.conversationalAi.agents.create({
      name: "Ongea Pesa Assistant",
      conversationConfig: {
        agent: {
          prompt: {
            prompt: `You are Ongea Pesa, a helpful Swahili-English bilingual voice assistant for mobile money transactions in Kenya.

You help users with:
- Sending money to contacts (e.g., "Tuma 500 kwa John" or "Send 500 to John")
- Checking wallet balance (e.g., "Balance yangu ni ngapi?" or "What's my balance?")
- Loading money via M-Pesa
- Viewing transaction history

Always be friendly, concise, and confirm transaction details before proceeding.
Respond in the same language the user speaks (Swahili or English).
For amounts, always confirm the recipient and amount before executing.

Current user context will be provided including their balance, name, and gate information.`
          },
          firstMessage: "Habari! Mimi ni Ongea Pesa, msaidizi wako wa pesa. Ninaweza kukusaidia kutuma pesa, kuangalia balance, au kuongeza pesa. Ungehitaji nini leo? (Hello! I'm Ongea Pesa, your money assistant. I can help you send money, check balance, or add funds. What would you like today?)",
          language: "en"
        },
        tts: {
          voiceId: "21m00Tcm4TlvDq8ikWAM" // Rachel - a clear, friendly voice
        }
      }
    });

    console.log("\n✅ Agent created successfully!");
    console.log("Agent ID:", agent.agent_id);
    console.log("Agent Name:", agent.name);
    console.log("\n📝 Update your .env.local with:");
    console.log(`NEXT_PUBLIC_AGENT_ID=${agent.agent_id}`);
    console.log(`NEXT_PUBLIC_ELEVENLABS_AGENT_ID=${agent.agent_id}`);
    
    return agent;
  } catch (error) {
    console.error("❌ Error creating agent:", error);
    
    // If agent creation fails, try to list existing agents
    console.log("\n🔍 Trying to list existing agents...");
    try {
      const agents = await elevenlabs.conversationalAi.agents.list();
      console.log("Existing agents:", agents);
    } catch (listError) {
      console.error("Could not list agents:", listError.message);
    }
  }
}

createAgent();
