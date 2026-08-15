import 'dotenv/config';
import { connectDB } from './src/config/db.js';
import { sendThankYouMessage } from './src/services/whatsappService.js';

async function test() {
  try {
    await connectDB();
    console.log('Sending test thank you message...');
    const result = await sendThankYouMessage('8590506862', 'Test User', 500, new Date());
    console.log('Result:', result);
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

test();
