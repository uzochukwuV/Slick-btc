;; Dual Stacking Trait
;; ==================
;; Interface for the official Dual Stacking v2.0.2 contract
;; Mainnet: SP1HFCRKEJ8BYW4D0E3FAWHFDX8A25PPAA83HWWZ9.dual-stacking-v2_0_2

(define-trait dual-stacking-trait
  (
    ;; Self-enroll in Dual Stacking
    ;; The caller (typically a smart contract) enrolls itself
    ;; rewarded-address: where rewards should be sent (usually the caller itself)
    (enroll (principal) (response bool uint))

    ;; Unenroll from Dual Stacking
    (unenroll () (response bool uint))

    ;; Distribute rewards to a batch of participants
    ;; Called by anyone after finalize-reward-distribution event
    ;; principals: list of up to 900 participants to distribute to
    (distribute-rewards ((list 900 principal)) (response bool uint))

    ;; Get participant info (balance snapshots, ratio, etc.)
    (get-participant-info (principal) (response {
      enrolled: bool,
      rewarded-address: principal,
      sbtc-balance: uint,
      stx-ratio: uint,
      last-cycle-processed: uint
    } uint))

    ;; Get current cycle info
    (get-cycle-info () (response {
      cycle-id: uint,
      snapshot-count: uint,
      total-rewards: uint,
      finalized: bool
    } uint))
  )
)
