import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateJWT } from '../scripts/jwt.js';
import { redisClient } from '../scripts/data.js';

const router = express.Router();

// Rate limiting for transaction verification
const verificationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 requests per windowMs
  message: "Too many verification requests, try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Verify transaction success on server-side
 * This endpoint should be called after a client-side transaction is initiated
 */
router.post('/verify-transaction', verificationLimiter, authenticateJWT, async (req, res) => {
  try {
    const { transactionHash, blockchain, amount, walletAddress } = req.body;
    const userAddress = req.user?.address;

    // Validate required fields
    if (!transactionHash || !blockchain || !amount || !walletAddress) {
      return res.status(400).json({ 
        error: 'Missing required fields: transactionHash, blockchain, amount, walletAddress' 
      });
    }

    // Verify that the requesting user matches the wallet address
    if (userAddress !== walletAddress) {
      return res.status(403).json({ 
        error: 'Wallet address mismatch' 
      });
    }

    console.log(`[TX_VERIFY] Starting verification for ${blockchain} transaction: ${transactionHash}`);

    // Prevent duplicate verification attempts
    const verificationKey = `tx_verify_${transactionHash}`;
    const existingVerification = await redisClient.get(verificationKey);
    
    if (existingVerification) {
      const result = JSON.parse(existingVerification);
      return res.json({
        success: result.success,
        message: result.success ? 'Transaction already verified' : 'Transaction already failed verification',
        transactionHash,
        blockchain,
        amount,
        timestamp: result.timestamp
      });
    }

    // Perform blockchain-specific verification
    let verificationResult;
    try {
      verificationResult = await verifyTransactionOnBlockchain(blockchain, transactionHash, amount, walletAddress);
    } catch (error) {
      console.error(`[TX_VERIFY] Verification failed for ${blockchain} transaction ${transactionHash}:`, error);
      verificationResult = { success: false, error: error.message };
    }

    // Store verification result in Redis (expires in 24 hours)
    const verificationData = {
      success: verificationResult.success,
      transactionHash,
      blockchain,
      amount,
      walletAddress,
      timestamp: new Date().toISOString(),
      error: verificationResult.error || null,
      blockNumber: verificationResult.blockNumber || null,
      confirmations: verificationResult.confirmations || null
    };

    await redisClient.setEx(verificationKey, 24 * 60 * 60, JSON.stringify(verificationData));

    if (verificationResult.success) {
      // Log successful transaction for audit purposes
      await logSuccessfulTransaction(userAddress, transactionHash, blockchain, amount);
      
      // Trigger any post-transaction actions (e.g., update user balance, send notifications)
      await handleSuccessfulTransaction(userAddress, blockchain, amount, transactionHash);
    }

    res.json({
      success: verificationResult.success,
      message: verificationResult.success ? 'Transaction verified successfully' : 'Transaction verification failed',
      transactionHash,
      blockchain,
      amount,
      timestamp: verificationData.timestamp,
      blockNumber: verificationResult.blockNumber,
      confirmations: verificationResult.confirmations,
      error: verificationResult.error
    });

  } catch (error) {
    console.error('[TX_VERIFY] Server error during transaction verification:', error);
    res.status(500).json({ 
      error: 'Internal server error during transaction verification' 
    });
  }
});

/**
 * Get transaction verification status
 */
router.get('/verification-status/:transactionHash', verificationLimiter, authenticateJWT, async (req, res) => {
  try {
    const { transactionHash } = req.params;
    const verificationKey = `tx_verify_${transactionHash}`;
    
    const verificationData = await redisClient.get(verificationKey);
    
    if (!verificationData) {
      return res.status(404).json({ 
        error: 'Transaction verification not found' 
      });
    }

    const result = JSON.parse(verificationData);
    res.json(result);

  } catch (error) {
    console.error('[TX_VERIFY] Error retrieving verification status:', error);
    res.status(500).json({ 
      error: 'Internal server error retrieving verification status' 
    });
  }
});

/**
 * Blockchain-specific transaction verification
 * This function should be implemented for each supported blockchain
 */
async function verifyTransactionOnBlockchain(blockchain, transactionHash, expectedAmount, expectedWalletAddress) {
  switch (blockchain.toLowerCase()) {
    case 'ethereum':
      return await verifyEthereumTransaction(transactionHash, expectedAmount, expectedWalletAddress);
    case 'solana':
      return await verifySolanaTransaction(transactionHash, expectedAmount, expectedWalletAddress);
    case 'bitcoin':
      return await verifyBitcoinTransaction(transactionHash, expectedAmount, expectedWalletAddress);
    case 'aptos':
      return await verifyAptosTransaction(transactionHash, expectedAmount, expectedWalletAddress);
    case 'cardano':
      return await verifyCardanoTransaction(transactionHash, expectedAmount, expectedWalletAddress);
    case 'sui':
      return await verifySuiTransaction(transactionHash, expectedAmount, expectedWalletAddress);
    default:
      throw new Error(`Unsupported blockchain: ${blockchain}`);
  }
}

/**
 * Ethereum transaction verification
 */
async function verifyEthereumTransaction(transactionHash, expectedAmount, expectedWalletAddress) {
  // Placeholder for Ethereum verification logic
  // In a real implementation, you would use web3.js or ethers.js to verify the transaction
  console.log(`[TX_VERIFY] Verifying Ethereum transaction: ${transactionHash}`);
  
  // Simulate verification - replace with actual RPC calls
  return {
    success: true,
    blockNumber: 12345678,
    confirmations: 6
  };
}

/**
 * Solana transaction verification
 */
async function verifySolanaTransaction(transactionHash, expectedAmount, expectedWalletAddress) {
  // Placeholder for Solana verification logic
  console.log(`[TX_VERIFY] Verifying Solana transaction: ${transactionHash}`);
  
  return {
    success: true,
    blockNumber: 87654321,
    confirmations: 32
  };
}

/**
 * Bitcoin transaction verification
 */
async function verifyBitcoinTransaction(transactionHash, expectedAmount, expectedWalletAddress) {
  // Placeholder for Bitcoin verification logic
  console.log(`[TX_VERIFY] Verifying Bitcoin transaction: ${transactionHash}`);
  
  return {
    success: true,
    blockNumber: 654321,
    confirmations: 3
  };
}

/**
 * Aptos transaction verification
 */
async function verifyAptosTransaction(transactionHash, expectedAmount, expectedWalletAddress) {
  // Placeholder for Aptos verification logic
  console.log(`[TX_VERIFY] Verifying Aptos transaction: ${transactionHash}`);
  
  return {
    success: true,
    blockNumber: 456789,
    confirmations: 1
  };
}

/**
 * Cardano transaction verification
 */
async function verifyCardanoTransaction(transactionHash, expectedAmount, expectedWalletAddress) {
  // Placeholder for Cardano verification logic
  console.log(`[TX_VERIFY] Verifying Cardano transaction: ${transactionHash}`);
  
  return {
    success: true,
    blockNumber: 789123,
    confirmations: 5
  };
}

/**
 * Sui transaction verification
 */
async function verifySuiTransaction(transactionHash, expectedAmount, expectedWalletAddress) {
  // Placeholder for Sui verification logic
  console.log(`[TX_VERIFY] Verifying Sui transaction: ${transactionHash}`);
  
  return {
    success: true,
    blockNumber: 321654,
    confirmations: 1
  };
}

/**
 * Log successful transaction for audit purposes
 */
async function logSuccessfulTransaction(userAddress, transactionHash, blockchain, amount) {
  const logKey = `tx_log_${userAddress}_${Date.now()}`;
  const logData = {
    userAddress,
    transactionHash,
    blockchain,
    amount,
    timestamp: new Date().toISOString(),
    status: 'verified'
  };
  
  // Store for 30 days
  await redisClient.setEx(logKey, 30 * 24 * 60 * 60, JSON.stringify(logData));
  console.log(`[TX_VERIFY] Logged successful transaction for ${userAddress}: ${transactionHash}`);
}

/**
 * Handle post-transaction actions after successful verification
 * This is the main server-side callback triggered when a transaction is completed
 */
async function handleSuccessfulTransaction(userAddress, blockchain, amount, transactionHash) {
  console.log(`[TX_CALLBACK] Processing successful transaction for user ${userAddress}: ${amount} ${blockchain}`);

  try {
    // 1. Store successful transaction for user's transaction history
    await addToUserTransactionHistory(userAddress, {
      transactionHash,
      blockchain,
      amount,
      timestamp: new Date().toISOString(),
      status: 'verified'
    });

    // 2. Update user's balance/credits (placeholder for game logic)
    await updateUserBalance(userAddress, blockchain, amount, transactionHash);

    // 3. Trigger user notifications
    await sendUserNotification(userAddress, {
      type: 'transaction_success',
      blockchain,
      amount,
      transactionHash
    });

    // 4. Update user statistics and achievements
    await updateUserStats(userAddress, blockchain, amount);

    // 5. Log the callback execution for audit
    await logCallbackExecution(userAddress, transactionHash, 'success');

    console.log(`[TX_CALLBACK] Successfully processed transaction ${transactionHash} for user ${userAddress}`);

  } catch (error) {
    console.error(`[TX_CALLBACK] Error processing transaction ${transactionHash} for user ${userAddress}:`, error);
    await logCallbackExecution(userAddress, transactionHash, 'error', error.message);
  }
}

/**
 * Add transaction to user's history
 */
async function addToUserTransactionHistory(userAddress, transactionEntry) {
  const historyKey = `tx_history_${userAddress}`;

  // Get existing history
  const existingHistory = await redisClient.get(historyKey);
  let history = existingHistory ? JSON.parse(existingHistory) : [];

  // Add new transaction to the beginning
  history.unshift(transactionEntry);

  // Keep only last 100 transactions
  history = history.slice(0, 100);

  // Store back to Redis (30 days expiration)
  await redisClient.setEx(historyKey, 30 * 24 * 60 * 60, JSON.stringify(history));

  console.log(`[TX_CALLBACK] Added transaction to history for user ${userAddress}`);
}

/**
 * Update user's balance/credits after successful transaction
 */
async function updateUserBalance(userAddress, blockchain, amount, transactionHash) {
  const balanceKey = `user_balance_${userAddress}`;

  // Get current balance
  const currentBalanceData = await redisClient.get(balanceKey);
  let balanceData = currentBalanceData ? JSON.parse(currentBalanceData) : {};

  // Initialize blockchain balance if not exists
  if (!balanceData[blockchain]) {
    balanceData[blockchain] = { total: 0, transactions: [] };
  }

  // Add to balance
  balanceData[blockchain].total += parseFloat(amount);
  balanceData[blockchain].transactions.push({
    transactionHash,
    amount: parseFloat(amount),
    timestamp: new Date().toISOString()
  });

  // Keep only last 50 transactions per blockchain
  balanceData[blockchain].transactions = balanceData[blockchain].transactions.slice(-50);

  // Store updated balance
  await redisClient.setEx(balanceKey, 30 * 24 * 60 * 60, JSON.stringify(balanceData));

  console.log(`[TX_CALLBACK] Updated balance for user ${userAddress}: +${amount} ${blockchain}`);
}

/**
 * Send notification to user about successful transaction
 */
async function sendUserNotification(userAddress, notificationData) {
  const notificationKey = `user_notifications_${userAddress}`;

  const notification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...notificationData,
    timestamp: new Date().toISOString(),
    read: false
  };

  // Get existing notifications
  const existingNotifications = await redisClient.get(notificationKey);
  let notifications = existingNotifications ? JSON.parse(existingNotifications) : [];

  // Add new notification
  notifications.unshift(notification);

  // Keep only last 20 notifications
  notifications = notifications.slice(0, 20);

  // Store notifications (7 days expiration)
  await redisClient.setEx(notificationKey, 7 * 24 * 60 * 60, JSON.stringify(notifications));

  console.log(`[TX_CALLBACK] Sent notification to user ${userAddress}: ${notificationData.type}`);
}

/**
 * Update user statistics after successful transaction
 */
async function updateUserStats(userAddress, blockchain, amount) {
  const statsKey = `user_stats_${userAddress}`;

  // Get current stats
  const currentStats = await redisClient.get(statsKey);
  let stats = currentStats ? JSON.parse(currentStats) : {
    totalTransactions: 0,
    totalAmount: {},
    firstTransaction: new Date().toISOString(),
    lastTransaction: null
  };

  // Update stats
  stats.totalTransactions += 1;
  stats.lastTransaction = new Date().toISOString();

  if (!stats.totalAmount[blockchain]) {
    stats.totalAmount[blockchain] = 0;
  }
  stats.totalAmount[blockchain] += parseFloat(amount);

  // Store updated stats (permanent with 1 year expiration)
  await redisClient.setEx(statsKey, 365 * 24 * 60 * 60, JSON.stringify(stats));

  console.log(`[TX_CALLBACK] Updated stats for user ${userAddress}: ${stats.totalTransactions} total transactions`);
}

/**
 * Log callback execution for audit purposes
 */
async function logCallbackExecution(userAddress, transactionHash, status, error = null) {
  const logKey = `callback_log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const logData = {
    userAddress,
    transactionHash,
    status,
    error,
    timestamp: new Date().toISOString(),
    callbackId: logKey
  };

  // Store callback execution log (30 days)
  await redisClient.setEx(logKey, 30 * 24 * 60 * 60, JSON.stringify(logData));

  console.log(`[TX_CALLBACK] Logged callback execution: ${status} for transaction ${transactionHash}`);
}

export default function createTransactionVerificationRoutes() {
  return router;
}
