// Dual Stacking Integration for sBTC Lending Pool
// ================================================
// Frontend JavaScript for interacting with Dual Stacking features

// Contract addresses (update these for your deployment)
const CONTRACTS = {
  sbtcLendingPool: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-lending-pool',
  sbtcToken: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token-mock',
  dualStacking: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.dual-stacking-mock',
  // Mainnet: 'SP1HFCRKEJ8BYW4D0E3FAWHFDX8A25PPAA83HWWZ9.dual-stacking-v2_0_2'
};

// Utility: Convert sBTC amount (human readable) to micro-sats (8 decimals)
function toMicroSats(sbtcAmount) {
  return BigInt(Math.floor(sbtcAmount * 100000000));
}

// Utility: Convert micro-sats to sBTC (human readable)
function fromMicroSats(microSats) {
  return Number(microSats) / 100000000;
}

// 1. Deposit sBTC into the lending pool
async function depositSBTC(amount) {
  const amountMicroSats = toMicroSats(amount);

  const txOptions = {
    contractAddress: CONTRACTS.sbtcLendingPool.split('.')[0],
    contractName: CONTRACTS.sbtcLendingPool.split('.')[1],
    functionName: 'deposit',
    functionArgs: [
      uintCV(amountMicroSats),
      contractPrincipalCV(
        CONTRACTS.sbtcToken.split('.')[0],
        CONTRACTS.sbtcToken.split('.')[1]
      )
    ],
    network: new StacksTestnet(), // or StacksMainnet()
    postConditions: [],
    onFinish: (data) => {
      console.log('Deposit transaction:', data.txId);
      showNotification(`Deposited ${amount} sBTC - TX: ${data.txId}`);
    },
    onCancel: () => {
      console.log('Transaction cancelled');
    }
  };

  await openContractCall(txOptions);
}

// 2. Withdraw sBTC from the lending pool
async function withdrawSBTC(amount) {
  const amountMicroSats = toMicroSats(amount);

  const txOptions = {
    contractAddress: CONTRACTS.sbtcLendingPool.split('.')[0],
    contractName: CONTRACTS.sbtcLendingPool.split('.')[1],
    functionName: 'withdraw',
    functionArgs: [
      uintCV(amountMicroSats),
      contractPrincipalCV(
        CONTRACTS.sbtcToken.split('.')[0],
        CONTRACTS.sbtcToken.split('.')[1]
      )
    ],
    network: new StacksTestnet(),
    postConditions: [],
    onFinish: (data) => {
      console.log('Withdrawal transaction:', data.txId);
      showNotification(`Withdrew ${amount} sBTC - TX: ${data.txId}`);
    }
  };

  await openContractCall(txOptions);
}

// 3. Enroll pool in Dual Stacking (admin only)
async function enrollInDualStacking() {
  const txOptions = {
    contractAddress: CONTRACTS.sbtcLendingPool.split('.')[0],
    contractName: CONTRACTS.sbtcLendingPool.split('.')[1],
    functionName: 'enroll-in-dual-stacking',
    functionArgs: [],
    network: new StacksTestnet(),
    postConditions: [],
    onFinish: (data) => {
      console.log('Dual Stacking enrollment:', data.txId);
      showNotification(`Pool enrolled in Dual Stacking! TX: ${data.txId}`);
      updateDualStackingStatus();
    }
  };

  await openContractCall(txOptions);
}

// 4. Claim Dual Stacking rewards (anyone can call)
async function claimDualStackingRewards() {
  const txOptions = {
    contractAddress: CONTRACTS.sbtcLendingPool.split('.')[0],
    contractName: CONTRACTS.sbtcLendingPool.split('.')[1],
    functionName: 'claim-dual-stacking-rewards',
    functionArgs: [],
    network: new StacksTestnet(),
    postConditions: [],
    onFinish: (data) => {
      console.log('Dual Stacking rewards claimed:', data.txId);
      showNotification(`Rewards claimed! TX: ${data.txId}`);
      updateDualStackingStatus();
    }
  };

  await openContractCall(txOptions);
}

// 5. Get Dual Stacking status (read-only)
async function getDualStackingStatus() {
  const network = new StacksTestnet();

  try {
    const result = await callReadOnlyFunction({
      contractAddress: CONTRACTS.sbtcLendingPool.split('.')[0],
      contractName: CONTRACTS.sbtcLendingPool.split('.')[1],
      functionName: 'get-dual-stacking-status',
      functionArgs: [],
      network,
      senderAddress: CONTRACTS.sbtcLendingPool.split('.')[0],
    });

    const status = cvToJSON(result);
    return {
      enrolled: status.value.enrolled.value,
      totalRewards: fromMicroSats(status.value['total-rewards'].value),
      poolBalance: fromMicroSats(status.value['pool-balance'].value),
      eligibleForEnrollment: status.value['eligible-for-enrollment'].value
    };
  } catch (error) {
    console.error('Error fetching Dual Stacking status:', error);
    return null;
  }
}

// 6. Get user deposit info (read-only)
async function getUserDeposit(userAddress) {
  const network = new StacksTestnet();

  try {
    const result = await callReadOnlyFunction({
      contractAddress: CONTRACTS.sbtcLendingPool.split('.')[0],
      contractName: CONTRACTS.sbtcLendingPool.split('.')[1],
      functionName: 'get-user-deposit',
      functionArgs: [principalCV(userAddress)],
      network,
      senderAddress: userAddress,
    });

    const deposit = cvToJSON(result);
    if (deposit.value && deposit.value.value) {
      return {
        amount: fromMicroSats(deposit.value.value.amount.value),
        shares: Number(deposit.value.value.shares.value),
        depositTime: Number(deposit.value.value['deposit-time'].value)
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching user deposit:', error);
    return null;
  }
}

// 7. Get loan status with Dual Stacking info (read-only)
async function getLoanStatus(userAddress) {
  const network = new StacksTestnet();

  try {
    const result = await callReadOnlyFunction({
      contractAddress: CONTRACTS.sbtcLendingPool.split('.')[0],
      contractName: CONTRACTS.sbtcLendingPool.split('.')[1],
      functionName: 'get-loan-status-ascii',
      functionArgs: [principalCV(userAddress)],
      network,
      senderAddress: userAddress,
    });

    const status = cvToJSON(result);
    if (status.value) {
      return {
        principal: status.value.principal.value,
        interest: status.value.interest.value,
        healthFactor: status.value['health-factor'].value,
        status: status.value.status.value,
        dualStackingEnrolled: status.value['dual-stacking-enrolled'].value
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching loan status:', error);
    return null;
  }
}

// UI Update Functions

// Update Dual Stacking status display
async function updateDualStackingStatus() {
  const status = await getDualStackingStatus();

  if (status) {
    const statusEl = document.getElementById('dual-stacking-status');
    if (statusEl) {
      statusEl.innerHTML = `
        <div class="dual-stacking-card">
          <h3>🚀 Dual Stacking Status</h3>
          <div class="status-grid">
            <div class="status-item">
              <span class="label">Enrollment:</span>
              <span class="value ${status.enrolled ? 'active' : 'inactive'}">
                ${status.enrolled ? '✓ Enrolled' : '✗ Not Enrolled'}
              </span>
            </div>
            <div class="status-item">
              <span class="label">Pool Balance:</span>
              <span class="value">${status.poolBalance.toFixed(8)} sBTC</span>
            </div>
            <div class="status-item">
              <span class="label">Total Rewards:</span>
              <span class="value">${status.totalRewards.toFixed(8)} sBTC</span>
            </div>
            <div class="status-item">
              <span class="label">Eligible:</span>
              <span class="value ${status.eligibleForEnrollment ? 'active' : 'inactive'}">
                ${status.eligibleForEnrollment ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
          ${!status.enrolled && status.eligibleForEnrollment ? `
            <button onclick="enrollInDualStacking()" class="btn-primary">
              Enable BTC Yield Boost
            </button>
          ` : ''}
          ${status.enrolled ? `
            <button onclick="claimDualStackingRewards()" class="btn-secondary">
              Claim Rewards
            </button>
            <div class="info-box">
              <p>💰 <strong>Base Yield:</strong> ~0.5% APY</p>
              <p>🚀 <strong>Boosted Yield:</strong> Up to ~5% APY (10× multiplier)</p>
              <p>📊 Rewards are paid in sBTC, redeemable 1:1 for BTC</p>
            </div>
          ` : ''}
        </div>
      `;
    }
  }
}

// Update user dashboard with Dual Stacking info
async function updateUserDashboard(userAddress) {
  const [deposit, loanStatus, dsStatus] = await Promise.all([
    getUserDeposit(userAddress),
    getLoanStatus(userAddress),
    getDualStackingStatus()
  ]);

  const dashboardEl = document.getElementById('user-dashboard');
  if (dashboardEl && deposit) {
    // Calculate estimated APY
    const baseAPY = 0.5;
    const boostedAPY = dsStatus?.enrolled ? 5.0 : baseAPY;
    const estimatedYield = (deposit.amount * boostedAPY) / 100;

    dashboardEl.innerHTML = `
      <div class="dashboard-card">
        <h3>Your sBTC Position</h3>
        <div class="stat-grid">
          <div class="stat">
            <span class="stat-label">Deposited:</span>
            <span class="stat-value">${deposit.amount.toFixed(8)} sBTC</span>
          </div>
          <div class="stat">
            <span class="stat-label">Shares:</span>
            <span class="stat-value">${deposit.shares}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Current APY:</span>
            <span class="stat-value apy-${dsStatus?.enrolled ? 'boosted' : 'base'}">
              ${boostedAPY}%
              ${dsStatus?.enrolled ? '<span class="boost-badge">BOOSTED</span>' : ''}
            </span>
          </div>
          <div class="stat">
            <span class="stat-label">Est. Annual Yield:</span>
            <span class="stat-value">${estimatedYield.toFixed(8)} sBTC</span>
          </div>
        </div>
      </div>
    `;
  }
}

// Notification helper
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('show');
  }, 10);

  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Dual Stacking integration loaded');

  // Update status every 30 seconds
  await updateDualStackingStatus();
  setInterval(updateDualStackingStatus, 30000);

  // If user is connected, update their dashboard
  const userSession = new UserSession();
  if (userSession.isUserSignedIn()) {
    const userData = userSession.loadUserData();
    const userAddress = userData.profile.stxAddress.testnet;
    await updateUserDashboard(userAddress);
    setInterval(() => updateUserDashboard(userAddress), 30000);
  }
});

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    depositSBTC,
    withdrawSBTC,
    enrollInDualStacking,
    claimDualStackingRewards,
    getDualStackingStatus,
    getUserDeposit,
    getLoanStatus,
    updateDualStackingStatus,
    updateUserDashboard
  };
}
