;; Dual Stacking Mock Contract
;; ===========================
;; Mock implementation for testing Dual Stacking integration
;; Simulates the mainnet SP1HFCRKEJ8BYW4D0E3FAWHFDX8A25PPAA83HWWZ9.dual-stacking-v2_0_2 contract

(impl-trait .dual-stacking-trait.dual-stacking-trait)

;; Error codes
(define-constant err-not-enrolled (err u600))
(define-constant err-already-enrolled (err u601))
(define-constant err-invalid-principal (err u602))
(define-constant err-no-rewards (err u603))

;; Cycle parameters (matches mainnet)
(define-constant CYCLE-LENGTH u2100) ;; ~2100 Bitcoin blocks per cycle
(define-constant SNAPSHOTS-PER-CYCLE u14)
(define-constant BASE-YIELD-BPS u50) ;; 0.5% APY base yield (50 basis points)
(define-constant MAX-BOOST-MULTIPLIER u10) ;; Max 10x boost

;; Data variables
(define-data-var current-cycle uint u1)
(define-data-var total-pool-rewards uint u0)
(define-data-var cycle-finalized bool false)

;; Participant data
(define-map participants
  principal
  {
    enrolled: bool,
    rewarded-address: principal,
    sbtc-balance: uint,
    stx-ratio: uint,
    last-cycle-processed: uint,
    pending-rewards: uint
  }
)

;; Cycle rewards
(define-map cycle-data
  uint
  {
    total-rewards: uint,
    snapshot-count: uint,
    finalized: bool
  }
)

;; Enroll in Dual Stacking
(define-public (enroll (rewarded-address principal))
  (let (
    (participant-data (map-get? participants tx-sender))
  )
    ;; Check not already enrolled
    (asserts! (or (is-none participant-data)
                  (not (get enrolled (unwrap-panic participant-data))))
              err-already-enrolled)

    ;; Enroll the caller
    (map-set participants tx-sender {
      enrolled: true,
      rewarded-address: rewarded-address,
      sbtc-balance: u0, ;; Will be updated by snapshots
      stx-ratio: u0,
      last-cycle-processed: (var-get current-cycle),
      pending-rewards: u0
    })

    (print {
      event: "participant-enrolled",
      participant: tx-sender,
      rewarded-address: rewarded-address,
      cycle: (var-get current-cycle)
    })

    (ok true)
  )
)

;; Unenroll from Dual Stacking
(define-public (unenroll)
  (let (
    (participant-data (unwrap! (map-get? participants tx-sender) err-not-enrolled))
  )
    (asserts! (get enrolled participant-data) err-not-enrolled)

    ;; Mark as unenrolled
    (map-set participants tx-sender (merge participant-data {
      enrolled: false
    }))

    (print {
      event: "participant-unenrolled",
      participant: tx-sender,
      cycle: (var-get current-cycle)
    })

    (ok true)
  )
)

;; Distribute rewards to participants
;; In real contract, this reads snapshots and applies the formula
;; For mock: simulate reward distribution
(define-public (distribute-rewards (principals-list (list 900 principal)))
  (let (
    (cycle-info (default-to {
      total-rewards: u0,
      snapshot-count: u0,
      finalized: false
    } (map-get? cycle-data (var-get current-cycle))))
  )
    ;; In production, this would calculate rewards based on:
    ;; w_i = [B_i * (1 + M * sqrt(r_i))] / n
    ;; R_i = (w_i / SUM(w)) * Total Rewards

    ;; For mock: distribute evenly to all enrolled participants
    (ok (fold distribute-to-participant principals-list true))
  )
)

;; Helper to distribute to a single participant
(define-private (distribute-to-participant (participant principal) (prev-result bool))
  (match (map-get? participants participant)
    participant-data (begin
      (if (get enrolled participant-data)
        (let (
          ;; Simulate reward calculation (in real contract this uses the formula)
          ;; For mock: 1% of their sBTC balance as reward
          (reward-amount (/ (get sbtc-balance participant-data) u100))
          (rewarded-addr (get rewarded-address participant-data))
        )
          (if (> reward-amount u0)
            (begin
              ;; Update pending rewards
              (map-set participants participant (merge participant-data {
                pending-rewards: (+ (get pending-rewards participant-data) reward-amount)
              }))

              (print {
                event: "rewards-distributed",
                participant: participant,
                rewarded-address: rewarded-addr,
                amount: reward-amount,
                cycle: (var-get current-cycle)
              })

              prev-result
            )
            prev-result
          )
        )
        prev-result
      )
    )
    prev-result
  )
)

;; Get participant info
(define-read-only (get-participant-info (participant principal))
  (match (map-get? participants participant)
    data (ok {
      enrolled: (get enrolled data),
      rewarded-address: (get rewarded-address data),
      sbtc-balance: (get sbtc-balance data),
      stx-ratio: (get stx-ratio data),
      last-cycle-processed: (get last-cycle-processed data)
    })
    err-not-enrolled
  )
)

;; Get current cycle info
(define-read-only (get-cycle-info)
  (ok {
    cycle-id: (var-get current-cycle),
    snapshot-count: SNAPSHOTS-PER-CYCLE,
    total-rewards: (var-get total-pool-rewards),
    finalized: (var-get cycle-finalized)
  })
)

;; Admin/Test helpers (not in real contract)

;; Simulate snapshot - update participant's sBTC balance
(define-public (mock-snapshot (participant principal) (sbtc-balance uint))
  (match (map-get? participants participant)
    data (begin
      (map-set participants participant (merge data {
        sbtc-balance: sbtc-balance
      }))
      (ok true)
    )
    err-not-enrolled
  )
)

;; Simulate cycle finalization
(define-public (mock-finalize-cycle (total-rewards uint))
  (begin
    (var-set total-pool-rewards total-rewards)
    (var-set cycle-finalized true)

    (print {
      event: "finalize-reward-distribution",
      cycle: (var-get current-cycle),
      total-rewards: total-rewards
    })

    (ok true)
  )
)

;; Advance to next cycle
(define-public (mock-next-cycle)
  (begin
    (var-set current-cycle (+ (var-get current-cycle) u1))
    (var-set cycle-finalized false)
    (var-set total-pool-rewards u0)
    (ok true)
  )
)
