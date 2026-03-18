;; SIP-010 Fungible Token Trait
;; ============================
;; Standard trait for fungible tokens (sBTC, STX-wrapped tokens, etc.)

(define-trait sip010-ft-trait
  (
    ;; Transfer tokens
    (transfer (uint principal principal (optional (buff 34))) (response bool uint))

    ;; Get token name
    (get-name () (response (string-ascii 32) uint))

    ;; Get token symbol
    (get-symbol () (response (string-ascii 32) uint))

    ;; Get token decimals
    (get-decimals () (response uint uint))

    ;; Get balance of an account
    (get-balance (principal) (response uint uint))

    ;; Get total supply
    (get-total-supply () (response uint uint))

    ;; Get token URI
    (get-token-uri () (response (optional (string-utf8 256)) uint))
  )
)
