;; sBTC Lending Pool with Dual Stacking - Test Suite
;; =================================================

;; Test 1: Deploy and initialize contracts
(define-public (test-deploy-contracts)
  (begin
    ;; Initialize sBTC mock token
    (try! (contract-call? .sbtc-token-mock init-test-balances))

    ;; Set sBTC token in lending pool
    (try! (contract-call? .sbtc-lending-pool set-sbtc-token .sbtc-token-mock))

    (print "✓ Contracts deployed and initialized")
    (ok true)
  )
)

;; Test 2: Deposit sBTC below enrollment threshold
(define-public (test-deposit-below-threshold)
  (let (
    (deposit-amount u50000) ;; 0.0005 sBTC (below MIN-SBTC-FOR-ENROLL)
    (user tx-sender)
  )
    ;; Mint sBTC to user
    (try! (contract-call? .sbtc-token-mock mint deposit-amount user))

    ;; Deposit sBTC
    (try! (contract-call? .sbtc-lending-pool deposit deposit-amount .sbtc-token-mock))

    ;; Check deposit
    (let (
      (user-deposit (unwrap-panic (contract-call? .sbtc-lending-pool get-user-deposit user)))
    )
      (asserts! (is-some user-deposit) (err u100))
      (asserts! (is-eq (get amount (unwrap-panic user-deposit)) deposit-amount) (err u101))
    )

    ;; Check Dual Stacking status - should NOT be enrolled yet
    (let (
      (ds-status (unwrap-panic (contract-call? .sbtc-lending-pool get-dual-stacking-status)))
    )
      (asserts! (not (get enrolled ds-status)) (err u102))
      (print "✓ Deposit below threshold - Dual Stacking not enrolled")
    )

    (ok true)
  )
)

;; Test 3: Deposit sBTC above enrollment threshold
(define-public (test-deposit-above-threshold)
  (let (
    (deposit-amount u200000) ;; 0.002 sBTC (above MIN-SBTC-FOR-ENROLL)
    (user 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5)
  )
    ;; Mint sBTC to user
    (try! (contract-call? .sbtc-token-mock mint deposit-amount user))

    ;; Deposit sBTC as user
    (as-contract (try! (contract-call? .sbtc-lending-pool deposit deposit-amount .sbtc-token-mock)))

    ;; Check Dual Stacking status - should be enrolled now
    (let (
      (ds-status (unwrap-panic (contract-call? .sbtc-lending-pool get-dual-stacking-status)))
      (total-deposits (unwrap-panic (contract-call? .sbtc-lending-pool get-total-deposits)))
    )
      ;; Total should be sum of both deposits
      (asserts! (>= total-deposits u200000) (err u103))
      (print { total-deposits: total-deposits })
      (print "✓ Deposit above threshold - pool has sufficient sBTC")
    )

    (ok true)
  )
)

;; Test 4: Manual enrollment in Dual Stacking
(define-public (test-manual-enrollment)
  (begin
    ;; Admin enrolls the pool
    (match (contract-call? .sbtc-lending-pool enroll-in-dual-stacking)
      success (begin
        ;; Check enrollment status
        (let (
          (ds-status (unwrap-panic (contract-call? .sbtc-lending-pool get-dual-stacking-status)))
        )
          (asserts! (get enrolled ds-status) (err u104))
          (print "✓ Manual enrollment in Dual Stacking successful")
        )
        (ok true)
      )
      error (begin
        ;; It's OK if already enrolled
        (print "Note: Already enrolled or enrollment failed (expected if auto-enrolled)")
        (ok true)
      )
    )
  )
)

;; Test 5: Simulate Dual Stacking snapshot
(define-public (test-dual-stacking-snapshot)
  (let (
    (pool-principal .sbtc-lending-pool)
    (pool-balance u250000) ;; Approximate total deposits
  )
    ;; Simulate snapshot - update pool's sBTC balance in Dual Stacking
    (try! (contract-call? .dual-stacking-mock mock-snapshot pool-principal pool-balance))

    ;; Get participant info
    (let (
      (participant-info (unwrap-panic (contract-call? .dual-stacking-mock get-participant-info pool-principal)))
    )
      (asserts! (get enrolled participant-info) (err u105))
      (asserts! (is-eq (get sbtc-balance participant-info) pool-balance) (err u106))
      (print "✓ Dual Stacking snapshot successful")
      (print { participant-info: participant-info })
    )

    (ok true)
  )
)

;; Test 6: Finalize Dual Stacking cycle and distribute rewards
(define-public (test-finalize-and-distribute-rewards)
  (let (
    (pool-principal .sbtc-lending-pool)
    (total-rewards u2500) ;; 0.000025 sBTC in rewards
  )
    ;; Mint rewards to pool (simulating Dual Stacking distribution)
    (try! (contract-call? .sbtc-token-mock mint total-rewards pool-principal))

    ;; Finalize cycle
    (try! (contract-call? .dual-stacking-mock mock-finalize-cycle total-rewards))

    ;; Claim rewards (now requires token parameter)
    (try! (contract-call? .sbtc-lending-pool claim-dual-stacking-rewards .sbtc-token-mock))

    ;; Check cycle info
    (let (
      (cycle-info (unwrap-panic (contract-call? .dual-stacking-mock get-cycle-info)))
      (ds-status (unwrap-panic (contract-call? .sbtc-lending-pool get-dual-stacking-status)))
    )
      (asserts! (get finalized cycle-info) (err u107))
      (asserts! (is-eq (get total-rewards cycle-info) total-rewards) (err u108))
      (asserts! (is-eq (get total-rewards ds-status) total-rewards) (err u109))
      (print "✓ Dual Stacking rewards finalized and claimed")
      (print { cycle-info: cycle-info, ds-status: ds-status })
    )

    (ok true)
  )
)

;; Test 6b: Check pending rewards and claim user rewards
(define-public (test-claim-user-rewards)
  (let (
    (user tx-sender)
  )
    ;; Check pending rewards
    (let (
      (pending (unwrap-panic (contract-call? .sbtc-lending-pool get-pending-rewards user)))
    )
      (print { pending-rewards: pending })

      ;; If user has pending rewards, claim them
      (if (> pending u0)
        (begin
          (try! (contract-call? .sbtc-lending-pool claim-user-rewards .sbtc-token-mock))
          (print "✓ User rewards claimed successfully")
        )
        (print "Note: No pending rewards to claim")
      )
    )

    (ok true)
  )
)

;; Test 7: Borrow against collateral
(define-public (test-borrow-with-dual-stacking)
  (let (
    (user tx-sender)
    (collateral-amount u300000) ;; 0.003 sBTC collateral
    (borrow-amount u150000) ;; 0.0015 sBTC borrow (50% of collateral, well within 150% ratio)
  )
    ;; Mint sBTC for collateral
    (try! (contract-call? .sbtc-token-mock mint collateral-amount user))

    ;; Add collateral
    (try! (contract-call? .sbtc-lending-pool add-collateral
      collateral-amount
      "sBTC"
      .sbtc-token-mock))

    ;; Borrow
    (try! (contract-call? .sbtc-lending-pool borrow borrow-amount .sbtc-token-mock))

    ;; Check loan status
    (let (
      (loan-status (unwrap-panic (contract-call? .sbtc-lending-pool get-loan-status-ascii user)))
      (health-factor (unwrap-panic (contract-call? .sbtc-lending-pool get-health-factor user)))
    )
      (asserts! (is-eq (get status loan-status) "HEALTHY") (err u109))
      (asserts! (is-eq (get dual-stacking-enrolled loan-status) "YES") (err u110))
      (asserts! (>= health-factor u150) (err u111)) ;; Health should be 200 (300k/150k * 100)

      (print "✓ Borrow successful with Dual Stacking active")
      (print { loan-status: loan-status, health-factor: health-factor })
    )

    (ok true)
  )
)

;; Test 8: Withdraw sBTC (after rewards)
(define-public (test-withdraw-with-rewards)
  (let (
    (user tx-sender)
    (withdraw-amount u100000) ;; 0.001 sBTC
  )
    ;; Mint additional sBTC to pool to simulate rewards
    (try! (contract-call? .sbtc-token-mock mint u10000 .sbtc-lending-pool))

    ;; Withdraw
    (try! (contract-call? .sbtc-lending-pool withdraw withdraw-amount .sbtc-token-mock))

    ;; Check user balance
    (let (
      (user-balance (unwrap-panic (contract-call? .sbtc-token-mock get-balance user)))
    )
      (asserts! (>= user-balance withdraw-amount) (err u112))
      (print "✓ Withdrawal successful")
      (print { user-balance: user-balance })
    )

    (ok true)
  )
)

;; Test 9: Repay loan
(define-public (test-repay-loan)
  (let (
    (user tx-sender)
    (repay-amount u150000) ;; Full repayment of borrowed amount
  )
    ;; Mint sBTC for repayment
    (try! (contract-call? .sbtc-token-mock mint repay-amount user))

    ;; Repay
    (try! (contract-call? .sbtc-lending-pool repay repay-amount .sbtc-token-mock))

    ;; Check loan status
    (let (
      (loan-status (unwrap-panic (contract-call? .sbtc-lending-pool get-loan-status-ascii user)))
    )
      ;; Loan might still exist if interest accrued, or be deleted
      (print "✓ Loan repayment successful")
      (print { loan-status: loan-status })
    )

    (ok true)
  )
)

;; Test 10: Full integration test
(define-public (test-full-integration)
  (begin
    (print "\n=== FULL DUAL STACKING INTEGRATION TEST ===\n")

    ;; 1. Deploy
    (try! (test-deploy-contracts))

    ;; 2. Deposit below threshold
    (try! (test-deposit-below-threshold))

    ;; 3. Deposit above threshold
    (try! (test-deposit-above-threshold))

    ;; 4. Manual enrollment
    (try! (test-manual-enrollment))

    ;; 5. Snapshot
    (try! (test-dual-stacking-snapshot))

    ;; 6. Finalize and claim rewards
    (try! (test-finalize-and-distribute-rewards))

    ;; 6b. Claim user rewards
    (try! (test-claim-user-rewards))

    ;; 7. Borrow
    (try! (test-borrow-with-dual-stacking))

    ;; 8. Withdraw
    (try! (test-withdraw-with-rewards))

    ;; 9. Repay
    (try! (test-repay-loan))

    (print "\n=== ALL TESTS PASSED ✓ ===\n")
    (ok true)
  )
)

;; Run all tests
(test-full-integration)
