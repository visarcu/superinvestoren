#!/usr/bin/env node

// scripts/trigger-filing-notifications.js
// Rufe nach fetch13f.js auf um Filing-Notifications zu versenden

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function triggerFilingNotifications(specificInvestor = null) {
  try {
    console.log('🔔 Triggering filing notifications...');
    
    if (specificInvestor) {
      console.log(`📊 Checking for ${specificInvestor} specifically`);
    } else {
      console.log('📊 Checking all investors for recent filings (last 24h)');
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notifications/trigger-filing-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      },
      body: JSON.stringify({
        specificInvestor
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Filing notifications triggered successfully!');
      console.log(`📧 ${result.filingEmailsSent} emails sent`);
      console.log(`🔔 ${result.filingNotificationsSent} in-app notifications created`);
      console.log(`👥 ${result.usersChecked} users checked`);
      
      if (result.recentInvestors?.length > 0) {
        console.log(`📈 Recent filings found for: ${result.recentInvestors.join(', ')}`);
      } else {
        console.log('📭 No recent filings found');
      }
    } else {
      console.error('❌ Error triggering notifications:', result.error);
      process.exit(1);
    }

  } catch (error) {
    console.error('💥 Failed to trigger filing notifications:', error.message);
    process.exit(1);
  }
}

// Command line usage
const specificInvestor = process.argv[2]; // Optional: node trigger-filing-notifications.js spier

triggerFilingNotifications(specificInvestor);