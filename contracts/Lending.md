
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
    (match (as-contract (contract-call? .dual-stacking-mock enroll (as-contract tx-sender)))
      success (begin
        (var-set dual-stacking-enrolled true)
        (print {
          event: "dual-stacking-enrolled",
          pool: (as-contract tx-sender),
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
    (principals-to-distribute (list (as-contract tx-sender)))
    (pool-balance-before (unwrap! (contract-call? token get-balance (as-contract tx-sender)) err-dual-stacking-failed))
  )
    (asserts! (var-get dual-stacking-enrolled) err-not-enrolled)

    ;; Trigger reward distribution for our pool
    (unwrap! (as-contract (contract-call? .dual-stacking-mock
                         distribute-rewards principals-to-distribute))
             err-dual-stacking-failed)

    ;; Check balance after rewards
    (let (
      (pool-balance-after (unwrap! (contract-call? token get-balance (as-contract tx-sender)) err-dual-stacking-failed))
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

            (print {
              event: "dual-stacking-rewards-claimed",
              pool: (as-contract tx-sender),
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

;; Claim pending Dual Stacking rewards
(define-public (claim-user-rewards (token <sbtc-token>))
  (let (
    (pending (unwrap! (get-pending-rewards tx-sender) err-dual-stacking-failed))
    (user-data (unwrap! (map-get? user-deposits { user: tx-sender }) err-insufficient-balance))
    (user-shares (get shares user-data))
    (current-reward-per-share (var-get accumulated-rewards-per-share))
  )
    (asserts! (> pending u0) err-invalid-amount)

    ;; Transfer rewards to user
    (match (as-contract (contract-call? token transfer pending CONTRACT-ADDRESS tx-sender none))
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

;; === CORE LENDING FUNCTIONS (modified for sBTC) ===

;; Set sBTC token contract (must be called after deployment)
(define-public (set-sbtc-token (token principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) err-owner-only)
    (var-set sbtc-token-contract (some token))
    (ok true)
  )
)

;; Deposit sBTC into the pool
;; Automatically enrolls pool in Dual Stacking if threshold reached
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
          (match (as-contract (contract-call?
                   .dual-stacking-mock
                   enroll
                   (as-contract tx-sender)))
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
    (match (as-contract (contract-call? token transfer amount CONTRACT-ADDRESS recipient none))
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
















;; Calculate accrued interest (same logic as original)
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

;; Borrow against collateral (sBTC version)
(define-public (borrow (amount uint) (token <sbtc-token>))
  (let (
    (recipient tx-sender)
    (user-coll (unwrap! (map-get? user-collateral { user: tx-sender })
      err-insufficient-collateral
    ))
    (current-collateral (get amount user-coll))
    (max-borrow (/ (* current-collateral u100) COLLATERAL-RATIO))
    (existing-loan (map-get? user-loans { user: tx-sender }))
    (current-debt (match existing-loan
      loan (+ (get principal-amount loan)
        (unwrap-panic (calculate-current-interest tx-sender))
      )
      u0
    ))
  )
    (asserts! (not (var-get protocol-paused)) err-paused)
    (asserts! (<= (+ current-debt amount) max-borrow)
      err-insufficient-collateral
    )

    (let ((original-borrow-time (match existing-loan
      loan (get borrow-time loan)
      stacks-block-time
    )))
      (map-set user-loans { user: tx-sender } {
        principal-amount: (+ current-debt amount),
        interest-accrued: u0,
        borrow-time: original-borrow-time,
        last-interest-update: stacks-block-time,
      })
    )

    ;; Transfer borrowed sBTC from contract
    (match (as-contract (contract-call? token transfer amount CONTRACT-ADDRESS recipient none))
      success (begin
        (var-set total-borrows (+ (var-get total-borrows) amount))
        (ok true)
      )
      error err-token-transfer-failed
    )
  )
)

;; Add collateral (using sBTC)
(define-public (add-collateral (amount uint) (asset (string-ascii 10)) (token <sbtc-token>))
  (let ((current-coll (default-to {
      amount: u0,
      asset: "sBTC",
    }
    (map-get? user-collateral { user: tx-sender })
  )))
    (asserts! (not (var-get protocol-paused)) err-paused)
    (asserts! (> amount u0) err-invalid-amount)

    ;; Transfer collateral to contract
    (match (contract-call? token transfer amount tx-sender CONTRACT-ADDRESS none)
      success (begin
        (map-set user-collateral { user: tx-sender } {
          amount: (+ (get amount current-coll) amount),
          asset: asset,
        })
        (ok true)
      )
      error err-token-transfer-failed
    )
  )
)

;; Repay loan (sBTC version)
(define-public (repay (amount uint) (token <sbtc-token>))
  (let (
    (loan-data (unwrap! (map-get? user-loans { user: tx-sender }) err-loan-not-found))
    (current-interest (unwrap-panic (calculate-current-interest tx-sender)))
    (total-debt (+ (get principal-amount loan-data) current-interest))
  )
    (asserts! (not (var-get protocol-paused)) err-paused)
    (asserts! (<= amount total-debt) err-invalid-amount)

    ;; Transfer repayment
    (match (contract-call? token transfer amount tx-sender CONTRACT-ADDRESS none)
      success (begin
        (if (>= amount total-debt)
          (begin
            (map-delete user-loans { user: tx-sender })
            (var-set total-borrows (- (var-get total-borrows) total-debt))
          )
          (begin
            (map-set user-loans { user: tx-sender } {
              principal-amount: (- total-debt amount),
              interest-accrued: u0,
              borrow-time: (get borrow-time loan-data),
              last-interest-update: stacks-block-time,
            })
            (var-set total-borrows (- (var-get total-borrows) amount))
          )
        )
        (ok true)
      )
      error err-token-transfer-failed
    )
  )
)




















<!-- here -->

;; Calculate health factor
(define-read-only (get-health-factor (user principal))
  (match (map-get? user-loans { user: user })
    loan-data (match (map-get? user-collateral { user: user })
      coll-data (let (
        (total-debt (+ (get principal-amount loan-data)
          (unwrap-panic (calculate-current-interest user))
        ))
        (collateral-value (get amount coll-data))
      )
        (if (is-eq total-debt u0)
          (ok u0)
          (ok (/ (* collateral-value u100) total-debt))
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
    )
      (ok {
        principal: principal-amt,
        interest: interest-amt,
        health-factor: health,
        is-healthy: (>= health MIN-HEALTH-FACTOR),
        dual-stacking: (var-get dual-stacking-enrolled)
      })
    )
    (ok {
      principal: u0,
      interest: u0,
      health-factor: u0,
      is-healthy: true,
      dual-stacking: (var-get dual-stacking-enrolled)
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































;; === FLASH LOAN FUNCTIONS ===

;; Execute a flash loan
;; Lend sBTC with 0% collateral, must be repaid + fee in same transaction
;;
;; How it works:
;; 1. Pool lends sBTC to receiver contract
;; 2. Receiver executes arbitrary logic (arbitrage, liquidation, etc.)
;; 3. Receiver must repay amount + fee before transaction ends
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
    ;; Calculate available liquidity (deposits - borrows)
    (available-liquidity (if (> pool-balance-before total-borrowed)
                             (- pool-balance-before total-borrowed)
                             u0))
    (fee (/ (* amount (var-get flash-loan-fee-bps)) u10000))
    (amount-plus-fee (+ amount fee))
    (receiver-principal (contract-of receiver))
    (initiator tx-sender)
  )
    (asserts! (var-get flash-loan-enabled) err-paused)
    (asserts! (> amount u0) err-invalid-amount)
    ;; Use available liquidity instead of total deposits
    (asserts! (<= amount available-liquidity) err-insufficient-liquidity)

    ;; 1. Transfer sBTC to receiver
    (match (as-contract (contract-call? token transfer amount CONTRACT-ADDRESS receiver-principal none))
      transfer-success (begin
        ;; 2. Call receiver's execute-flash-loan
        (match (contract-call? receiver execute-flash-loan
                 (contract-of token)
                 amount
                 fee
                 initiator
                 params)
          execute-success (begin
            ;; 3. Receiver must return amount + fee
            (match (contract-call? token transfer amount-plus-fee receiver-principal CONTRACT-ADDRESS none)
              repay-success (begin
                ;; Update stats
                (var-set total-flash-loan-volume (+ (var-get total-flash-loan-volume) amount))
                (var-set total-flash-loan-fees (+ (var-get total-flash-loan-fees) fee))

                ;; Fee stays in pool, benefiting all suppliers
                (var-set total-deposits (+ pool-balance-before fee))

                (print {
                  event: "flash-loan",
                  receiver: receiver-principal,
                  initiator: initiator,
                  amount: amount,
                  fee: fee,
                  timestamp: stacks-block-time
                })

                (ok {
                  amount: amount,
                  fee: fee,
                  total-repaid: amount-plus-fee
                })
              )
              repay-error err-flash-loan-not-repaid
            )
          )
          execute-error err-flash-loan-failed
        )
      )
      transfer-error err-token-transfer-failed
    )
  )
)

;; Get flash loan fee for a given amount
(define-read-only (get-flash-loan-fee (amount uint))
  (ok (/ (* amount (var-get flash-loan-fee-bps)) u10000))
)

;; Get flash loan stats
(define-read-only (get-flash-loan-stats)
  (let (
    (total-deps (var-get total-deposits))
    (total-borr (var-get total-borrows))
    (available (if (> total-deps total-borr) (- total-deps total-borr) u0))
  )
    (ok {
      enabled: (var-get flash-loan-enabled),
      fee-bps: (var-get flash-loan-fee-bps),
      total-volume: (var-get total-flash-loan-volume),
      total-fees: (var-get total-flash-loan-fees),
      available-liquidity: available
    })
  )
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
