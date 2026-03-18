// Wallet Service for Stacks Connect Integration
import { connect, disconnect, isConnected, getLocalStorage } from '@stacks/connect';
import { StacksNetwork, STACKS_MAINNET, STACKS_TESTNET } from '@stacks/network';

// Get current network
export const getNetwork = (): StacksNetwork => {
  const networkEnv = process.env.NEXT_PUBLIC_NETWORK || 'testnet';
  return networkEnv === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET;
};

// Connect wallet
export const connectWallet = async (onFinish?: () => void) => {
  try {
    // Check if already connected
    if (isConnected()) {
      console.log('Already authenticated');
      if (onFinish) onFinish();
      return;
    }

    // Connect to wallet
    const response = await connect();
    console.log('Connected:', response.addresses);

    if (onFinish) onFinish();
  } catch (error) {
    console.error('Error connecting wallet:', error);
    throw error;
  }
};

// Disconnect wallet
export const disconnectWallet = () => {
  try {
    disconnect(); // Clears storage and wallet selection
    console.log('User disconnected');
  } catch (error) {
    console.error('Error disconnecting wallet:', error);
  }
};

// Check if wallet is connected
export const isWalletConnected = (): boolean => {
  return isConnected();
};

// Get user address
export const getUserAddress = (): string | null => {
  try {
    const userData = getLocalStorage();
    if (userData?.addresses?.stx && userData.addresses.stx.length > 0) {
      return userData.addresses.stx[0].address;
    }
    return null;
  } catch (error) {
    console.error('Error getting user address:', error);
    return null;
  }
};

// Get user data
export const getUserData = () => {
  try {
    return getLocalStorage();
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

// Fetch STX balance
export const fetchStxBalance = async (address: string): Promise<number> => {
  try {
    const network = getNetwork();
    const url = `${network.client.baseUrl}/v2/accounts/${address}`;

    const response = await fetch(url);
    const data = await response.json();

    // Convert microSTX to STX
    return parseInt(data.balance) / 1_000_000;
  } catch (error) {
    console.error('Error fetching STX balance:', error);
    return 0;
  }
};

// Fetch sBTC balance (assuming SIP-010 token)
export const fetchSbtcBalance = async (address: string): Promise<number> => {
  try {
    const network = getNetwork();
    const url = `${network.client.baseUrl}/extended/v1/address/${address}/balances`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();

    if (!data.fungible_tokens) {
      console.log('No fungible tokens found for address');
      return 0;
    }

    // Search for sBTC tokens by looking for common sBTC contract patterns
    // This is more flexible than hardcoding specific contract addresses
    let totalSbtcBalance = 0;
    
    // Common sBTC token patterns to search for
    const sbtcPatterns = [
      /\.sbtc::/i,           // Matches contracts ending with .sbtc::
      /sbtc-token::/i,       // Matches sbtc-token contracts
      /::sbtc$/i,            // Matches tokens ending with ::sbtc
      /::sBTC$/i,            // Matches tokens ending with ::sBTC
      /::sbtc-token$/i       // Matches tokens ending with ::sbtc-token
    ];

    // Check if user has explicitly set a specific sBTC contract
    const explicitContract = process.env.NEXT_PUBLIC_SBTC_CONTRACT;
    if (explicitContract) {
      // Try the explicit contract with different token name patterns
      const explicitPatterns = [
        `${explicitContract}::sbtc`,
        `${explicitContract}::sBTC`, 
        `${explicitContract}::sbtc-token`,
        explicitContract // In case the full path is provided
      ];
      
      for (const pattern of explicitPatterns) {
        const token = data.fungible_tokens[pattern];
        if (token) {
          console.log(`Found sBTC token: ${pattern}`, token);
          totalSbtcBalance += parseInt(token.balance);
        }
      }
    }

    // If no explicit contract found balance, search through all tokens
    if (totalSbtcBalance === 0) {
      Object.keys(data.fungible_tokens).forEach(tokenKey => {
        const isMatch = sbtcPatterns.some(pattern => pattern.test(tokenKey));
        if (isMatch) {
          const token = data.fungible_tokens[tokenKey];
          console.log(`Found sBTC token: ${tokenKey}`, token);
          totalSbtcBalance += parseInt(token.balance);
        }
      });
    }

    // Convert from smallest unit to BTC (assuming 8 decimal places like Bitcoin)
    return totalSbtcBalance / 100_000_000;
  } catch (error) {
    console.error('Error fetching sBTC balance:', error);
    return 0;
  }
};
