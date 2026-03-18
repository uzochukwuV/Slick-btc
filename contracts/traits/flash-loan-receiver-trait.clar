;; Flash Loan Receiver Trait
;; =========================
;; Interface that flash loan borrowers must implement

(define-trait flash-loan-receiver-trait
  (
    ;; Execute arbitrary logic with borrowed sBTC
    ;; Called by the lending pool during flash loan execution
    ;;
    ;; Parameters:
    ;; - token: sBTC token contract
    ;; - amount: borrowed amount in micro-sats
    ;; - fee: flash loan fee in micro-sats
    ;; - initiator: principal who initiated the flash loan
    ;; - params: optional custom parameters (buff 1024) for the operation
    ;;
    ;; The receiver MUST:
    ;; 1. Use the borrowed sBTC for whatever operation
    ;; 2. Ensure it can repay amount + fee before returning
    ;; 3. Approve the lending pool to pull amount + fee
    ;;
    ;; Returns: (ok true) if execution succeeded, (err uint) otherwise
    (execute-flash-loan (
      principal  ;; token contract
      uint       ;; amount borrowed
      uint       ;; fee to pay
      principal  ;; initiator
      (buff 1024) ;; custom params
    ) (response bool uint))
  )
)
