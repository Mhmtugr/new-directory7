import { Configuration } from 'openai';

// OpenAI API konfigürasyonu
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

export default configuration;
