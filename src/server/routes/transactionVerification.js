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
 */
async function handleSuccessfulTransaction(userAddress, blockchain, amount, transactionHash) {
  // This is where you would implement any post-transaction logic such as:
  // - Updating user's in-game balance
  // - Sending notifications
  // - Triggering rewards or bonuses
  // - Updating leaderboards
  // - etc.
  
  console.log(`[TX_VERIFY] Processing successful transaction for ${userAddress}: ${amount} ${blockchain}`);
  
  // Example: Store successful transaction for user's transaction history
  const historyKey = `tx_history_${userAddress}`;
  const historyEntry = {
    transactionHash,
    blockchain,
    amount,
    timestamp: new Date().toISOString(),
    status: 'verified'
  };
  
  // Add to user's transaction history (keep last 100 transactions)
  const existingHistory = await redisClient.get(historyKey);
  let history = existingHistory ? JSON.parse(existingHistory) : [];
  history.unshift(historyEntry);
  history = history.slice(0, 100); // Keep only last 100 transactions
  
  await redisClient.setEx(historyKey, 30 * 24 * 60 * 60, JSON.stringify(history));
}

export default function createTransactionVerificationRoutes() {
  return router;
}
