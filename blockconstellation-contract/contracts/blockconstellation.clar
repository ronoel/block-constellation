;; title: Block Constellation
;; version: 1.0.0
;; summary: Contract for managing blockchain constellations and cycles 
;; description: This contract allows users to allocate resources to constellations, participate in cycles, and earn rewards

;; ========================================
;; Constants
;; ========================================
(define-constant ERR-PRECONDITION-FAILED (err u412))
(define-constant ERR-PRINCIPAL-NOT-FOUND (err u404))
(define-constant ERR-PERMISSION-DENIED (err u403))
(define-constant ERR-INVALID-VALUE (err u400))

(define-constant START-BLOCK tenure-height)
(define-constant TOTAL-CONSTELLATIONS u21)

;; ========================================
;; Data Variables
;; ========================================
;; Admin and configuration variables
(define-data-var manager principal tx-sender)
(define-data-var cycle-duration uint u144) ;; 144 bitcoin blocks
(define-data-var min-allocation uint u1000000) ;; 1 million satoshis
(define-data-var treasure-distribution-cycle-count uint u3)
(define-data-var prize-expiration-cycle-count uint u5) ;; Number of cycles before prize expires
(define-data-var reward-claim-fee uint u100)

;; Financial state variables
(define-data-var treasure uint u0)
(define-data-var team-fee uint u0)

;; Division configuration
(define-data-var allocation-division
    {
        current-cycle: uint,
        treasure: uint,
        team-fee: uint,
        referral-reward: uint
    }
    {
        current-cycle: u30,
        treasure: u40,
        team-fee: u25,
        referral-reward: u5
    }
)

;; ========================================
;; Maps
;; ========================================
;; Allocate the prize for each constellation
(define-map cycle uint 
    {
        prize: uint,
        prize-claimed: uint,
        constellation-allocation: (list 21 uint),
        allocation-claimed: uint
    })

;; Store the allocated by user for each constellation
(define-map allocated-by-user
    {
        cycle-id: uint,
        user: principal
    }
    {
        constellation-allocation: (list 21 uint),
        claimed: bool
    })

(define-map refferral-reward principal
    {
        amount: uint, ;; Amount of reward
        block-update: uint  ;; Block number when the reward was updated
    })

;; ========================================
;; Admin Functions
;; ========================================
;; Get the current manager
(define-read-only (get-manager)
  (var-get manager)
)

;; Set a new manager - can only be called by the current manager
(define-public (set-manager (new-manager principal))
  (begin
    ;; Check that the caller is the current manager
    (asserts! (is-eq contract-caller (var-get manager)) ERR-PERMISSION-DENIED)
    ;; Update the manager to the new value
    (ok (var-set manager new-manager))
  )
)

;; Set the cycle duration - can only be called by the current manager
(define-public (set-cycle-duration (new-duration uint))
  (begin
    ;; Check that the caller is the current manager
    (asserts! (is-eq contract-caller (var-get manager)) ERR-PERMISSION-DENIED)
    ;; Validate the new duration (must be greater than 0)
    (asserts! (> new-duration u0) ERR-INVALID-VALUE)
    ;; Update the cycle duration to the new value
    (ok (var-set cycle-duration new-duration))
  )
)

;; Set the minimum allocation - can only be called by the current manager
(define-public (set-min-allocation (new-min-allocation uint))
  (begin
    ;; Check that the caller is the current manager
    (asserts! (is-eq contract-caller (var-get manager)) ERR-PERMISSION-DENIED)
    ;; Validate the new minimum allocation (must be greater than 0)
    (asserts! (> new-min-allocation u0) ERR-INVALID-VALUE)
    ;; Update the minimum allocation to the new value
    (ok (var-set min-allocation new-min-allocation))
  )
)

;; Set the treasure distribution cycle count - can only be called by the current manager
(define-public (set-treasure-distribution-cycle-count (new-count uint))
  (begin
    ;; Check that the caller is the current manager
    (asserts! (is-eq contract-caller (var-get manager)) ERR-PERMISSION-DENIED)
    ;; Validate the new count (must be greater than 0)
    (asserts! (> new-count u0) ERR-INVALID-VALUE)
    ;; Update the treasure distribution cycle count to the new value
    (ok (var-set treasure-distribution-cycle-count new-count))
  )
)

;; Set the team fee - can only be called by the current manager
(define-public (set-team-fee (new-fee uint))
  (begin
    ;; Check that the caller is the current manager
    (asserts! (is-eq contract-caller (var-get manager)) ERR-PERMISSION-DENIED)
    ;; Validate the new fee (must be a valid uint)
    (asserts! (is-eq new-fee new-fee) ERR-INVALID-VALUE) ;; This always passes for valid uint
    ;; Update the team fee to the new value
    (ok (var-set team-fee new-fee))
  )
)

;; Set the reward claim fee - can only be called by the current manager
(define-public (set-reward-claim-fee (new-fee uint))
  (begin
    ;; Check that the caller is the current manager
    (asserts! (is-eq contract-caller (var-get manager)) ERR-PERMISSION-DENIED)
    ;; Validate the new fee (must be greater than 0)
    (asserts! (> new-fee u0) ERR-INVALID-VALUE)
    ;; Update the reward claim fee to the new value
    (ok (var-set reward-claim-fee new-fee))
  )
)

;; Set the prize expiration cycle count - can only be called by the current manager
(define-public (set-prize-expiration-cycle-count (new-count uint))
  (begin
    ;; Check that the caller is the current manager
    (asserts! (is-eq contract-caller (var-get manager)) ERR-PERMISSION-DENIED)
    ;; Validate the new count (must be greater than 0)
    (asserts! (> new-count u0) ERR-INVALID-VALUE)
    ;; Update the prize expiration cycle count to the new value
    (ok (var-set prize-expiration-cycle-count new-count))
  )
)

;; Set the allocation division - can only be called by the current manager
(define-public (set-allocation-division (current-cycle-percent uint) (treasure-percent uint) (team-fee-percent uint) (referral-reward-percent uint) )
  (begin
    ;; Check that the caller is the current manager
    (asserts! (is-eq contract-caller (var-get manager)) ERR-PERMISSION-DENIED)
    ;; Check that the percentages sum to 100
    (asserts! (is-eq (+ (+ (+ current-cycle-percent treasure-percent) team-fee-percent) referral-reward-percent) u100) ERR-PRECONDITION-FAILED)
    ;; Update the allocation division to the new values
    (ok (var-set allocation-division {
        current-cycle: current-cycle-percent,
        treasure: treasure-percent,
        team-fee: team-fee-percent,
        referral-reward: referral-reward-percent
    }))
  )
)

;; ========================================
;; Read-Only Functions
;; ========================================
(define-read-only (read-random (block uint))
    (buff-to-uint-be (unwrap-panic (as-max-len? (unwrap-panic (slice? (unwrap-panic (get-tenure-info? vrf-seed block)) u16 u32)) u16)))
)

(define-read-only (get-cycle-duration) 
    (var-get cycle-duration)
)

(define-read-only (get-treasure) 
    (var-get treasure)
)

(define-read-only (get-team-fee) 
    (var-get team-fee)
)

(define-read-only (get-treasure-distribution-cycle-count) 
    (var-get treasure-distribution-cycle-count)
)

(define-read-only (get-prize-expiration-cycle-count)
    (var-get prize-expiration-cycle-count)
)

(define-read-only (get-allocation-division) 
    (var-get allocation-division)
)

(define-read-only (get-min-allocation) 
    (var-get min-allocation)
)

(define-read-only (get-reward-claim-fee) 
    (var-get reward-claim-fee)
)

(define-read-only (get-current-cycle-id)
    (/ (- tenure-height START-BLOCK) (var-get cycle-duration))
)

;; Get the block number for a constellation given cycle number
(define-read-only (get-consttellation-block (cycle-id uint)) 
    (- (+ (* (var-get cycle-duration) (+ cycle-id u1)) START-BLOCK) u1)
)

(define-read-only (get-consttellation (cycle-id uint))
    (mod (read-random (get-consttellation-block cycle-id)) TOTAL-CONSTELLATIONS)
)

;; Get the referral reward for a specific user
(define-read-only (get-referral-reward (user principal))
    (default-to
        {
            amount: u0,
            block-update: u0
        }
        (map-get? refferral-reward user))
)

(define-read-only (get-allocated-by-user (cycle-id uint) (user principal))
    (default-to
        {
            constellation-allocation: (list u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0),
            claimed: false
        } 
        (map-get? allocated-by-user { cycle-id: cycle-id, user: user }))
)

(define-read-only (get-cycle (cycle-id uint))
    (default-to
        {
            prize: u0,
            prize-claimed: u0,
            constellation-allocation: (list u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0),
            allocation-claimed: u0
        }
        (map-get? cycle cycle-id))
)

;; ========================================
;; Public Functions
;; ========================================
(define-public (deposit-treaure (amount uint)) 
    (begin 
        ;; Validate amount is greater than 0
        (asserts! (> amount u0) ERR-INVALID-VALUE)
        ;; Transfer tokens from the sender to the contract
        (try! (contract-call? .sbtc-token transfer amount tx-sender (as-contract tx-sender) none))
        ;; Update the treasure amount
        (var-set treasure (+ (var-get treasure) amount))
        (ok true)
    )
)

(define-public (withdraw-treasure (amount uint) (recipient principal))
    (begin
        ;; Check that the caller is the current manager
        (asserts! (is-eq contract-caller (var-get manager)) ERR-PERMISSION-DENIED)
        ;; Validate the amount (must be greater than 0 and less than or equal to available treasure)
        (asserts! (> amount u0) ERR-INVALID-VALUE)
        (let (
            (treasure-avlb (var-get treasure))
        )
            (asserts! (<= amount treasure-avlb) ERR-PRECONDITION-FAILED)
            ;; Transfer tokens from the contract to the recipient
            (try! (as-contract (contract-call? .sbtc-token transfer amount tx-sender recipient none)))
            ;; Update the treasure amount
            (var-set treasure (- treasure-avlb amount))
            (ok true)
        )
    )
)

(define-public (close-contract (amount uint))
    (begin
        ;; Check that the caller is the current manager
        (asserts! (is-eq contract-caller (var-get manager)) ERR-PERMISSION-DENIED)
        ;; Transfer remaining treasure to the manager
        (let (
                (fund-avlb (unwrap-panic (as-contract (contract-call? .sbtc-token get-balance tx-sender ))))
            )
            (asserts! (<= amount fund-avlb) ERR-PRECONDITION-FAILED)
            (try! (as-contract (contract-call? .sbtc-token transfer amount tx-sender (var-get manager) none)))
            (ok true)
        )
    )
)

(define-public (claim-reward (cycle-id uint))
    (begin 
        ;; Check that the cycle is finished
        (asserts! (< cycle-id (get-current-cycle-id)) ERR-PRECONDITION-FAILED)

        (let (
            (user contract-caller)
            (user-allocation (get-allocated-by-user cycle-id user))
            (cycle-data (get-cycle cycle-id))
            (winning-constellation (get-consttellation cycle-id))
            (user-constellation-allocation (unwrap-panic (element-at? (get constellation-allocation user-allocation) winning-constellation)))
            (total-constellation-allocation (unwrap-panic (element-at? (get constellation-allocation cycle-data) winning-constellation)))
            (prize-remained (- (get prize cycle-data) (get prize-claimed cycle-data)))
            (constellation-allocation-remained (- total-constellation-allocation (get allocation-claimed cycle-data)))
            )
            ;; Check that the user hasn't claimed yet
            (asserts! (not (get claimed user-allocation)) ERR-PRECONDITION-FAILED)
            
            ;; Check that the user allocated to the winning constellation
            (asserts! (> user-constellation-allocation u0) ERR-PRECONDITION-FAILED)

            (let (
                    (user-prize (/ (* prize-remained user-constellation-allocation) constellation-allocation-remained))
                    (user-reward (if (> user-prize prize-remained) prize-remained user-prize))
                )

                ;; Update the cycle data
                (map-set cycle cycle-id 
                    (merge cycle-data { 
                        allocation-claimed: (+ (get allocation-claimed cycle-data) user-constellation-allocation),
                        prize-claimed: (+ (get prize-claimed cycle-data) user-reward)
                        }))   

                
                
                (map-set allocated-by-user { cycle-id: cycle-id, user: user } 
                    (merge user-allocation { claimed: true }))

                ;; Transfer the prize to the user
                (try! (as-contract (contract-call? .sbtc-token transfer user-reward tx-sender user none)))

                (ok true)
            )
        )
    )
)

(define-public (claim-expired-prize (cycle-id uint))
    (begin 
        ;; Check that the cycle was more than the defined expiration cycles ago
        (let (
            (current-cycle-id (get-current-cycle-id))
            (expiration-cycles (get-prize-expiration-cycle-count))
        )
            (asserts! (>= (- current-cycle-id cycle-id) expiration-cycles) ERR-PRECONDITION-FAILED)
            
            (let (
                (cycle-data (get-cycle cycle-id))
                (unclaimed-prize (- (get prize cycle-data) (get prize-claimed cycle-data)))
            )
                ;; Check that there's unclaimed prize to recover
                (asserts! (> unclaimed-prize u0) ERR-PRECONDITION-FAILED)
                
                ;; Update the cycle data to mark all prize as claimed
                (map-set cycle cycle-id 
                    (merge cycle-data { 
                        prize-claimed: (get prize cycle-data)
                    }))
                
                ;; Add the unclaimed prize back to the treasure
                (var-set treasure (+ (var-get treasure) unclaimed-prize))
                
                (ok unclaimed-prize)
            )
        )
    )
)

(define-public (allocate (amount uint) (constellation uint) (refferral-user principal))
    (begin 
        (asserts! (>= amount (var-get min-allocation)) ERR-PRECONDITION-FAILED)
        ;; Validate that the constellation index is within bounds
        (asserts! (< constellation TOTAL-CONSTELLATIONS) ERR-INVALID-VALUE)
        ;; Transfer tokens from the sender to the contract
        (try! (contract-call? .sbtc-token transfer amount tx-sender (as-contract tx-sender) none))
        (let
            (
                (current-cycle-id (get-current-cycle-id))
                (current-cycle (get-cycle current-cycle-id))
                (current-allocation-by-user (get-allocated-by-user current-cycle-id tx-sender))
            )

            (map-set cycle current-cycle-id 
                (merge current-cycle {
                    prize: (+ (updated-prize (get prize current-cycle)) (division-allocate amount refferral-user)),
                    constellation-allocation: (update-allocation-constellation amount constellation (get constellation-allocation current-cycle))
                }))
            
            (map-set allocated-by-user { cycle-id: current-cycle-id, user: tx-sender } 
                { 
                    constellation-allocation: (update-allocation-constellation amount constellation (get constellation-allocation current-allocation-by-user)), 
                    claimed: false 
                })
            (ok true)
        )
    )
)

(define-public (claim-referral-reward)
    (let (
        (recipient tx-sender)
        (user-reward (get-referral-reward recipient))
        (reward-amount (get amount user-reward))
        (fee (var-get reward-claim-fee))
        (final-reward-amount (- reward-amount fee))
    )
        ;; Check if there's any reward to claim
        (asserts! (> reward-amount fee) ERR-PRECONDITION-FAILED)
        
        ;; Transfer reward from contract to user (minus the claim fee)
        (try! (as-contract (contract-call? .sbtc-token transfer final-reward-amount tx-sender recipient none)))
        
        ;; Add the fee to the team-fee
        (var-set team-fee (+ (var-get team-fee) fee))
        
        ;; Reset the user's reward to 0
        (map-set refferral-reward recipient {
            amount: u0,
            block-update: stacks-block-height
        })
        
        (ok final-reward-amount)
    )
)

(define-public (claim-user-referral-reward (user principal))
    (begin
        ;; Check that the caller is the current manager
        (asserts! (is-eq contract-caller (var-get manager)) ERR-PERMISSION-DENIED)
        
        (let (
            (user-reward (get-referral-reward user))
            (reward-amount (get amount user-reward))
            (update-block (get block-update user-reward))
            (current-cycle-id (get-current-cycle-id))
            (expiration-cycles (var-get prize-expiration-cycle-count))
            (cycles-since-update (if (> update-block u0)
                                      (/ (- tenure-height update-block) (var-get cycle-duration))
                                      u0))
        )
            ;; Check if there's any reward to claim
            (asserts! (> reward-amount u0) ERR-PRECONDITION-FAILED)
            
            ;; Check if at least the required number of cycles have passed since the last update
            (asserts! (>= cycles-since-update expiration-cycles) ERR-PRECONDITION-FAILED)
            
            ;; Transfer reward from contract to manager
            (try! (as-contract (contract-call? .sbtc-token transfer reward-amount tx-sender (var-get manager) none)))
            
            ;; Reset the user's reward to 0
            (map-set refferral-reward user {
                amount: u0,
                block-update: stacks-block-height
            })
            
            (ok reward-amount)
        )
    )
)

;; ========================================
;; Private Functions
;; ========================================
(define-private (updated-prize (current-prize uint))
    (if (is-eq u0 current-prize)
        (let (
                (current-treasure (get-treasure))
                (prize (/ current-treasure (get-treasure-distribution-cycle-count)))
            )
            (var-set treasure (- current-treasure prize))
            prize
        )
        current-prize
    )
)

(define-private (update-allocation-constellation (amount uint) (constellation uint) (constellation-allocation (list 21 uint)))
    (let (
            (current-constellation-allocation (unwrap-panic (element-at? constellation-allocation constellation)))
            (new-constellation-allocation (unwrap-panic (replace-at? constellation-allocation constellation (+ current-constellation-allocation amount))))
        )
        new-constellation-allocation
    )
)

;; Allocate the amount to the different parts and return the part for current cycle allocation
(define-private (division-allocate (amount uint) (refferral-user principal))
    (let (
            (current-allocation-division (get-allocation-division))
            (current-cycle-allocation (/ (* amount (get current-cycle current-allocation-division)) u100))
            (treasure-allocation (/ (* amount (get treasure current-allocation-division)) u100))
            (referral-reward-allocation (/ (* amount (get referral-reward current-allocation-division)) u100))
            (team-fee-allocation (- (- (- amount current-cycle-allocation) treasure-allocation) referral-reward-allocation))
        )
        ;; Calculate the allocation for each part
        (var-set treasure (+ treasure-allocation (get-treasure)))
        (var-set team-fee (+ team-fee-allocation (get-team-fee)))
        (map-set refferral-reward refferral-user 
            {
                amount: (+ (get amount (get-referral-reward refferral-user)) referral-reward-allocation), 
                block-update: stacks-block-height 
            })
        
        current-cycle-allocation
    )
)
