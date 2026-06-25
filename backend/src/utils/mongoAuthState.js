import { initAuthCreds, BufferJSON } from '@whiskeysockets/baileys';
import { WhatsAppAuth } from '../models/WhatsAppAuth.js';

/**
 * Custom Baileys authentication state adapter using MongoDB.
 * Replaces useMultiFileAuthState to support ephemeral environments like Railway.
 */
export const useMongoDBAuthState = async () => {
  // Try to load existing credentials
  let creds;
  try {
    const credsDoc = await WhatsAppAuth.findById('creds');
    if (credsDoc && credsDoc.value) {
      creds = JSON.parse(JSON.stringify(credsDoc.value), BufferJSON.reviver);
      console.log('[WhatsApp Auth] ✅ Loaded existing credentials from MongoDB (session should resume without QR)');
    } else {
      creds = initAuthCreds();
      console.log('[WhatsApp Auth] ℹ️  No existing credentials found — fresh session will require QR scan');
    }
  } catch (error) {
    console.error('[WhatsApp Auth] ❌ Failed to load credentials from MongoDB:', error.message);
    creds = initAuthCreds();
  }

  // Log how many auth keys exist (helps debug persistence issues)
  try {
    const keyCount = await WhatsAppAuth.countDocuments({ _id: { $ne: 'creds' } });
    console.log(`[WhatsApp Auth] 🔑 Found ${keyCount} signal keys in MongoDB`);
  } catch {
    // non-critical — just for debugging
  }

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          try {
            await Promise.all(
              ids.map(async (id) => {
                const doc = await WhatsAppAuth.findById(`${type}-${id}`);
                if (doc && doc.value) {
                  data[id] = JSON.parse(JSON.stringify(doc.value), BufferJSON.reviver);
                }
              })
            );
          } catch (error) {
            console.error('[WhatsApp Auth] Failed to get keys from MongoDB:', error.message);
          }
          return data;
        },
        set: async (data) => {
          try {
            const tasks = [];
            for (const category in data) {
              for (const id in data[category]) {
                const value = data[category][id];
                const key = `${category}-${id}`;
                if (value) {
                  const valueToStore = JSON.parse(JSON.stringify(value, BufferJSON.replacer));
                  tasks.push(
                    WhatsAppAuth.findByIdAndUpdate(
                      key,
                      { value: valueToStore },
                      { upsert: true, new: true }
                    )
                  );
                } else {
                  tasks.push(WhatsAppAuth.findByIdAndDelete(key));
                }
              }
            }
            await Promise.all(tasks);
          } catch (error) {
            console.error('[WhatsApp Auth] Failed to set keys in MongoDB:', error.message);
          }
        },
      },
    },
    saveCreds: async () => {
      try {
        await WhatsAppAuth.findByIdAndUpdate(
          'creds',
          { value: JSON.parse(JSON.stringify(creds, BufferJSON.replacer)) },
          { upsert: true }
        );
        console.log('[WhatsApp Auth] 💾 Credentials saved to MongoDB');
      } catch (error) {
        console.error('[WhatsApp Auth] ❌ Failed to save credentials to MongoDB:', error.message);
      }
    },
  };
};
