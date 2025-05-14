;; title: Block Constellation
;; version: 1.0.0
;; summary: Contract for managing blockchain constellations and cycles 
;; description: 
;;   This contract implements a decentralized constellation allocation system where:
;;   - Users allocate funds to one or more of 21 constellations in each cycle
;;   - At the end of a cycle, a winning constellation is determined via randomization
;;   - Users who allocated to the winning constellation receive rewards proportionally
;;   - Unclaimed prizes can be recovered after a defined expiration period
;;   - Referral rewards incentivize network growth
;;
;; The contract enforces timeframes, handles token transfers, calculates rewards,
;; and allows for administrative adjustments of key parameters.

;; ========================================
;; Constants
;; ========================================
;; Error codes
(define-constant ERR-PRECONDITION-FAILED (err u412)) ;; Conditions for operation not met
(define-constant ERR-PRINCIPAL-NOT-FOUND (err u404)) ;; Principal not found in system
(define-constant ERR-PERMISSION-DENIED (err u403))   ;; Caller lacks permission
(define-constant ERR-INVALID-VALUE (err u400))       ;; Input validation failed

;; System constants
(define-constant START-BLOCK tenure-height)          ;; Contract deployment block
(define-constant TOTAL-CONSTELLATIONS u21)           ;; Total number of available constellations

;; ========================================
;; Data Variables
;; ========================================
;; Admin and configuration variables
(define-data-var manager principal tx-sender)                 ;; Contract administrator
(define-data-var blocks-per-cycle uint u144)                  ;; Duration of each cycle (144 bitcoin blocks)
(define-data-var min-allocation uint u1000000)                ;; Minimum allocation amount (1 million satoshis)
(define-data-var treasury-distribution-period uint u3)        ;; Number of cycles for distributing treasury
(define-data-var prize-expiration-period uint u5)             ;; Cycles before unclaimed prizes expire and return to treasury
(define-data-var reward-claim-fee uint u100)                  ;; Fee for claiming referral rewards

;; Financial state variables
(define-data-var treasury uint u0)                            ;; Total treasury accumulated
(define-data-var team-fee uint u0)                            ;; Total team fee accumulated

;; Division configuration
(define-data-var allocation-percentages
    {
        current-cycle: uint,    ;; Percentage allocated to current cycle's prize pool
        treasury: uint,         ;; Percentage allocated to long-term treasury
        team-fee: uint,         ;; Percentage allocated as team fee
        referral-reward: uint   ;; Percentage allocated for referral rewards
    }
    {
        current-cycle: u30,     ;; 30% to current cycle
        treasury: u40,          ;; 40% to treasury
        team-fee: u25,          ;; 25% to team
        referral-reward: u5     ;; 5% to referrals
    }
)

;; ========================================
;; Maps
;; ========================================
;; Tracks prize pool and allocation data for each cycle
(define-map cycle uint 
    {
        prize: uint,                          ;; Total prize for this cycle
        prize-claimed: uint,                  ;; Amount of prize already claimed
        constellation-allocation: (list 21 uint), ;; Allocation to each constellation (21 constellations)
        allocation-claimed: uint              ;; Amount of allocation claimed by users
    })

;; Tracks each user's allocation across constellations for each cycle
(define-map allocated-by-user
    {
        cycle-id: uint,    ;; ID of the cycle
        user: principal    ;; User principal address
    }
    {
        constellation-allocation: (list 21 uint), ;; User's allocation to each constellation
        claimed: bool      ;; Whether user has claimed their reward
    })

;; Tracks referral rewards for users
(define-map referral-reward principal
    {
        amount: uint,      ;; Amount of reward accumulated
        block-update: uint ;; Block number when the reward was last updated
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
(define-public (set-blocks-per-cycle (new-duration uint))
  (begin
    ;; Check that the caller is the current manager
    (asserts! (is-eq contract-caller (var-get manager)) ERR-PERMISSION-DENIED)
    ;; Validate the new duration (must be greater than 0)
    (asserts! (> new-duration u0) ERR-INVALID-VALUE)
    ;; Update the cycle duration to the new value
    (ok (var-set blocks-per-cycle new-duration))
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

;; Set the treasury distribution period - can only be called by the current manager
(define-public (set-treasury-distribution-period (new-count uint))
  (begin
    ;; Check that the caller is the current manager
    (asserts! (is-eq contract-caller (var-get manager)) ERR-PERMISSION-DENIED)
    ;; Validate the new count (must be greater than 0)
    (asserts! (> new-count u0) ERR-INVALID-VALUE)
    ;; Update the treasury distribution period to the new value
    (ok (var-set treasury-distribution-period new-count))
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

;; Set the prize expiration period - can only be called by the current manager
(define-public (set-prize-expiration-period (new-count uint))
  (begin
    ;; Check that the caller is the current manager
    (asserts! (is-eq contract-caller (var-get manager)) ERR-PERMISSION-DENIED)
    ;; Validate the new count (must be greater than 0)
    (asserts! (> new-count u0) ERR-INVALID-VALUE)
    ;; Update the prize expiration period to the new value
    (ok (var-set prize-expiration-period new-count))
  )
)

;; Set the allocation division - can only be called by the current manager
(define-public (set-allocation-percentages (current-cycle-percent uint) (treasury-percent uint) (team-fee-percent uint) (referral-reward-percent uint) )
  (begin
    ;; Check that the caller is the current manager
    (asserts! (is-eq contract-caller (var-get manager)) ERR-PERMISSION-DENIED)
    ;; Check that the percentages sum to 100
    (asserts! (is-eq (+ (+ (+ current-cycle-percent treasury-percent) team-fee-percent) referral-reward-percent) u100) ERR-PRECONDITION-FAILED)
    ;; Update the allocation percentages to the new values
    (ok (var-set allocation-percentages {
        current-cycle: current-cycle-percent,
        treasury: treasury-percent,
        team-fee: team-fee-percent,
        referral-reward: referral-reward-percent
    }))
  )
)

;; ========================================
;; Read-Only Functions
;; ========================================
(define-read-only (get-random-number-from-block (block uint))
    (buff-to-uint-be (unwrap-panic (as-max-len? (unwrap-panic (slice? (unwrap-panic (get-tenure-info? vrf-seed block)) u16 u32)) u16)))
)

(define-read-only (get-blocks-per-cycle) 
    (var-get blocks-per-cycle)
)

(define-read-only (get-treasury) 
    (var-get treasury)
)

(define-read-only (get-team-fee) 
    (var-get team-fee)
)

(define-read-only (get-treasury-distribution-period) 
    (var-get treasury-distribution-period)
)

(define-read-only (get-prize-expiration-period)
    (var-get prize-expiration-period)
)

(define-read-only (get-allocation-percentages) 
    (var-get allocation-percentages)
)

(define-read-only (get-min-allocation) 
    (var-get min-allocation)
)

(define-read-only (get-reward-claim-fee) 
    (var-get reward-claim-fee)
)

(define-read-only (get-current-cycle-id)
    (/ (- tenure-height START-BLOCK) (var-get blocks-per-cycle))
)

;; Get the block number for a constellation given cycle number
(define-read-only (get-constellation-block (cycle-id uint)) 
    (- (+ (* (var-get blocks-per-cycle) (+ cycle-id u1)) START-BLOCK) u1)
)

(define-read-only (get-constellation (cycle-id uint))
    (mod (get-random-number-from-block (get-constellation-block cycle-id)) TOTAL-CONSTELLATIONS)
)

;; Get the referral reward for a specific user
(define-read-only (get-referral-reward (user principal))
    (default-to
        {
            amount: u0,
            block-update: u0
        }
        (map-get? referral-reward user))
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
(define-public (deposit-treasury (amount uint)) 
    (begin 
        ;; Validate amount is greater than 0
        (asserts! (> amount u0) ERR-INVALID-VALUE)
        ;; Transfer tokens from the sender to the contract
        (try! (contract-call? .sbtc-token transfer amount tx-sender (as-contract tx-sender) none))
        ;; Update the treasury amount
        (var-set treasury (+ (var-get treasury) amount))
        (ok true)
    )
)

(define-public (withdraw-treasury (amount uint) (recipient principal))
    (begin
        ;; Check that the caller is the current manager
        (asserts! (is-eq contract-caller (var-get manager)) ERR-PERMISSION-DENIED)
        ;; Validate the amount (must be greater than 0 and less than or equal to available treasury)
        (asserts! (> amount u0) ERR-INVALID-VALUE)
        (let (
            (treasury-available (var-get treasury))
        )
            (asserts! (<= amount treasury-available) ERR-PRECONDITION-FAILED)
            ;; Transfer tokens from the contract to the recipient
            (try! (as-contract (contract-call? .sbtc-token transfer amount tx-sender recipient none)))
            ;; Update the treasury amount
            (var-set treasury (- treasury-available amount))
            (ok true)
        )
    )
)

(define-public (withdraw-contract-funds (amount uint))
    (begin
        ;; Check that the caller is the current manager
        (asserts! (is-eq contract-caller (var-get manager)) ERR-PERMISSION-DENIED)
        ;; Transfer remaining funds to the manager
        (let (
                (fund-available (unwrap-panic (as-contract (contract-call? .sbtc-token get-balance tx-sender ))))
            )
            (asserts! (<= amount fund-available) ERR-PRECONDITION-FAILED)
            (try! (as-contract (contract-call? .sbtc-token transfer amount tx-sender (var-get manager) none)))
            (ok true)
        )
    )
)

(define-public (claim-reward (cycle-id uint))
    (begin 
        ;; Check that the cycle is finished - users can only claim rewards after a cycle completes
        (asserts! (< cycle-id (get-current-cycle-id)) ERR-PRECONDITION-FAILED)

        (let (
            (user contract-caller)
            (user-allocation (get-allocated-by-user cycle-id user))
            (cycle-data (get-cycle cycle-id))
            (winning-constellation (get-constellation cycle-id))
            (user-constellation-allocation (unwrap-panic (element-at? (get constellation-allocation user-allocation) winning-constellation)))
            (total-constellation-allocation (unwrap-panic (element-at? (get constellation-allocation cycle-data) winning-constellation)))
            (prize-remained (- (get prize cycle-data) (get prize-claimed cycle-data)))
            (constellation-allocation-remained (- total-constellation-allocation (get allocation-claimed cycle-data)))
            )
            ;; Check that the user hasn't claimed yet - prevent double-claiming
            (asserts! (not (get claimed user-allocation)) ERR-PRECONDITION-FAILED)
            
            ;; Check that the user allocated to the winning constellation - must have skin in the game
            (asserts! (> user-constellation-allocation u0) ERR-PRECONDITION-FAILED)

            (let (
                    ;; Calculate user's proportional share of the prize pool
                    (user-prize (/ (* prize-remained user-constellation-allocation) constellation-allocation-remained))
                    ;; Safety check to ensure we don't exceed available prize
                    (user-reward (if (> user-prize prize-remained) prize-remained user-prize))
                )

                ;; Update the cycle data to reflect this claim
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

(define-public (recover-expired-prizes (cycle-id uint))
    (begin 
        ;; This function allows recovering unclaimed prizes after the expiration period
        ;; Recovered prizes are returned to the treasury for future distribution
        (let (
            (current-cycle-id (get-current-cycle-id))
            (expiration-period (get-prize-expiration-period))
        )
            ;; Ensure the expiration period has passed (configurable via prize-expiration-period)
            (asserts! (>= (- current-cycle-id cycle-id) expiration-period) ERR-PRECONDITION-FAILED)
            
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
                
                ;; Add the unclaimed prize back to the treasury
                (var-set treasury (+ (var-get treasury) unclaimed-prize))
                
                (ok unclaimed-prize)
            )
        )
    )
)

(define-public (allocate (amount uint) (constellation uint) (referral-user principal))
    (begin 
        ;; This is the core function for users to participate in a cycle
        ;; It allows allocation of funds to a constellation, with a portion going to referrals
        
        ;; Ensure minimum allocation requirement is met
        (asserts! (>= amount (var-get min-allocation)) ERR-PRECONDITION-FAILED)
        
        ;; Validate that the constellation index is within bounds (0-20)
        (asserts! (< constellation TOTAL-CONSTELLATIONS) ERR-INVALID-VALUE)
        
        ;; Transfer tokens from the sender to the contract
        (try! (contract-call? .sbtc-token transfer amount tx-sender (as-contract tx-sender) none))
        
        (let
            (
                (current-cycle-id (get-current-cycle-id))
                (current-cycle (get-cycle current-cycle-id))
                (current-allocation-by-user (get-allocated-by-user current-cycle-id tx-sender))
            )
            ;; Update the cycle map with new allocation data
            ;; distribute-allocation splits the amount according to allocation-percentages
            (map-set cycle current-cycle-id 
                (merge current-cycle {
                    prize: (+ (calculate-prize-with-treasury-addition (get prize current-cycle)) (distribute-allocation amount referral-user)),
                    constellation-allocation: (update-constellation-allocation amount constellation (get constellation-allocation current-cycle))
                }))
            
            ;; Update the user's allocation record
            (map-set allocated-by-user { cycle-id: current-cycle-id, user: tx-sender } 
                { 
                    constellation-allocation: (update-constellation-allocation amount constellation (get constellation-allocation current-allocation-by-user)), 
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
        (map-set referral-reward recipient {
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
            (expiration-period (var-get prize-expiration-period))
            (cycles-since-update (if (> update-block u0)
                                      (/ (- tenure-height update-block) (var-get blocks-per-cycle))
                                      u0))
        )
            ;; Check if there's any reward to claim
            (asserts! (> reward-amount u0) ERR-PRECONDITION-FAILED)
            
            ;; Check if at least the required number of cycles have passed since the last update
            (asserts! (>= cycles-since-update expiration-period) ERR-PRECONDITION-FAILED)
            
            ;; Transfer reward from contract to manager
            (try! (as-contract (contract-call? .sbtc-token transfer reward-amount tx-sender (var-get manager) none)))
            
            ;; Reset the user's reward to 0
            (map-set referral-reward user {
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
(define-private (calculate-prize-with-treasury-addition (current-prize uint))
    ;; If this is the first allocation for this cycle, seed the prize pool from treasury
    ;; Otherwise, return the existing prize amount
    (if (is-eq u0 current-prize)
        (let (
                (current-treasury (get-treasury))
                ;; Calculate prize based on treasury-distribution-period (e.g., 1/3 of treasury)
                (prize (/ current-treasury (get-treasury-distribution-period)))
            )
            ;; Update the treasury by removing the allocated prize
            (var-set treasury (- current-treasury prize))
            prize
        )
        current-prize
    )
)

(define-private (update-constellation-allocation (amount uint) (constellation uint) (constellation-allocation (list 21 uint)))
    ;; Updates the allocation amount for a specific constellation in the list
    (let (
            ;; Get the current allocation for this constellation
            (current-constellation-allocation (unwrap-panic (element-at? constellation-allocation constellation)))
            ;; Create a new list with updated amount at the specified constellation index
            (new-constellation-allocation (unwrap-panic (replace-at? constellation-allocation constellation (+ current-constellation-allocation amount))))
        )
        new-constellation-allocation
    )
)

;; Allocate the amount to the different parts and return the part for current cycle allocation
(define-private (distribute-allocation (amount uint) (referral-user principal))
    ;; This function divides an allocation amount according to the configured percentages
    ;; and updates the relevant accumulators (treasury, team fee, referral rewards)
    (let (
            (current-allocation-percentages (get-allocation-percentages))
            ;; Calculate the portion for each category based on percentage settings
            (current-cycle-allocation (/ (* amount (get current-cycle current-allocation-percentages)) u100))
            (treasury-allocation (/ (* amount (get treasury current-allocation-percentages)) u100))
            (referral-reward-allocation (/ (* amount (get referral-reward current-allocation-percentages)) u100))
            ;; The remainder goes to team fee
            (team-fee-allocation (- (- (- amount current-cycle-allocation) treasury-allocation) referral-reward-allocation))
        )
        ;; Update treasury with its portion
        (var-set treasury (+ treasury-allocation (get-treasury)))
        ;; Update team fee with its portion
        (var-set team-fee (+ team-fee-allocation (get-team-fee)))
        ;; Update referral reward for the specified user
        (map-set referral-reward referral-user 
            {
                amount: (+ (get amount (get-referral-reward referral-user)) referral-reward-allocation), 
                block-update: stacks-block-height 
            })
        
        ;; Return the portion allocated to the current cycle's prize pool
        current-cycle-allocation
    )
)
