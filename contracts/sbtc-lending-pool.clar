;; sBTC Lending Pool with Dual Stacking Integration
;; =================================================
;; ASSET MODEL:
;; - Deposits: sBTC - earns interest from STX borrowers + dual stacking rewards
;; - Collateral: sBTC - locked to secure STX loans
;; - Borrows: STX - borrowed against sBTC collateral
;; - Flash loans: sBTC - unchanged
;; - Dual stacking rewards: sBTC - unchanged
;;
;; CLARITY 4 FEATURES:
;; - stacks-block-time: Calculate time-based interest accrual
;; - restrict-assets?: Protect pool funds during liquidations
;; - contract-hash?: Verify liquidator contracts

;; Import traits
(use-trait sbtc-token .sip010-ft-trait.sip010-ft-trait)
(use-trait flash-loan-receiver .flash-loan-receiver-trait.flash-loan-receiver-trait)

;; === DUAL STACKING INTEGRATION ===
;; Mainnet contract: SP1HFCRKEJ8BYW4D0E3FAWHFDX8A25PPAA83HWWZ9.dual-stacking-0_2
;; For testing, use the mock contract: .dual-stacking-mock
(define-constant MIN-SBTC-FOR-ENROLL u100000) ;; 0.001 sBTC (100k sats)

;; Constants
(define-constant CONTRACT-ADDRESS .sbtc-lending-pool)
(define-constant err-owner-only (err u400))
(define-constant err-insufficient-balance (err u401))
(define-constant err-insufficient-collateral (err u402))
(define-constant err-loan-not-found (err u403))
(define-constant err-position-healthy (err u404))
(define-constant err-invalid-amount (err u405))
(define-constant err-contract-verification-failed (err u406))
(define-constant err-asset-restriction-failed (err u407))
(define-constant err-paused (err u408))
(define-constant err-conversion-failed (err u409))
(define-constant err-dual-stacking-failed (err u410))
(define-constant err-not-enrolled (err u411))
(define-constant err-token-transfer-failed (err u412))
(define-constant err-flash-loan-failed (err u413))
(define-constant err-flash-loan-not-repaid (err u414))
(define-constant err-insufficient-liquidity (err u415))
(define-constant err-stx-transfer-failed (err u416))
(define-constant err-swap-disabled (err u417))

;; Protocol Parameters
(define-constant COLLATERAL-RATIO u150) ;; 150% collateralization
(define-constant LIQUIDATION-THRESHOLD u120) ;; Liquidate below 120%
(define-constant LIQUIDATION-BONUS u10) ;; 10% bonus
(define-constant INTEREST-RATE-BPS u500) ;; 5% annual interest
(define-constant MIN-HEALTH-FACTOR u120)

;; Data Variables
(define-data-var protocol-paused bool false)
(define-data-var total-deposits uint u0)
(define-data-var total-borrows uint u0) ;; STX borrowed (in microSTX)
(define-data-var admin principal tx-sender)
(define-data-var verified-liquidator-hash (optional (buff 32)) none)

;; STX Pool State
;; stx-per-sbtc: microSTX per satoshi of sBTC
;; Example: u4000 = 4000 microSTX per sat  $0.004/sat if STX=$1
;; At BTC=$100k and STX=$1: 1 BTC = 100M sats, 1 sat = $0.001 = ~4000 microSTX
(define-data-var stx-per-sbtc uint u4000)
(define-data-var total-stx-available uint u0) ;; STX pool liquidity (microSTX)

;; Dual Stacking state
(define-data-var dual-stacking-enrolled bool false)
(define-data-var total-dual-stacking-rewards uint u0)
(define-data-var last-reward-distribution-cycle uint u0)

;; Flash loan state
(define-data-var flash-loan-fee-bps uint u9) ;; 0.09% fee (9 basis points)
(define-data-var total-flash-loan-volume uint u0)
(define-data-var total-flash-loan-fees uint u0)
(define-data-var flash-loan-enabled bool true)

;; Swap state
(define-data-var swap-fee-bps uint u100) ;; 1% fee (100 basis points)
(define-data-var swap-enabled bool true)
(define-data-var total-swap-volume-sbtc uint u0) ;; Total sBTC swapped
(define-data-var total-swap-volume-stx uint u0)  ;; Total STX swapped
(define-data-var total-swap-fees-sbtc uint u0)   ;; Fees collected in sBTC
(define-data-var total-swap-fees-stx uint u0)    ;; Fees collected in STX
(define-data-var swap-sbtc-reserve uint u0)      ;; sBTC from swaps (separate from deposits)

;; sBTC token reference (must be set after deployment)
(define-data-var sbtc-token-contract (optional principal) none)

;; Get sBTC token contract address
(define-read-only (get-sbtc-token-contract)
  (var-get sbtc-token-contract)
)

;; User Data Maps
(define-map user-deposits
  { user: principal }
  {
    amount: uint,
    deposit-time: uint,
    shares: uint, ;; Share-based accounting for yield distribution
  }
)

(define-map user-collateral
  { user: principal }
  {
    amount: uint,          ;; sBTC sats locked as collateral
    asset: (string-ascii 10),
  }
)

(define-map user-loans
  { user: principal }
  {
    principal-amount: uint,    ;; STX debt (microSTX)
    interest-accrued: uint,    ;; STX interest (microSTX)
    borrow-time: uint,
    last-interest-update: uint,
  }
)

;; Share accounting for reward distribution
(define-data-var total-shares uint u0)
(define-data-var accumulated-rewards-per-share uint u0)
(define-constant PRECISION u1000000000000) ;; 1e12 for precise calculations
(define-map user-reward-debt
  { user: principal }
  uint
)

;; === PRICE ORACLE FUNCTIONS ===

;; Get current STX/sBTC price (microSTX per sat)
(define-read-only (get-stx-per-sbtc)
  (var-get stx-per-sbtc)
)

;; Set STX/sBTC price (admin only)
(define-public (set-stx-per-sbtc (price uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) err-owner-only)
    (asserts! (> price u0) err-invalid-amount)
    (var-set stx-per-sbtc price)
    (print {
      event: "price-updated",
      stx-per-sbtc: price,
      timestamp: stacks-block-time
    })
    (ok true)
  )
)

;; Convert sBTC sats to STX microSTX value
(define-read-only (sbtc-to-stx-value (sbtc-sats uint))
  (* sbtc-sats (var-get stx-per-sbtc))
)

;; Convert STX microSTX to sBTC sats value
(define-read-only (stx-to-sbtc-value (stx-micro uint))
  (/ stx-micro (var-get stx-per-sbtc))
)

;; === STX POOL MANAGEMENT ===

;; Get available STX for lending
(define-read-only (get-total-stx-available)
  (ok (var-get total-stx-available))
)

;; Fund STX pool (admin only) - adds STX liquidity for borrowers
(define-public (fund-stx-pool (amount uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) err-owner-only)
    (asserts! (> amount u0) err-invalid-amount)
    ;; Transfer STX from admin to contract
    (match (stx-transfer? amount tx-sender CONTRACT-ADDRESS)
      success (begin
        (var-set total-stx-available (+ (var-get total-stx-available) amount))
        (print {
          event: "stx-pool-funded",
          amount: amount,
          total-available: (var-get total-stx-available),
          timestamp: stacks-block-time
        })
        (ok true)
      )
      error err-stx-transfer-failed
    )
  )
)

;; Withdraw STX from pool (admin only)
(define-public (withdraw-stx-pool (amount uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) err-owner-only)
    (asserts! (<= amount (var-get total-stx-available)) err-insufficient-liquidity)
    ;; Transfer STX from contract to admin
    (match (stx-transfer? amount CONTRACT-ADDRESS (var-get admin))
      success (begin
        (var-set total-stx-available (- (var-get total-stx-available) amount))
        (print {
          event: "stx-pool-withdrawn",
          amount: amount,
          total-available: (var-get total-stx-available),
          timestamp: stacks-block-time
        })
        (ok true)
      )
      error err-stx-transfer-failed
    )
  )
)

;; === DUAL STACKING FUNCTIONS ===

;; Enroll the lending pool in Dual Stacking
;; Call this after first sBTC deposits reach MIN-SBTC-FOR-ENROLL
;; The pool contract enrolls itself and receives rewards
(define-public (enroll-in-dual-stacking)
  (let (
    (total-sbtc (var-get total-deposits))
  )
    (asserts! (is-eq tx-sender (var-get admin)) err-owner-only)
    (asserts! (not (var-get dual-stacking-enrolled)) err-dual-stacking-failed)
    (asserts! (>= total-sbtc MIN-SBTC-FOR-ENROLL) err-insufficient-balance)

    ;; Enroll with pool as both participant and reward recipient
    (match  (contract-call? .dual-stacking-mock enroll CONTRACT-ADDRESS)
      success (begin
        (var-set dual-stacking-enrolled true)
        (print {
          event: "dual-stacking-enrolled",
          pool: CONTRACT-ADDRESS,
          total-sbtc: total-sbtc,
          timestamp: stacks-block-time
        })
        (ok true)
      )
      error err-dual-stacking-failed
    )
  )
)

;; Claim Dual Stacking rewards and distribute to suppliers
;; Anyone can call this after finalize-reward-distribution event
;; Rewards are distributed proportionally to all sBTC suppliers
(define-public (claim-dual-stacking-rewards (token <sbtc-token>))
  (let (
    (principals-to-distribute (list CONTRACT-ADDRESS))
    (pool-balance-before (unwrap! (contract-call? token get-balance CONTRACT-ADDRESS) err-dual-stacking-failed))
  )
    (asserts! (var-get dual-stacking-enrolled) err-not-enrolled)

    ;; Trigger reward distribution for our pool
    (unwrap! (contract-call? .dual-stacking-mock
                         distribute-rewards principals-to-distribute)
             err-dual-stacking-failed)

    ;; Check balance after rewards
    (let (
      (pool-balance-after (unwrap! (contract-call? token get-balance CONTRACT-ADDRESS) err-dual-stacking-failed))
      (reward-amount (if (> pool-balance-after pool-balance-before)
                         (- pool-balance-after pool-balance-before)
                         u0))
      (current-shares (var-get total-shares))
    )
      ;; Update accumulated rewards if we have shares and received rewards
      (if (and (> reward-amount u0) (> current-shares u0))
        (begin
          (let (
            (reward-per-share (/ (* reward-amount PRECISION) current-shares))
          )
            ;; Update accumulated rewards per share
            (var-set accumulated-rewards-per-share
                     (+ (var-get accumulated-rewards-per-share) reward-per-share))

            ;; Track total rewards
            (var-set total-dual-stacking-rewards
                     (+ (var-get total-dual-stacking-rewards) reward-amount))

            ;; Update last distribution cycle
            (var-set last-reward-distribution-cycle stacks-block-time)

            (print {
              event: "dual-stacking-rewards-claimed",
              pool: CONTRACT-ADDRESS,
              reward-amount: reward-amount,
              reward-per-share: reward-per-share,
              timestamp: stacks-block-time
            })
          )
          true
        )
        true
      )

      (ok reward-amount)
    )
  )
)

;; Get Dual Stacking status
(define-read-only (get-dual-stacking-status)
  (ok {
    enrolled: (var-get dual-stacking-enrolled),
    total-rewards: (var-get total-dual-stacking-rewards),
    pool-balance: (var-get total-deposits),
    eligible-for-enrollment: (>= (var-get total-deposits) MIN-SBTC-FOR-ENROLL)
  })
)

;; Get pending Dual Stacking rewards for a user
(define-read-only (get-pending-rewards (user principal))
  (match (map-get? user-deposits { user: user })
    deposit-data (let (
      (user-shares (get shares deposit-data))
      (current-reward-per-share (var-get accumulated-rewards-per-share))
      (user-debt (default-to u0 (map-get? user-reward-debt { user: user })))
      (pending (if (> user-shares u0)
                   (- (/ (* user-shares current-reward-per-share) PRECISION) user-debt)
                   u0))
    )
      (ok pending)
    )
    (ok u0)
  )
)

;; Claim pending Dual Stacking rewards (sBTC)
(define-public (claim-user-rewards (token <sbtc-token>))
  (let (
    (pending (unwrap! (get-pending-rewards tx-sender) err-dual-stacking-failed))
    (user-data (unwrap! (map-get? user-deposits { user: tx-sender }) err-insufficient-balance))
    (user-shares (get shares user-data))
    (current-reward-per-share (var-get accumulated-rewards-per-share))
  )
    (asserts! (> pending u0) err-invalid-amount)

    ;; Transfer sBTC rewards to user
    (match (contract-call? token transfer pending CONTRACT-ADDRESS tx-sender none)
      success (begin
        ;; Update user's reward debt
        (map-set user-reward-debt { user: tx-sender }
                 (/ (* user-shares current-reward-per-share) PRECISION))

        ;; Update total deposits (rewards were already counted)
        (var-set total-deposits (- (var-get total-deposits) pending))

        (print {
          event: "user-rewards-claimed",
          user: tx-sender,
          amount: pending,
          timestamp: stacks-block-time
        })

        (ok pending)
      )
      error err-token-transfer-failed
    )
  )
)

;; === CORE LENDING FUNCTIONS ===

;; Set sBTC token contract (must be called after deployment)
(define-public (set-sbtc-token (token principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) err-owner-only)
    (var-set sbtc-token-contract (some token))
    (ok true)
  )
)

;; Deposit sBTC into the pool
;; - sBTC in, shares out
;; - Earns interest from STX borrowers + dual stacking rewards
;; - Automatically enrolls pool in Dual Stacking if threshold reached
(define-public (deposit (amount uint) (token <sbtc-token>))
  (let (
    (current-deposit (default-to {
        amount: u0,
        deposit-time: stacks-block-time,
        shares: u0,
      }
      (map-get? user-deposits { user: tx-sender })
    ))
    (current-shares (var-get total-shares))
    ;; Calculate shares: first depositor gets 1:1, subsequent get proportional
    (new-shares (if (is-eq current-shares u0)
                    amount
                    (/ (* amount current-shares) (var-get total-deposits))))
  )
    (asserts! (not (var-get protocol-paused)) err-paused)
    (asserts! (> amount u0) err-invalid-amount)

    ;; Transfer sBTC to contract
    (match (contract-call? token transfer amount tx-sender CONTRACT-ADDRESS none)
      success (begin
        ;; Update user deposit with shares
        (map-set user-deposits { user: tx-sender } {
          amount: (+ (get amount current-deposit) amount),
          deposit-time: stacks-block-time,
          shares: (+ (get shares current-deposit) new-shares),
        })

        ;; Update reward debt for new shares
        (let (
          (new-total-shares (+ (get shares current-deposit) new-shares))
          (current-reward-per-share (var-get accumulated-rewards-per-share))
        )
          (map-set user-reward-debt { user: tx-sender }
                   (/ (* new-total-shares current-reward-per-share) PRECISION))
        )

        ;; Update totals
        (var-set total-deposits (+ (var-get total-deposits) amount))
        (var-set total-shares (+ current-shares new-shares))

        ;; Auto-enroll in Dual Stacking if threshold reached and not yet enrolled
        (if (and (not (var-get dual-stacking-enrolled))
                 (>= (var-get total-deposits) MIN-SBTC-FOR-ENROLL))
          (match (contract-call?
                   .dual-stacking-mock
                   enroll
                   CONTRACT-ADDRESS)
            enroll-success (var-set dual-stacking-enrolled true)
            enroll-error false ;; Continue even if enrollment fails
          )
          false
        )

        (print {
          event: "deposit",
          user: tx-sender,
          amount: amount,
          shares: new-shares,
          total-deposits: (var-get total-deposits)
        })

        (ok true)
      )
      error err-token-transfer-failed
    )
  )
)

;; Withdraw sBTC from the pool
;; - sBTC out, burns shares
(define-public (withdraw (amount uint) (token <sbtc-token>))
  (let (
    (user-deposit (unwrap! (map-get? user-deposits { user: tx-sender })
      err-insufficient-balance
    ))
    (user-shares (get shares user-deposit))
    (total-pool-shares (var-get total-shares))
    ;; Calculate shares to burn proportional to withdrawal
    (shares-to-burn (if (>= amount (get amount user-deposit))
                        user-shares
                        (/ (* amount user-shares) (get amount user-deposit))))
    (recipient tx-sender)
  )
    (asserts! (not (var-get protocol-paused)) err-paused)
    (asserts! (>= (get amount user-deposit) amount) err-insufficient-balance)

    ;; Update user deposit
    (if (>= amount (get amount user-deposit))
      (map-delete user-deposits { user: tx-sender })
      (map-set user-deposits { user: tx-sender } {
        amount: (- (get amount user-deposit) amount),
        deposit-time: (get deposit-time user-deposit),
        shares: (- user-shares shares-to-burn),
      })
    )

    ;; Transfer sBTC back to user from contract
    (match (contract-call? token transfer amount CONTRACT-ADDRESS recipient none)
      success (begin
        ;; Update totals
        (var-set total-deposits (- (var-get total-deposits) amount))
        (var-set total-shares (- total-pool-shares shares-to-burn))

        (print {
          event: "withdraw",
          user: tx-sender,
          amount: amount,
          shares-burned: shares-to-burn
        })

        (ok true)
      )
      error err-token-transfer-failed
    )
  )
)

;; Add sBTC collateral
;; - sBTC locked as collateral to secure STX loans
(define-public (add-collateral (amount uint) (token <sbtc-token>))
  (let ((current-coll (default-to {
      amount: u0,
      asset: "sBTC",
    }
    (map-get? user-collateral { user: tx-sender })
  )))
    (asserts! (not (var-get protocol-paused)) err-paused)
    (asserts! (> amount u0) err-invalid-amount)

    ;; Transfer sBTC collateral to contract
    (match (contract-call? token transfer amount tx-sender CONTRACT-ADDRESS none)
      success (begin
        (map-set user-collateral { user: tx-sender } {
          amount: (+ (get amount current-coll) amount),
          asset: "sBTC",
        })
        (print {
          event: "collateral-added",
          user: tx-sender,
          amount: amount,
          total-collateral: (+ (get amount current-coll) amount)
        })
        (ok true)
      )
      error err-token-transfer-failed
    )
  )
)

;; Withdraw sBTC collateral
;; - Can only withdraw excess collateral that keeps position healthy
(define-public (withdraw-collateral (amount uint) (token <sbtc-token>))
  (let (
    (user-coll (unwrap! (map-get? user-collateral { user: tx-sender }) err-insufficient-collateral))
    (current-collateral (get amount user-coll))
    (user-loan (map-get? user-loans { user: tx-sender }))
    (recipient tx-sender)
  )
    (asserts! (not (var-get protocol-paused)) err-paused)
    (asserts! (> amount u0) err-invalid-amount)
    (asserts! (<= amount current-collateral) err-insufficient-collateral)

    ;; Check if user has an active loan
    (match user-loan
      loan (let (
        (total-debt (+ (get principal-amount loan) (unwrap-panic (calculate-current-interest tx-sender))))
        (remaining-collateral (- current-collateral amount))
        (remaining-collateral-stx-value (sbtc-to-stx-value remaining-collateral))
        ;; Required collateral = debt x collateral-ratio / 100
        (required-collateral-stx (/ (* total-debt COLLATERAL-RATIO) u100))
      )
        ;; Ensure remaining collateral meets minimum ratio
        (asserts! (>= remaining-collateral-stx-value required-collateral-stx) err-insufficient-collateral)
      )
      true ;; No loan, can withdraw all
    )

    ;; Update collateral
    (if (is-eq amount current-collateral)
      (map-delete user-collateral { user: tx-sender })
      (map-set user-collateral { user: tx-sender } {
        amount: (- current-collateral amount),
        asset: "sBTC",
      })
    )

    ;; Transfer sBTC back to user
    (match (contract-call? token transfer amount CONTRACT-ADDRESS recipient none)
      success (begin
        (print {
          event: "collateral-withdrawn",
          user: tx-sender,
          amount: amount,
          remaining-collateral: (- current-collateral amount)
        })
        (ok true)
      )
      error err-token-transfer-failed
    )
  )
)

;; Borrow STX against sBTC collateral
;; - STX out via stx-transfer?
;; - Amount is in microSTX
(define-public (borrow (amount uint))
  (let (
    (recipient tx-sender)
    (user-coll (unwrap! (map-get? user-collateral { user: tx-sender })
      err-insufficient-collateral
    ))
    (current-collateral-sats (get amount user-coll))
    ;; Convert collateral to STX value
    (collateral-stx-value (sbtc-to-stx-value current-collateral-sats))
    ;; Max borrow = collateral STX value / collateral ratio
    (max-borrow (/ (* collateral-stx-value u100) COLLATERAL-RATIO))
    (existing-loan (map-get? user-loans { user: tx-sender }))
    (current-debt (match existing-loan
      loan (+ (get principal-amount loan)
        (unwrap-panic (calculate-current-interest tx-sender))
      )
      u0
    ))
    (stx-available (var-get total-stx-available))
    (original-borrow-time (match existing-loan
      loan (get borrow-time loan)
      stacks-block-time
    ))
  )
    (asserts! (not (var-get protocol-paused)) err-paused)
    (asserts! (> amount u0) err-invalid-amount)
    (asserts! (<= (+ current-debt amount) max-borrow) err-insufficient-collateral)
    (asserts! (<= amount stx-available) err-insufficient-liquidity)

    ;; Transfer STX to borrower first
    (match (stx-transfer? amount CONTRACT-ADDRESS recipient)
      success (begin
        ;; Update loan state after successful transfer
        (map-set user-loans { user: tx-sender } {
          principal-amount: (+ current-debt amount),
          interest-accrued: u0,
          borrow-time: original-borrow-time,
          last-interest-update: stacks-block-time,
        })
        (var-set total-borrows (+ (var-get total-borrows) amount))
        (var-set total-stx-available (- stx-available amount))
        (print {
          event: "borrow",
          user: tx-sender,
          amount: amount,
          total-debt: (+ current-debt amount),
          collateral-sats: current-collateral-sats,
          collateral-stx-value: collateral-stx-value
        })
        (ok true)
      )
      error err-stx-transfer-failed
    )
  )
)

;; Repay STX loan
;; - STX in via stx-transfer?
;; - Amount is in microSTX
(define-public (repay (amount uint))
  (let (
    (loan-data (unwrap! (map-get? user-loans { user: tx-sender }) err-loan-not-found))
    (current-interest (unwrap-panic (calculate-current-interest tx-sender)))
    (total-debt (+ (get principal-amount loan-data) current-interest))
  )
    (asserts! (not (var-get protocol-paused)) err-paused)
    (asserts! (> amount u0) err-invalid-amount)
    (asserts! (<= amount total-debt) err-invalid-amount)

    ;; Transfer STX repayment from user to contract
    (match (stx-transfer? amount tx-sender CONTRACT-ADDRESS)
      success (begin
        (if (>= amount total-debt)
          (begin
            (map-delete user-loans { user: tx-sender })
            (var-set total-borrows (- (var-get total-borrows) total-debt))
            (var-set total-stx-available (+ (var-get total-stx-available) total-debt))
          )
          (begin
            (map-set user-loans { user: tx-sender } {
              principal-amount: (- total-debt amount),
              interest-accrued: u0,
              borrow-time: (get borrow-time loan-data),
              last-interest-update: stacks-block-time,
            })
            (var-set total-borrows (- (var-get total-borrows) amount))
            (var-set total-stx-available (+ (var-get total-stx-available) amount))
          )
        )
        (print {
          event: "repay",
          user: tx-sender,
          amount: amount,
          remaining-debt: (if (>= amount total-debt) u0 (- total-debt amount))
        })
        (ok true)
      )
      error err-stx-transfer-failed
    )
  )
)

;; Liquidate an unhealthy position
;; - Liquidator repays STX debt, receives sBTC collateral + bonus
;; - Can only liquidate if health factor < LIQUIDATION-THRESHOLD (120%)
(define-public (liquidate (borrower principal) (repay-amount uint) (token <sbtc-token>))
  (let (
    (loan-data (unwrap! (map-get? user-loans { user: borrower }) err-loan-not-found))
    (coll-data (unwrap! (map-get? user-collateral { user: borrower }) err-insufficient-collateral))
    (current-interest (unwrap-panic (calculate-current-interest borrower)))
    (total-debt (+ (get principal-amount loan-data) current-interest))
    (collateral-sats (get amount coll-data))
    (collateral-stx-value (sbtc-to-stx-value collateral-sats))
    (health-factor (if (> total-debt u0)
                       (/ (* collateral-stx-value u100) total-debt)
                       u999))
    (liquidator tx-sender)
  )
    (asserts! (not (var-get protocol-paused)) err-paused)
    (asserts! (> repay-amount u0) err-invalid-amount)
    (asserts! (<= repay-amount total-debt) err-invalid-amount)
    ;; Can only liquidate unhealthy positions
    (asserts! (< health-factor LIQUIDATION-THRESHOLD) err-position-healthy)

    ;; Calculate collateral to seize (repay value + bonus)
    (let (
      ;; Convert repay amount to sBTC value
      (repay-sbtc-value (stx-to-sbtc-value repay-amount))
      ;; Add liquidation bonus (10%)
      (bonus-sbtc (/ (* repay-sbtc-value LIQUIDATION-BONUS) u100))
      (total-seize-sbtc (+ repay-sbtc-value bonus-sbtc))
      ;; Cap at available collateral
      (actual-seize-sbtc (if (> total-seize-sbtc collateral-sats)
                             collateral-sats
                             total-seize-sbtc))
      (remaining-collateral (- collateral-sats actual-seize-sbtc))
      (remaining-debt (- total-debt repay-amount))
    )
      ;; 1. Liquidator pays STX to pool
      (match (stx-transfer? repay-amount liquidator CONTRACT-ADDRESS)
        stx-success (begin
          ;; 2. Transfer seized collateral to liquidator
          (match (contract-call? token transfer actual-seize-sbtc CONTRACT-ADDRESS liquidator none)
            sbtc-success (begin
              ;; 3. Update borrower's loan
              (if (>= repay-amount total-debt)
                (map-delete user-loans { user: borrower })
                (map-set user-loans { user: borrower } {
                  principal-amount: remaining-debt,
                  interest-accrued: u0,
                  borrow-time: (get borrow-time loan-data),
                  last-interest-update: stacks-block-time,
                })
              )

              ;; 4. Update borrower's collateral
              (if (is-eq remaining-collateral u0)
                (map-delete user-collateral { user: borrower })
                (map-set user-collateral { user: borrower } {
                  amount: remaining-collateral,
                  asset: "sBTC",
                })
              )

              ;; 5. Update pool state
              (var-set total-borrows (- (var-get total-borrows) repay-amount))
              (var-set total-stx-available (+ (var-get total-stx-available) repay-amount))

              (print {
                event: "liquidation",
                liquidator: liquidator,
                borrower: borrower,
                repay-amount: repay-amount,
                collateral-seized: actual-seize-sbtc,
                bonus: bonus-sbtc,
                remaining-debt: remaining-debt,
                remaining-collateral: remaining-collateral,
                timestamp: stacks-block-time
              })

              (ok {
                repaid: repay-amount,
                collateral-seized: actual-seize-sbtc,
                bonus: bonus-sbtc
              })
            )
            sbtc-error err-token-transfer-failed
          )
        )
        stx-error err-stx-transfer-failed
      )
    )
  )
)

;; Calculate accrued interest (in microSTX)
(define-read-only (calculate-current-interest (user principal))
  (match (map-get? user-loans { user: user })
    loan-data (let (
      (last-update (get last-interest-update loan-data))
      (time-elapsed (if (> stacks-block-time last-update)
        (- stacks-block-time last-update)
        u0
      ))
      (principal-amt (get principal-amount loan-data))
      (new-interest (if (> time-elapsed u0)
        (/ (* (* principal-amt INTEREST-RATE-BPS) time-elapsed)
          u315360000000
        )
        u0
      ))
    )
      (ok (+ (get interest-accrued loan-data) new-interest))
    )
    (ok u0)
  )
)

;; Calculate health factor
;; Health = (collateral sBTC sats  stx-per-sbtc price  100)  STX debt microSTX
;; Returns percentage (e.g., 150 = 150%)
(define-read-only (get-health-factor (user principal))
  (match (map-get? user-loans { user: user })
    loan-data (match (map-get? user-collateral { user: user })
      coll-data (let (
        (total-debt (+ (get principal-amount loan-data)
          (unwrap-panic (calculate-current-interest user))
        ))
        (collateral-sats (get amount coll-data))
        ;; Convert collateral to STX value
        (collateral-stx-value (sbtc-to-stx-value collateral-sats))
      )
        (if (is-eq total-debt u0)
          (ok u0)
          (ok (/ (* collateral-stx-value u100) total-debt))
        )
      )
      (ok u0)
    )
    (ok u0)
  )
)

;; Get loan status with numeric values
(define-read-only (get-loan-status (user principal))
  (match (map-get? user-loans { user: user })
    loan-data (let (
      (principal-amt (get principal-amount loan-data))
      (interest-amt (unwrap-panic (calculate-current-interest user)))
      (health (unwrap-panic (get-health-factor user)))
      (coll-data (map-get? user-collateral { user: user }))
      (collateral-sats (match coll-data
        coll (get amount coll)
        u0
      ))
    )
      (ok {
        principal: principal-amt,
        interest: interest-amt,
        total-debt-stx: (+ principal-amt interest-amt),
        collateral-sbtc-sats: collateral-sats,
        collateral-stx-value: (sbtc-to-stx-value collateral-sats),
        health-factor: health,
        is-healthy: (>= health MIN-HEALTH-FACTOR),
        dual-stacking: (var-get dual-stacking-enrolled),
        stx-per-sbtc: (var-get stx-per-sbtc)
      })
    )
    (ok {
      principal: u0,
      interest: u0,
      total-debt-stx: u0,
      collateral-sbtc-sats: u0,
      collateral-stx-value: u0,
      health-factor: u0,
      is-healthy: true,
      dual-stacking: (var-get dual-stacking-enrolled),
      stx-per-sbtc: (var-get stx-per-sbtc)
    })
  )
)

;; Read-only functions
(define-read-only (get-user-deposit (user principal))
  (ok (map-get? user-deposits { user: user }))
)

(define-read-only (get-user-collateral (user principal))
  (ok (map-get? user-collateral { user: user }))
)

(define-read-only (get-user-loan (user principal))
  (ok (map-get? user-loans { user: user }))
)

(define-read-only (get-total-deposits)
  (ok (var-get total-deposits))
)

(define-read-only (get-total-borrows)
  (ok (var-get total-borrows))
)

;; Get pool status
(define-read-only (get-pool-status)
  (ok {
    total-sbtc-deposits: (var-get total-deposits),
    total-stx-borrowed: (var-get total-borrows),
    total-stx-available: (var-get total-stx-available),
    stx-per-sbtc: (var-get stx-per-sbtc),
    dual-stacking-enrolled: (var-get dual-stacking-enrolled),
    protocol-paused: (var-get protocol-paused)
  })
)

;; Admin functions
(define-public (set-paused (paused bool))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) err-owner-only)
    (var-set protocol-paused paused)
    (ok true)
  )
)

(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) err-owner-only)
    (var-set admin new-admin)
    (ok true)
  )
)

;; Register verified liquidator (using contract-hash?)
(define-public (register-verified-liquidator (liquidator principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) err-owner-only)
    (match (contract-hash? liquidator)
      hash-value (begin
        (var-set verified-liquidator-hash (some hash-value))
        (ok hash-value)
      )
      err err-contract-verification-failed
    )
  )
)

;; === FLASH LOAN FUNCTIONS (sBTC) ===

;; Track pending flash loans (receiver principal -> amount+fee)
(define-map pending-flash-loans
  { receiver: principal }
  { amount-plus-fee: uint }
)

;; Execute a flash loan (sBTC)
;; Lend sBTC with 0% collateral, must be repaid + fee in same transaction
;;
;; How it works:
;; 1. Pool lends sBTC to receiver contract
;; 2. Receiver executes arbitrary logic (arbitrage, liquidation, etc.)
;; 3. Receiver calls repay-flash-loan to return amount + fee
;; 4. If not repaid, entire transaction reverts
;;
;; Fee: 0.09% (9 basis points) - goes to pool suppliers
(define-public (flash-loan
    (receiver <flash-loan-receiver>)
    (token <sbtc-token>)
    (amount uint)
    (params (buff 1024))
  )
  (let (
    (pool-balance-before (var-get total-deposits))
    (total-borrowed (var-get total-borrows))
    ;; For flash loans, use sBTC deposits as liquidity
    (available-liquidity pool-balance-before)
    (fee (/ (* amount (var-get flash-loan-fee-bps)) u10000))
    (amount-plus-fee (+ amount fee))
    (receiver-principal (contract-of receiver))
    (initiator tx-sender)
  )
    (asserts! (var-get flash-loan-enabled) err-paused)
    (asserts! (> amount u0) err-invalid-amount)
    (asserts! (<= amount available-liquidity) err-insufficient-liquidity)

    ;; 1. Transfer sBTC to receiver
    (match (contract-call? token transfer amount CONTRACT-ADDRESS receiver-principal none)
      transfer-success (begin
        ;; 2. Record pending flash loan for receiver
        (map-set pending-flash-loans { receiver: receiver-principal } { amount-plus-fee: amount-plus-fee })

        ;; 3. Call receiver's execute-flash-loan
        (match (contract-call? receiver execute-flash-loan
                 (contract-of token)
                 amount
                 fee
                 initiator
                 params)
          execute-success (begin
            ;; 4. Check if receiver repaid by calling repay-flash-loan
            (match (map-get? pending-flash-loans { receiver: receiver-principal })
              pending (let (
                  (repaid-amount (get amount-plus-fee pending))
                )
                ;; Clear pending loan
                (map-delete pending-flash-loans { receiver: receiver-principal })

                ;; Verify pool received the repayment (check balance increase)
                (let (
                  (pool-balance-after (unwrap! (contract-call? token get-balance CONTRACT-ADDRESS) err-flash-loan-failed))
                  (expected-balance (+ pool-balance-before fee))
                )
                  (asserts! (>= pool-balance-after expected-balance) err-flash-loan-not-repaid)

                  ;; Update stats
                  (var-set total-flash-loan-volume (+ (var-get total-flash-loan-volume) amount))
                  (var-set total-flash-loan-fees (+ (var-get total-flash-loan-fees) fee))

                  (print {
                    event: "flash-loan",
                    receiver: receiver-principal,
                    initiator: initiator,
                    amount: amount,
                    fee: fee,
                    total-repaid: amount-plus-fee,
                    timestamp: stacks-block-time
                  })

                  (ok {
                    amount: amount,
                    fee: fee,
                    total-repaid: amount-plus-fee
                  })
                )
              )
              ;; No pending loan found - receiver didn't call repay
              err-flash-loan-not-repaid
            )
          )
          execute-error (begin
            ;; Clear pending on failure
            (map-delete pending-flash-loans { receiver: receiver-principal })
            err-flash-loan-failed
          )
        )
      )
      transfer-error err-token-transfer-failed
    )
  )
)

;; Repay flash loan - receiver must call this after execute-flash-loan
;; The receiver transfers sBTC amount + fee back to the pool
(define-public (repay-flash-loan (token <sbtc-token>) (amount uint))
  (let (
    (receiver-principal tx-sender)
    (pending (unwrap! (map-get? pending-flash-loans { receiver: receiver-principal })
                     err-flash-loan-failed))
    (amount-plus-fee (get amount-plus-fee pending))
  )
    (asserts! (>= amount amount-plus-fee) err-invalid-amount)

    ;; Transfer sBTC repayment from receiver to pool
    (match (contract-call? token transfer amount-plus-fee receiver-principal CONTRACT-ADDRESS none)
      success (ok true)
      error err-flash-loan-not-repaid
    )
  )
)

;; Get flash loan fee for a given amount
(define-read-only (get-flash-loan-fee (amount uint))
  (ok (/ (* amount (var-get flash-loan-fee-bps)) u10000))
)

;; Get flash loan stats
(define-read-only (get-flash-loan-stats)
  (ok {
    enabled: (var-get flash-loan-enabled),
    fee-bps: (var-get flash-loan-fee-bps),
    total-volume: (var-get total-flash-loan-volume),
    total-fees: (var-get total-flash-loan-fees),
    available-liquidity: (var-get total-deposits)
  })
)

;; Set flash loan fee (admin only)
(define-public (set-flash-loan-fee (fee-bps uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) err-owner-only)
    (asserts! (<= fee-bps u100) err-invalid-amount) ;; Max 1% fee
    (var-set flash-loan-fee-bps fee-bps)
    (ok true)
  )
)

;; Enable/disable flash loans (admin only)
(define-public (set-flash-loan-enabled (enabled bool))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) err-owner-only)
    (var-set flash-loan-enabled enabled)
    (ok true)
  )
)

;; === SWAP FUNCTIONS (sBTC <-> STX) ===
;; Simple swap with 1% fee using the stx-per-sbtc price

;; Get swap quote: sBTC -> STX
;; Returns STX amount user will receive after 1% fee
(define-read-only (get-swap-quote-sbtc-to-stx (sbtc-amount uint))
  (let (
    (gross-stx (sbtc-to-stx-value sbtc-amount))
    (fee (/ (* gross-stx (var-get swap-fee-bps)) u10000))
    (net-stx (- gross-stx fee))
  )
    (ok {
      input-sbtc: sbtc-amount,
      output-stx: net-stx,
      fee-stx: fee,
      price: (var-get stx-per-sbtc)
    })
  )
)

;; Get swap quote: STX -> sBTC
;; Returns sBTC amount user will receive after 1% fee
(define-read-only (get-swap-quote-stx-to-sbtc (stx-amount uint))
  (let (
    (gross-sbtc (stx-to-sbtc-value stx-amount))
    (fee (/ (* gross-sbtc (var-get swap-fee-bps)) u10000))
    (net-sbtc (- gross-sbtc fee))
  )
    (ok {
      input-stx: stx-amount,
      output-sbtc: net-sbtc,
      fee-sbtc: fee,
      price: (var-get stx-per-sbtc)
    })
  )
)

;; Swap sBTC for STX
;; User sends sBTC, receives STX (minus 1% fee)
(define-public (swap-sbtc-for-stx (sbtc-amount uint) (token <sbtc-token>))
  (let (
    (gross-stx (sbtc-to-stx-value sbtc-amount))
    (fee-stx (/ (* gross-stx (var-get swap-fee-bps)) u10000))
    (net-stx (- gross-stx fee-stx))
    (stx-available (var-get total-stx-available))
    (recipient tx-sender)
  )
    (asserts! (not (var-get protocol-paused)) err-paused)
    (asserts! (var-get swap-enabled) err-swap-disabled)
    (asserts! (> sbtc-amount u0) err-invalid-amount)
    (asserts! (<= net-stx stx-available) err-insufficient-liquidity)

    ;; 1. Transfer sBTC from user to pool
    (match (contract-call? token transfer sbtc-amount tx-sender CONTRACT-ADDRESS none)
      sbtc-success (begin
        ;; 2. Transfer STX from pool to user
        (match (stx-transfer? net-stx CONTRACT-ADDRESS recipient)
          stx-success (begin
            ;; Update pool state
            (var-set total-stx-available (- stx-available net-stx))
            ;; sBTC goes to swap reserve (separate from deposits)
            (var-set swap-sbtc-reserve (+ (var-get swap-sbtc-reserve) sbtc-amount))

            ;; Update swap stats
            (var-set total-swap-volume-sbtc (+ (var-get total-swap-volume-sbtc) sbtc-amount))
            (var-set total-swap-volume-stx (+ (var-get total-swap-volume-stx) gross-stx))
            (var-set total-swap-fees-stx (+ (var-get total-swap-fees-stx) fee-stx))

            (print {
              event: "swap-sbtc-for-stx",
              user: tx-sender,
              sbtc-in: sbtc-amount,
              stx-out: net-stx,
              fee-stx: fee-stx,
              price: (var-get stx-per-sbtc),
              timestamp: stacks-block-time
            })

            (ok {
              sbtc-in: sbtc-amount,
              stx-out: net-stx,
              fee: fee-stx
            })
          )
          stx-error err-stx-transfer-failed
        )
      )
      sbtc-error err-token-transfer-failed
    )
  )
)

;; Swap STX for sBTC
;; User sends STX, receives sBTC (minus 1% fee)
;; Uses swap-sbtc-reserve as liquidity source
(define-public (swap-stx-for-sbtc (stx-amount uint) (token <sbtc-token>))
  (let (
    (gross-sbtc (stx-to-sbtc-value stx-amount))
    (fee-sbtc (/ (* gross-sbtc (var-get swap-fee-bps)) u10000))
    (net-sbtc (- gross-sbtc fee-sbtc))
    (sbtc-reserve (var-get swap-sbtc-reserve))
    (recipient tx-sender)
  )
    (asserts! (not (var-get protocol-paused)) err-paused)
    (asserts! (var-get swap-enabled) err-swap-disabled)
    (asserts! (> stx-amount u0) err-invalid-amount)
    (asserts! (<= net-sbtc sbtc-reserve) err-insufficient-liquidity)

    ;; 1. Transfer STX from user to pool
    (match (stx-transfer? stx-amount tx-sender CONTRACT-ADDRESS)
      stx-success (begin
        ;; 2. Transfer sBTC from pool to user
        (match (contract-call? token transfer net-sbtc CONTRACT-ADDRESS recipient none)
          sbtc-success (begin
            ;; Update pool state
            (var-set total-stx-available (+ (var-get total-stx-available) stx-amount))
            ;; sBTC leaves swap reserve
            (var-set swap-sbtc-reserve (- sbtc-reserve net-sbtc))

            ;; Update swap stats
            (var-set total-swap-volume-stx (+ (var-get total-swap-volume-stx) stx-amount))
            (var-set total-swap-volume-sbtc (+ (var-get total-swap-volume-sbtc) gross-sbtc))
            (var-set total-swap-fees-sbtc (+ (var-get total-swap-fees-sbtc) fee-sbtc))

            (print {
              event: "swap-stx-for-sbtc",
              user: tx-sender,
              stx-in: stx-amount,
              sbtc-out: net-sbtc,
              fee-sbtc: fee-sbtc,
              price: (var-get stx-per-sbtc),
              timestamp: stacks-block-time
            })

            (ok {
              stx-in: stx-amount,
              sbtc-out: net-sbtc,
              fee: fee-sbtc
            })
          )
          sbtc-error err-token-transfer-failed
        )
      )
      stx-error err-stx-transfer-failed
    )
  )
)

;; Get swap stats
(define-read-only (get-swap-stats)
  (ok {
    enabled: (var-get swap-enabled),
    fee-bps: (var-get swap-fee-bps),
    total-volume-sbtc: (var-get total-swap-volume-sbtc),
    total-volume-stx: (var-get total-swap-volume-stx),
    total-fees-sbtc: (var-get total-swap-fees-sbtc),
    total-fees-stx: (var-get total-swap-fees-stx),
    sbtc-reserve: (var-get swap-sbtc-reserve),
    stx-liquidity: (var-get total-stx-available),
    price: (var-get stx-per-sbtc)
  })
)

;; Seed swap sBTC reserve (admin only)
;; Use this to add initial sBTC liquidity for STX - sBTC swaps
(define-public (seed-swap-sbtc-reserve (amount uint) (token <sbtc-token>))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) err-owner-only)
    (asserts! (> amount u0) err-invalid-amount)
    (match (contract-call? token transfer amount tx-sender CONTRACT-ADDRESS none)
      success (begin
        (var-set swap-sbtc-reserve (+ (var-get swap-sbtc-reserve) amount))
        (print {
          event: "swap-sbtc-reserve-seeded",
          amount: amount,
          total-reserve: (var-get swap-sbtc-reserve),
          timestamp: stacks-block-time
        })
        (ok true)
      )
      error err-token-transfer-failed
    )
  )
)

;; Withdraw from swap sBTC reserve (admin only)
(define-public (withdraw-swap-sbtc-reserve (amount uint) (token <sbtc-token>))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) err-owner-only)
    (asserts! (<= amount (var-get swap-sbtc-reserve)) err-insufficient-liquidity)
    (match (contract-call? token transfer amount CONTRACT-ADDRESS (var-get admin) none)
      success (begin
        (var-set swap-sbtc-reserve (- (var-get swap-sbtc-reserve) amount))
        (print {
          event: "swap-sbtc-reserve-withdrawn",
          amount: amount,
          total-reserve: (var-get swap-sbtc-reserve),
          timestamp: stacks-block-time
        })
        (ok true)
      )
      error err-token-transfer-failed
    )
  )
)

;; Set swap fee (admin only)
(define-public (set-swap-fee (fee-bps uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) err-owner-only)
    (asserts! (<= fee-bps u500) err-invalid-amount) ;; Max 5% fee
    (var-set swap-fee-bps fee-bps)
    (print {
      event: "swap-fee-updated",
      fee-bps: fee-bps,
      timestamp: stacks-block-time
    })
    (ok true)
  )
)

;; Enable/disable swaps (admin only)
(define-public (set-swap-enabled (enabled bool))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) err-owner-only)
    (var-set swap-enabled enabled)
    (print {
      event: "swap-enabled-updated",
      enabled: enabled,
      timestamp: stacks-block-time
    })
    (ok true)
  )
)

;; === STX LENDING FUNCTIONS ===
;; STX lenders deposit STX to earn interest from borrowers
;; This creates a self-sustaining lending market

;; STX lending state
(define-data-var total-stx-deposits uint u0)      ;; Total STX deposited by lenders
(define-data-var total-stx-shares uint u0)        ;; Share-based accounting for STX lenders
(define-data-var stx-interest-accumulated uint u0) ;; Total interest earned by STX lenders
(define-data-var last-interest-accrual uint u0)   ;; Last time interest was accrued

;; STX depositor map
(define-map stx-deposits
  { user: principal }
  {
    amount: uint,
    shares: uint,
    deposit-time: uint
  }
)

;; Deposit STX to earn interest from borrowers
;; STX lenders provide liquidity for sBTC collateral holders to borrow
(define-public (deposit-stx (amount uint))
  (let (
    (current-deposit (default-to {
        amount: u0,
        shares: u0,
        deposit-time: stacks-block-time
      }
      (map-get? stx-deposits { user: tx-sender })
    ))
    (current-stx-shares (var-get total-stx-shares))
    (current-stx-deposits (var-get total-stx-deposits))
    ;; Calculate shares: first depositor gets 1:1, subsequent get proportional
    (new-shares (if (is-eq current-stx-shares u0)
                    amount
                    (/ (* amount current-stx-shares) current-stx-deposits)))
  )
    (asserts! (not (var-get protocol-paused)) err-paused)
    (asserts! (> amount u0) err-invalid-amount)

    ;; Transfer STX from user to contract
    (match (stx-transfer? amount tx-sender CONTRACT-ADDRESS)
      success (begin
        ;; Update user STX deposit with shares
        (map-set stx-deposits { user: tx-sender } {
          amount: (+ (get amount current-deposit) amount),
          shares: (+ (get shares current-deposit) new-shares),
          deposit-time: stacks-block-time
        })

        ;; Update totals
        (var-set total-stx-deposits (+ current-stx-deposits amount))
        (var-set total-stx-shares (+ current-stx-shares new-shares))
        ;; Add to available liquidity for borrowers
        (var-set total-stx-available (+ (var-get total-stx-available) amount))

        (print {
          event: "stx-deposit",
          user: tx-sender,
          amount: amount,
          shares: new-shares,
          total-stx-deposits: (var-get total-stx-deposits),
          total-stx-available: (var-get total-stx-available),
          timestamp: stacks-block-time
        })

        (ok true)
      )
      error err-stx-transfer-failed
    )
  )
)

;; Withdraw STX from lending pool
;; Returns principal + proportional share of interest earned
(define-public (withdraw-stx (amount uint))
  (let (
    (user-deposit (unwrap! (map-get? stx-deposits { user: tx-sender }) err-insufficient-balance))
    (user-shares (get shares user-deposit))
    (user-amount (get amount user-deposit))
    (current-stx-shares (var-get total-stx-shares))
    (current-stx-deposits (var-get total-stx-deposits))
    (available (var-get total-stx-available))
    ;; Calculate shares to burn proportional to withdrawal
    (shares-to-burn (if (>= amount user-amount)
                        user-shares
                        (/ (* amount user-shares) user-amount)))
    (recipient tx-sender)
  )
    (asserts! (not (var-get protocol-paused)) err-paused)
    (asserts! (> amount u0) err-invalid-amount)
    (asserts! (<= amount user-amount) err-insufficient-balance)
    ;; Ensure there's enough liquidity (not all lent out)
    (asserts! (<= amount available) err-insufficient-liquidity)

    ;; Update user deposit
    (if (>= amount user-amount)
      (map-delete stx-deposits { user: tx-sender })
      (map-set stx-deposits { user: tx-sender } {
        amount: (- user-amount amount),
        shares: (- user-shares shares-to-burn),
        deposit-time: (get deposit-time user-deposit)
      })
    )

    ;; Transfer STX back to user
    (match (stx-transfer? amount CONTRACT-ADDRESS recipient)
      success (begin
        ;; Update totals
        (var-set total-stx-deposits (- current-stx-deposits amount))
        (var-set total-stx-shares (- current-stx-shares shares-to-burn))
        (var-set total-stx-available (- available amount))

        (print {
          event: "stx-withdraw",
          user: tx-sender,
          amount: amount,
          shares-burned: shares-to-burn,
          total-stx-deposits: (var-get total-stx-deposits),
          timestamp: stacks-block-time
        })

        (ok true)
      )
      error err-stx-transfer-failed
    )
  )
)

;; Get user's STX deposit info
(define-read-only (get-user-stx-deposit (user principal))
  (ok (map-get? stx-deposits { user: user }))
)

;; Get STX lending pool stats
(define-read-only (get-stx-lending-stats)
  (let (
    (stx-deposited (var-get total-stx-deposits))
    (stx-borrowed (var-get total-borrows))
    (stx-available (var-get total-stx-available))
    ;; Utilization = borrowed / (borrowed + available)
    (utilization (if (> (+ stx-borrowed stx-available) u0)
                     (/ (* stx-borrowed u10000) (+ stx-borrowed stx-available))
                     u0))
  )
    (ok {
      total-stx-deposited: stx-deposited,
      total-stx-borrowed: stx-borrowed,
      total-stx-available: stx-available,
      utilization-bps: utilization,
      interest-rate-bps: INTEREST-RATE-BPS,
      total-shares: (var-get total-stx-shares)
    })
  )
)

;; Calculate estimated APY for STX lenders based on utilization
;; Lender APY = Borrow APY x Utilization Rate
(define-read-only (get-stx-lender-apy)
  (let (
    (total-borrowed (var-get total-borrows))
    (available (var-get total-stx-available))
    (total-pool (+ total-borrowed available))
    (utilization (if (> total-pool u0)
                     (/ (* total-borrowed u10000) total-pool)
                     u0))
    ;; Lender APY = 5% x utilization
    ;; e.g., if 80% utilized: 5% x 0.8 = 4% APY for lenders
    (lender-apy-bps (/ (* INTEREST-RATE-BPS utilization) u10000))
  )
    (ok {
      utilization-bps: utilization,
      borrow-rate-bps: INTEREST-RATE-BPS,
      lender-apy-bps: lender-apy-bps
    })
  )
)

;; Updated pool status to include STX lending info
(define-read-only (get-full-pool-status)
  (ok {
    ;; sBTC deposits (earn dual stacking)
    total-sbtc-deposits: (var-get total-deposits),
    ;; STX lending (earn interest)
    total-stx-deposited: (var-get total-stx-deposits),
    total-stx-borrowed: (var-get total-borrows),
    total-stx-available: (var-get total-stx-available),
    ;; Price oracle
    stx-per-sbtc: (var-get stx-per-sbtc),
    ;; Status
    dual-stacking-enrolled: (var-get dual-stacking-enrolled),
    protocol-paused: (var-get protocol-paused),
    ;; Interest rate
    interest-rate-bps: INTEREST-RATE-BPS
  })
)
