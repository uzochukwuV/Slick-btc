;; sBTC Mock Token (SIP-010 Fungible Token)
;; =========================================
;; Mock implementation of sBTC for testing
;; In production, use the official sBTC contract

(impl-trait .sip010-ft-trait.sip010-ft-trait)

;; Token constants
(define-constant token-name "Stacks Bitcoin")
(define-constant token-symbol "sBTC")
(define-constant token-decimals u8) ;; 8 decimals like Bitcoin
(define-constant token-uri u"https://sbtc.tech")

;; Error codes
(define-constant err-unauthorized (err u1))
(define-constant err-insufficient-balance (err u2))
(define-constant err-invalid-amount (err u3))

;; Data variables
(define-data-var token-supply uint u0)

;; Token balances
(define-map balances
  principal
  uint
)

;; SIP-010 Functions

;; Transfer tokens
(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    ;; Check sender authorization
    (asserts! (or (is-eq tx-sender sender) (is-eq contract-caller sender)) err-unauthorized)
    (asserts! (> amount u0) err-invalid-amount)

    ;; Get balances
    (let (
      (sender-balance (default-to u0 (map-get? balances sender)))
      (recipient-balance (default-to u0 (map-get? balances recipient)))
    )
      ;; Check sufficient balance
      (asserts! (>= sender-balance amount) err-insufficient-balance)

      ;; Update balances
      (if (> sender-balance amount)
        (map-set balances sender (- sender-balance amount))
        (map-delete balances sender)
      )
      (map-set balances recipient (+ recipient-balance amount))

      ;; Print transfer event
      (print {
        event: "transfer",
        sender: sender,
        recipient: recipient,
        amount: amount,
        memo: memo
      })

      (ok true)
    )
  )
)

;; Get token name
(define-read-only (get-name)
  (ok token-name)
)

;; Get token symbol
(define-read-only (get-symbol)
  (ok token-symbol)
)

;; Get token decimals
(define-read-only (get-decimals)
  (ok token-decimals)
)

;; Get balance
(define-read-only (get-balance (account principal))
  (ok (default-to u0 (map-get? balances account)))
)

;; Get total supply
(define-read-only (get-total-supply)
  (ok (var-get token-supply))
)

;; Get token URI
(define-read-only (get-token-uri)
  (ok (some u"https://sbtc.tech"))
)

;; Mock-specific functions (not in SIP-010)

;; Mint tokens (for testing)
(define-public (mint (amount uint) (recipient principal))
  (let (
    (current-balance (default-to u0 (map-get? balances recipient)))
  )
    (map-set balances recipient (+ current-balance amount))
    (var-set token-supply (+ (var-get token-supply) amount))

    (print {
      event: "mint",
      recipient: recipient,
      amount: amount
    })

    (ok true)
  )
)

;; Burn tokens (for testing)
(define-public (burn (amount uint) (owner principal))
  (let (
    (current-balance (default-to u0 (map-get? balances owner)))
  )
    (asserts! (is-eq tx-sender owner) err-unauthorized)
    (asserts! (>= current-balance amount) err-insufficient-balance)

    (if (> current-balance amount)
      (map-set balances owner (- current-balance amount))
      (map-delete balances owner)
    )
    (var-set token-supply (- (var-get token-supply) amount))

    (print {
      event: "burn",
      owner: owner,
      amount: amount
    })

    (ok true)
  )
)

;; Initialize with test balances
(define-public (init-test-balances)
  (begin
    ;; Mint 1000 sBTC to deployer for testing
    (unwrap! (mint u100000000000 tx-sender) (err u999)) ;; 1000 sBTC
    (ok true)
  )
)
