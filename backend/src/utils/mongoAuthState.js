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
    } else {
      creds = initAuthCreds();
    }
  } catch (error) {
    console.error('Failed to load WhatsApp credentials from MongoDB:', error);
    creds = initAuthCreds();
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
            console.error('Failed to get WhatsApp keys from MongoDB:', error);
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
            console.error('Failed to set WhatsApp keys in MongoDB:', error);
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
      } catch (error) {
        console.error('Failed to save WhatsApp credentials to MongoDB:', error);
      }
    },
  };
};
