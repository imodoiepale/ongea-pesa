import { ElevenLabsClient } from "elevenlabs";

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY,
});

// Conversational Agent Integration
export class ElevenLabsConversationAgent {
  private agentId: string;
  private conversationId: string | null = null;

  constructor(agentId: string) {
    this.agentId = agentId;
  }

  async startConversation(): Promise<string | null> {
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations`, {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: this.agentId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to start conversation: ${response.statusText}`);
      }

      const data = await response.json();
      this.conversationId = data.conversation_id;
      return this.conversationId;
    } catch (error) {
      console.error("Error starting conversation:", error);
      return null;
    }
  }

  async sendMessage(audioBlob: Blob): Promise<Blob | null> {
    if (!this.conversationId) {
      await this.startConversation();
    }

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');

      const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${this.conversationId}/audio`, {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY!,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      const audioResponse = await response.blob();
      return audioResponse;
    } catch (error) {
      console.error("Error sending message to agent:", error);
      return null;
    }
  }

  async endConversation(): Promise<void> {
    if (!this.conversationId) return;

    try {
      await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${this.conversationId}`, {
        method: 'DELETE',
        headers: {
          'xi-api-key': process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY!,
        },
      });
      this.conversationId = null;
    } catch (error) {
      console.error("Error ending conversation:", error);
    }
  }
}

// Legacy text-to-speech function (kept for backward compatibility)
export const textToSpeech = async (text: string) => {
  try {
    const audio = await elevenlabs.generate({
      voice: "Rachel",
      text,
      model_id: "eleven_multilingual_v2",
    });

    const audioBlob = new Blob([audio as BlobPart], { type: "audio/mpeg" });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audioElement = new Audio(audioUrl);
    audioElement.play();

    return audioElement;
  } catch (error) {
    console.error("Error with ElevenLabs API:", error);
    return null;
  }
};
