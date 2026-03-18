;; Flash Loans Test Suite
;; ======================

;; Test 1: Initialize contracts
(define-public (test-init)
  (begin
    (try! (contract-call? .sbtc-token-mock init-test-balances))
    (try! (contract-call? .sbtc-lending-pool set-sbtc-token .sbtc-token-mock))
    (print "✓ Flash loan contracts initialized")
    (ok true)
  )
)

;; Test 2: Check flash loan stats before any loans
(define-public (test-initial-flash-loan-stats)
  (let (
    (stats (unwrap-panic (contract-call? .sbtc-lending-pool get-flash-loan-stats)))
  )
    (asserts! (get enabled stats) (err u200))
    (asserts! (is-eq (get fee-bps stats) u9) (err u201)) ;; 0.09%
    (asserts! (is-eq (get total-volume stats) u0) (err u202))
    (asserts! (is-eq (get total-fees stats) u0) (err u203))

    (print "✓ Initial flash loan stats correct")
    (print { stats: stats })
    (ok true)
  )
)

;; Test 3: Deposit liquidity for flash loans
(define-public (test-deposit-liquidity)
  (let (
    (deposit-amount u100000000) ;; 1 sBTC
    (user tx-sender)
  )
    ;; Mint sBTC
    (try! (contract-call? .sbtc-token-mock mint deposit-amount user))

    ;; Deposit
    (try! (contract-call? .sbtc-lending-pool deposit deposit-amount .sbtc-token-mock))

    ;; Check stats
    (let (
      (stats (unwrap-panic (contract-call? .sbtc-lending-pool get-flash-loan-stats)))
    )
      (asserts! (is-eq (get available-liquidity stats) deposit-amount) (err u204))
      (print "✓ Liquidity deposited for flash loans")
      (print { available-liquidity: (get available-liquidity stats) })
    )

    (ok true)
  )
)

;; Test 4: Calculate flash loan fee
(define-public (test-calculate-flash-loan-fee)
  (let (
    (loan-amount u10000000) ;; 0.1 sBTC
    (fee (unwrap-panic (contract-call? .sbtc-lending-pool get-flash-loan-fee loan-amount)))
  )
    ;; Fee should be 0.09% of loan amount
    ;; 10000000 * 0.0009 = 9000 sats
    (asserts! (is-eq fee u9000) (err u205))

    (print "✓ Flash loan fee calculation correct")
    (print { loan-amount: loan-amount, fee: fee })
    (ok true)
  )
)

;; Test 5: Execute simple arbitrage flash loan
(define-public (test-arbitrage-flash-loan)
  (let (
    (flash-loan-amount u50000000) ;; 0.5 sBTC
    (expected-fee u45000) ;; 0.09% of 0.5 sBTC
    (receiver .simple-arbitrage)
    (amount-to-fund (+ flash-loan-amount expected-fee u1000)) ;; Extra buffer
  )
    ;; Pre-fund the receiver contract so it can repay
    (try! (contract-call? .sbtc-token-mock mint amount-to-fund receiver))

    ;; Execute flash loan
    (match (contract-call? .sbtc-lending-pool flash-loan
             receiver
             .sbtc-token-mock
             flash-loan-amount
             0x) ;; empty params
      result (begin
        (asserts! (is-eq (get amount result) flash-loan-amount) (err u206))
        (asserts! (is-eq (get fee result) expected-fee) (err u207))

        ;; Check updated stats
        (let (
          (stats (unwrap-panic (contract-call? .sbtc-lending-pool get-flash-loan-stats)))
        )
          (asserts! (is-eq (get total-volume stats) flash-loan-amount) (err u208))
          (asserts! (is-eq (get total-fees stats) expected-fee) (err u209))

          (print "✓ Arbitrage flash loan executed successfully")
          (print {
            amount: flash-loan-amount,
            fee: expected-fee,
            total-volume: (get total-volume stats),
            total-fees: (get total-fees stats)
          })
        )

        (ok true)
      )
      error (begin
        (print { error: "Flash loan failed", code: error })
        error
      )
    )
  )
)

;; Test 6: Execute self-liquidation flash loan
(define-public (test-self-liquidation-flash-loan)
  (let (
    (flash-loan-amount u20000000) ;; 0.2 sBTC
    (expected-fee u18000) ;; 0.09%
    (receiver .self-liquidation)
    (amount-to-fund (+ flash-loan-amount expected-fee u1000))
    (stats-before (unwrap-panic (contract-call? .sbtc-lending-pool get-flash-loan-stats)))
  )
    ;; Pre-fund the receiver contract
    (try! (contract-call? .sbtc-token-mock mint amount-to-fund receiver))

    ;; Execute flash loan
    (match (contract-call? .sbtc-lending-pool flash-loan
             receiver
             .sbtc-token-mock
             flash-loan-amount
             0x)
      result (begin
        (asserts! (is-eq (get amount result) flash-loan-amount) (err u210))
        (asserts! (is-eq (get fee result) expected-fee) (err u211))

        ;; Check cumulative stats
        (let (
          (stats-after (unwrap-panic (contract-call? .sbtc-lending-pool get-flash-loan-stats)))
          (volume-increase (- (get total-volume stats-after) (get total-volume stats-before)))
          (fees-increase (- (get total-fees stats-after) (get total-fees stats-before)))
        )
          (asserts! (is-eq volume-increase flash-loan-amount) (err u212))
          (asserts! (is-eq fees-increase expected-fee) (err u213))

          (print "✓ Self-liquidation flash loan executed successfully")
          (print {
            amount: flash-loan-amount,
            fee: expected-fee,
            cumulative-volume: (get total-volume stats-after),
            cumulative-fees: (get total-fees stats-after)
          })
        )

        (ok true)
      )
      error (begin
        (print { error: "Flash loan failed", code: error })
        error
      )
    )
  )
)

;; Test 7: Execute collateral swap flash loan
(define-public (test-collateral-swap-flash-loan)
  (let (
    (flash-loan-amount u15000000) ;; 0.15 sBTC
    (expected-fee u13500) ;; 0.09%
    (receiver .collateral-swap)
    (amount-to-fund (+ flash-loan-amount expected-fee u1000))
  )
    ;; Pre-fund the receiver contract
    (try! (contract-call? .sbtc-token-mock mint amount-to-fund receiver))

    ;; Execute flash loan
    (match (contract-call? .sbtc-lending-pool flash-loan
             receiver
             .sbtc-token-mock
             flash-loan-amount
             0x)
      result (begin
        (asserts! (is-eq (get amount result) flash-loan-amount) (err u214))
        (asserts! (is-eq (get fee result) expected-fee) (err u215))

        (print "✓ Collateral swap flash loan executed successfully")
        (print { amount: flash-loan-amount, fee: expected-fee })

        (ok true)
      )
      error (begin
        (print { error: "Flash loan failed", code: error })
        error
      )
    )
  )
)

;; Test 8: Try to borrow more than available liquidity
(define-public (test-insufficient-liquidity)
  (let (
    (total-deposits (unwrap-panic (contract-call? .sbtc-lending-pool get-total-deposits)))
    (excessive-amount (+ total-deposits u1000000)) ;; More than deposited
    (receiver .simple-arbitrage)
  )
    ;; This should fail
    (match (contract-call? .sbtc-lending-pool flash-loan
             receiver
             .sbtc-token-mock
             excessive-amount
             0x)
      success (begin
        (print "ERROR: Should have failed due to insufficient liquidity")
        (err u216)
      )
      error (begin
        (print "✓ Correctly rejected flash loan exceeding liquidity")
        (ok true)
      )
    )
  )
)

;; Test 9: Admin changes flash loan fee
(define-public (test-change-flash-loan-fee)
  (let (
    (new-fee-bps u50) ;; Change to 0.5%
  )
    ;; Change fee
    (try! (contract-call? .sbtc-lending-pool set-flash-loan-fee new-fee-bps))

    ;; Verify change
    (let (
      (stats (unwrap-panic (contract-call? .sbtc-lending-pool get-flash-loan-stats)))
    )
      (asserts! (is-eq (get fee-bps stats) new-fee-bps) (err u217))

      ;; Test new fee calculation
      (let (
        (test-amount u10000000)
        (new-fee (unwrap-panic (contract-call? .sbtc-lending-pool get-flash-loan-fee test-amount)))
        (expected-new-fee u50000) ;; 0.5% of 0.1 sBTC
      )
        (asserts! (is-eq new-fee expected-new-fee) (err u218))

        (print "✓ Flash loan fee changed successfully")
        (print { old-fee: u9, new-fee: new-fee-bps, calculated-fee: new-fee })
      )
    )

    ;; Reset to original fee
    (try! (contract-call? .sbtc-lending-pool set-flash-loan-fee u9))
    (ok true)
  )
)

;; Test 10: Admin disables/enables flash loans
(define-public (test-disable-enable-flash-loans)
  (let (
    (receiver .simple-arbitrage)
    (amount u1000000)
  )
    ;; Disable flash loans
    (try! (contract-call? .sbtc-lending-pool set-flash-loan-enabled false))

    ;; Verify disabled
    (let (
      (stats (unwrap-panic (contract-call? .sbtc-lending-pool get-flash-loan-stats)))
    )
      (asserts! (not (get enabled stats)) (err u219))
    )

    ;; Try flash loan (should fail)
    (match (contract-call? .sbtc-lending-pool flash-loan receiver .sbtc-token-mock amount 0x)
      success (begin
        (print "ERROR: Flash loan should have been disabled")
        (err u220)
      )
      error (begin
        (print "✓ Flash loans correctly disabled")

        ;; Re-enable
        (try! (contract-call? .sbtc-lending-pool set-flash-loan-enabled true))

        ;; Verify enabled
        (let (
          (stats-after (unwrap-panic (contract-call? .sbtc-lending-pool get-flash-loan-stats)))
        )
          (asserts! (get enabled stats-after) (err u221))
          (print "✓ Flash loans re-enabled successfully")
        )

        (ok true)
      )
    )
  )
)

;; Test 11: Full integration test
(define-public (test-flash-loans-full-integration)
  (begin
    (print "\n=== FLASH LOANS FULL INTEGRATION TEST ===\n")

    (try! (test-init))
    (try! (test-initial-flash-loan-stats))
    (try! (test-deposit-liquidity))
    (try! (test-calculate-flash-loan-fee))
    (try! (test-arbitrage-flash-loan))
    (try! (test-self-liquidation-flash-loan))
    (try! (test-collateral-swap-flash-loan))
    (try! (test-insufficient-liquidity))
    (try! (test-change-flash-loan-fee))
    (try! (test-disable-enable-flash-loans))

    (print "\n=== ALL FLASH LOAN TESTS PASSED ✓ ===\n")

    ;; Print final stats
    (let (
      (final-stats (unwrap-panic (contract-call? .sbtc-lending-pool get-flash-loan-stats)))
    )
      (print "\n=== FINAL STATS ===")
      (print final-stats)
    )

    (ok true)
  )
)

;; Run all tests
(test-flash-loans-full-integration)
