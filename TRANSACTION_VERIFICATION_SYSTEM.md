# Server-Side Transaction Verification System

## Overview
This system ensures that ALL transaction verification happens server-side with proper backend callbacks and user association. No transaction is considered valid until verified and processed by the server.

## Key Components

### 1. Server-Side Verification Endpoint
**`POST /api/transactions/verify-transaction`**
- Authenticates users via JWT
- Validates transaction data against blockchain
- Prevents duplicate processing
- Triggers server-side callbacks on success
- Associates transactions with specific users

### 2. Backend Callbacks System
When a transaction is successfully verified, the server automatically triggers:

#### `handleSuccessfulTransaction()` - Main Callback
- **User Transaction History**: Adds to user's permanent transaction log
- **Balance Updates**: Updates user's balance/credits per blockchain
- **User Notifications**: Sends transaction success notifications
- **Statistics Updates**: Updates user stats (total transactions, amounts)
- **Audit Logging**: Logs all callback executions for audit trail

### 3. User Data Management (Server-Side)
- **Transaction History**: `GET /api/transactions/user-history`
- **User Balance**: `GET /api/transactions/user-balance` 
- **Notifications**: `GET /api/transactions/user-notifications`
- All data stored in Redis with proper expiration and user association

### 4. Webhook Support
**`POST /api/transactions/webhook/transaction-completed`**
- Allows external systems to notify about completed transactions
- Secured with API key authentication
- Triggers same verification and callback flow
- Prevents duplicate processing

### 5. Security Features
- **JWT Authentication**: All endpoints require valid user authentication
- **User Association**: Transactions must match authenticated user's wallet
- **Rate Limiting**: Prevents abuse with configurable limits
- **Duplicate Prevention**: Redis-based deduplication
- **API Key Protection**: Webhook endpoint secured with API key

## Transaction Flow

```
1. Client initiates blockchain transaction
2. Client calls server verification endpoint
3. Server validates transaction on blockchain
4. Server stores verification result in Redis
5. Server triggers handleSuccessfulTransaction() callback
6. Callback updates user balance, history, stats, notifications
7. Server logs all actions for audit
8. Client receives verification response
```

## Data Storage (Redis)

### Transaction Verification Cache
- **Key**: `tx_verify_{transactionHash}`
- **Expiration**: 24 hours
- **Contains**: Verification result, blockchain data, user association

### User Transaction History  
- **Key**: `tx_history_{userAddress}`
- **Expiration**: 30 days
- **Contains**: Last 100 user transactions

### User Balance
- **Key**: `user_balance_{userAddress}`
- **Expiration**: 30 days  
- **Contains**: Balance per blockchain, recent transactions

### User Statistics
- **Key**: `user_stats_{userAddress}`
- **Expiration**: 1 year
- **Contains**: Total transactions, amounts, timestamps

### User Notifications
- **Key**: `user_notifications_{userAddress}`
- **Expiration**: 7 days
- **Contains**: Last 20 notifications with read status

### Audit Logs
- **Key**: `tx_log_{userAddress}_{timestamp}` and `callback_log_{timestamp}_{random}`
- **Expiration**: 30 days
- **Contains**: Complete audit trail of all transactions and callbacks

## Client Integration

The client-side transaction managers now:
1. Execute blockchain transactions locally
2. **Immediately call server verification** (required)
3. Consider transaction **FAILED** if server verification fails
4. Server verification triggers all backend callbacks automatically

## Environment Configuration

Required environment variable:
```
WEBHOOK_API_KEY='secure_webhook_key_for_transaction_verification_123456'
```

## Supported Blockchains
- Ethereum
- Bitcoin  
- Solana
- Cardano
- Aptos
- Sui

Each blockchain has its own verification implementation in `verifyTransactionOnBlockchain()`.

## Security Guarantees

✅ **Server-Side Verification**: All transactions verified by server, not client
✅ **User Association**: Every transaction linked to authenticated user  
✅ **Backend Callbacks**: Automatic server-side processing on success
✅ **Audit Trail**: Complete logging of all transactions and callbacks
✅ **Duplicate Prevention**: Redis-based deduplication
✅ **Rate Limiting**: Protection against abuse
✅ **Secure Authentication**: JWT-based user verification
