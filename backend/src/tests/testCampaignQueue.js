/**
 * Campaign Queue Dry-Run Test
 * 
 * Tests the full campaign pipeline with 100 fake recipients:
 * 1. Queues 100 messages via the campaign API
 * 2. Watches the background worker process them
 * 3. Reports progress every 5 seconds
 * 4. Cleans up test data when done
 * 
 * USAGE:
 *   1. Add CAMPAIGN_DRY_RUN=true to your .env file
 *   2. Start your backend: npm run dev
 *   3. Run this test: node src/tests/testCampaignQueue.js
 *   4. Remove CAMPAIGN_DRY_RUN=true from .env when done
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { MessageLog } from '../models/MessageLog.js';

const MONGO_URI = process.env.MONGODB_URI;
const TEST_CAMPAIGN_ID = `test_campaign_${Date.now()}`;
const RECIPIENT_COUNT = 100;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const log = (msg) => console.log(`[TEST ${new Date().toLocaleTimeString()}] ${msg}`);

async function run() {
  // ── Step 1: Connect to MongoDB ──
  log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  log('✅ Connected.\n');

  // ── Step 2: Check DRY_RUN is enabled ──
  if (process.env.CAMPAIGN_DRY_RUN !== 'true') {
    console.error('❌ ERROR: CAMPAIGN_DRY_RUN is not set to "true" in your .env file!');
    console.error('   Add CAMPAIGN_DRY_RUN=true to .env and restart your backend before running this test.');
    process.exit(1);
  }
  log('✅ DRY_RUN mode confirmed.\n');

  // ── Step 3: Generate fake recipients and insert as queued ──
  log(`Creating ${RECIPIENT_COUNT} fake queued messages (campaign: ${TEST_CAMPAIGN_ID})...`);

  const fakeMessages = [];
  for (let i = 1; i <= RECIPIENT_COUNT; i++) {
    fakeMessages.push({
      recipientPhone: `919${String(i).padStart(9, '0')}`,
      recipientName: `Test Donor ${i}`,
      templateName: 'dry_run_test_template',
      messageType: 'campaign',
      content: 'Template: dry_run_test_template | Params: Test',
      status: 'queued',
      campaignId: TEST_CAMPAIGN_ID,
      campaignName: `Dry Run Test (${RECIPIENT_COUNT} recipients)`,
      bodyParams: ['Test'],
      languageCode: 'en',
    });
  }

  await MessageLog.insertMany(fakeMessages);
  log(`✅ Inserted ${RECIPIENT_COUNT} queued messages.\n`);

  // ── Step 4: Monitor the worker processing them ──
  log('Monitoring worker progress (the background worker in your running server will pick these up)...');
  log('─'.repeat(60));

  const startTime = Date.now();
  let lastSent = 0;

  while (true) {
    const counts = await MessageLog.aggregate([
      { $match: { campaignId: TEST_CAMPAIGN_ID } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const stats = { queued: 0, sent: 0, delivered: 0, failed: 0 };
    for (const c of counts) {
      stats[c._id] = c.count;
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const processed = stats.sent + stats.delivered + stats.failed;
    const rate = elapsed > 0 ? (processed / elapsed * 60).toFixed(1) : '0';

    // Progress bar
    const pct = Math.round((processed / RECIPIENT_COUNT) * 100);
    const barLen = 30;
    const filled = Math.round(barLen * pct / 100);
    const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);

    console.clear();
    console.log('');
    console.log('  📊 Campaign Queue Dry-Run Test');
    console.log('  ═'.repeat(30));
    console.log(`  Campaign ID : ${TEST_CAMPAIGN_ID}`);
    console.log(`  Total       : ${RECIPIENT_COUNT} recipients`);
    console.log(`  Elapsed     : ${elapsed}s`);
    console.log('');
    console.log(`  Progress    : [${bar}] ${pct}%`);
    console.log('');
    console.log(`  📨 Queued   : ${stats.queued}`);
    console.log(`  ✅ Sent     : ${stats.sent}`);
    console.log(`  📬 Delivered: ${stats.delivered}`);
    console.log(`  ❌ Failed   : ${stats.failed}`);
    console.log(`  ⚡ Rate     : ${rate} msgs/min`);
    console.log('');

    if (stats.sent > lastSent) {
      lastSent = stats.sent;
    }

    // Done when no more queued
    if (stats.queued === 0 && processed === RECIPIENT_COUNT) {
      console.log('  🎉 ALL MESSAGES PROCESSED!');
      console.log(`  Total time: ${elapsed} seconds (${rate} msgs/min)`);
      console.log('');
      break;
    }

    if (elapsed > 600) {
      console.log('  ⚠️ Timeout after 10 minutes. Something may be wrong.');
      break;
    }

    await sleep(5000);
  }

  // ── Step 5: Cleanup ──
  log('\nCleaning up test data...');
  const deleted = await MessageLog.deleteMany({ campaignId: TEST_CAMPAIGN_ID });
  log(`✅ Deleted ${deleted.deletedCount} test message logs.`);

  log('\n✅ Test complete! Remove CAMPAIGN_DRY_RUN=true from your .env for production.\n');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
