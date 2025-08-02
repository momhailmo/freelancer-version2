import { useGlobalStore } from '@/client/stores/global';
import { storeToRefs } from 'pinia';

// Import wallet connection functions
import { selectWalletSolana } from './chains/solana.js';
import { selectWalletAptos } from './chains/aptos.js';
import { selectWalletEthereum } from './chains/ethereum.js';
import { selectWalletBitcoin } from './chains/bitcoin.js';
import { selectWalletCardano } from './chains/cardano.js';
import { selectWalletSui } from './chains/sui.js';

/**
 * Automatically connects to the wallet based on values stored in global.js
 * This eliminates the need for manual wallet selection
 */
export async function autoConnectWallet() {
  const store = useGlobalStore();
  const { crypto_selected, wallet_selected, is_authenticated } = storeToRefs(store);

  // Don't auto-connect if already authenticated
  if (is_authenticated.value) {
    console.log('[AUTO_CONNECT] User already authenticated, skipping auto-connect');
    return;
  }

  const cryptoType = crypto_selected.value;
  const walletType = wallet_selected.value;

  if (!cryptoType || !walletType) {
    console.warn('[AUTO_CONNECT] Missing crypto or wallet selection in global store');
    return;
  }

  console.log(`[AUTO_CONNECT] Auto-connecting to ${cryptoType} using ${walletType} wallet`);

  try {
    switch (cryptoType) {
      case 'solana':
        await selectWalletSolana(walletType);
        break;
      case 'aptos':
        await selectWalletAptos(walletType);
        break;
      case 'ethereum':
        await selectWalletEthereum(walletType);
        break;
      case 'bitcoin':
        await selectWalletBitcoin(walletType);
        break;
      case 'cardano':
        await selectWalletCardano(walletType);
        break;
      case 'sui':
        await selectWalletSui(walletType);
        break;
      default:
        console.error(`[AUTO_CONNECT] Unsupported crypto type: ${cryptoType}`);
    }
  } catch (error) {
    console.error(`[AUTO_CONNECT] Failed to auto-connect to ${cryptoType} ${walletType}:`, error);
  }
}

/**
 * Checks if there's a stored session token for the current blockchain selection
 * and attempts to restore the session
 */
export function checkExistingSession() {
  const store = useGlobalStore();
  const { crypto_selected } = storeToRefs(store);

  const cryptoType = crypto_selected.value;
  
  // Check for existing tokens in sessionStorage
  const tokenMap = {
    'ethereum': 'eth_token',
    'bitcoin': 'btc_token', 
    'solana': 'sol_token',
    'cardano': 'ada_token',
    'aptos': 'apt_token',
    'sui': 'sui_token'
  };

  const tokenKey = tokenMap[cryptoType];
  if (tokenKey && sessionStorage.getItem(tokenKey)) {
    console.log(`[AUTO_CONNECT] Found existing session for ${cryptoType}`);
    store.is_authenticated = true;
    return true;
  }

  return false;
}

/**
 * Auto-connect logic that runs on app initialization
 */
export async function initializeAutoConnect() {
  console.log('[AUTO_CONNECT] Initializing auto-connect...');
  
  // First check if there's an existing session
  if (checkExistingSession()) {
    return;
  }

  // If no existing session, attempt auto-connect
  await autoConnectWallet();
}
