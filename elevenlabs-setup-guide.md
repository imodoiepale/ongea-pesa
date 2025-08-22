# ElevenLabs Kenyan Dictionary Setup Guide

## Quick Setup Steps

### 1. Upload Dictionary to ElevenLabs
```bash
# Using ElevenLabs API
curl -X POST "https://api.elevenlabs.io/v1/pronunciation-dictionaries/add" \
  -H "Accept: application/json" \
  -H "xi-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d @elevenlabs-kenyan-dictionary.json
```

### 2. Configure Voice Settings
```json
{
  "voice_settings": {
    "stability": 0.75,
    "similarity_boost": 0.85,
    "style": 0.2,
    "use_speaker_boost": true
  },
  "model_id": "eleven_multilingual_v2",
  "pronunciation_dictionary_id": "kenyan_mpesa_dict_v1"
}
```

### 3. Test Key Pronunciations
```javascript
// Test these critical M-Pesa terms
const testPhrases = [
  "Tuma pesa elfu moja kwa mama",
  "Lipa bill paybill nambari saba saba saba",
  "Pochi la Biashara imefika",
  "Tumeshinda! Pesa imefika haraka"
];
```

## Key Features

### ✅ **M-Pesa Specific Terms**
- **M-Pesa** → "em-PEH-sah"
- **Paybill** → "PAY-bill" 
- **Till** → "TILL"
- **Pochi** → "POH-chee"

### ✅ **Kiswahili Transaction Words**
- **Tuma** → "TOO-mah" (send)
- **Lipa** → "LEE-pah" (pay)
- **Toa** → "TOH-ah" (withdraw)
- **Nunua** → "noo-NOO-ah" (buy)

### ✅ **Numbers in Kiswahili**
- **Moja** → "MOH-jah" (one)
- **Elfu** → "EL-foo" (thousand)
- **Mia** → "MEE-ah" (hundred)

### ✅ **Success Phrases**
- **Tumeshinda** → "too-meh-SHEEN-dah" (we succeeded)
- **Imefika** → "ee-meh-FEE-kah" (it arrived)
- **Sawa sawa** → "SAH-wah SAH-wah" (all good)

## Integration with VAPI

### Voice Response Examples
```javascript
// Success responses
"Tumeshinda! Pesa imefika kwa mama" 
// → "We succeeded! Money arrived to mom"

"Sawa sawa, bill imelipwa"
// → "All good, bill has been paid"

"Haraka sana! Till imelipwa"
// → "Very fast! Till has been paid"
```

### Error Handling
```javascript
// Error responses with proper pronunciation
"Pole, nambari si sahihi"
// → "Sorry, number is not correct"

"Ngoja kidogo, tunajaribu tena"
// → "Wait a bit, we're trying again"
```

## Pronunciation Rules Applied

### **Vowel Consistency**
- **A** = always "ah" (like "father")
- **E** = always "eh" (like "bet") 
- **I** = always "ee" (like "see")
- **O** = always "oh" (like "go")
- **U** = always "oo" (like "boot")

### **Stress Patterns**
- Stress on **penultimate** syllable
- **ha-BA-ri** (not HA-ba-ri)
- **a-SAN-te** (not a-san-TE)

### **Special Consonants**
- **ng** = "ng" in "sing" (not n-g)
- **ny** = "ny" in "canyon"
- **ch** = "ch" in "church"

## Testing Your Dictionary

### 1. Upload to ElevenLabs Dashboard
1. Go to ElevenLabs → Speech Synthesis → Pronunciation Dictionary
2. Upload `elevenlabs-kenyan-dictionary.json`
3. Set as default for your voice model

### 2. Test Critical Phrases
```
"Habari! Tuma pesa elfu mbili kwa rafiki"
"Lipa paybill nambari tatu tatu tatu, akaunti moja moja moja"
"Pochi la Biashara, pesa imefika sawa sawa"
```

### 3. Verify Number Pronunciation
```
"Elfu moja" → "EL-foo MOH-jah" (1,000)
"Mia tano" → "MEE-ah TAH-noh" (500) 
"Ishirini" → "ee-shee-REE-nee" (20)
```

Your ElevenLabs voice will now sound authentically Kenyan for M-Pesa transactions!
