import { Injectable, inject } from '@angular/core';
import { from, Observable, map } from 'rxjs';
import { TransactionInfoService } from './components/transaction-info/transaction-info.service';
import { WalletService } from './wallet.service';
import { environment } from '../../environments/environment';
import {
    Cl,
    PostConditionMode,
    FungiblePostCondition,
    cvToValue,
} from '@stacks/transactions';
import { ContractUtil } from './contract.util';
import { sBTCTokenService } from './sbtc-token.service';

export interface BlockConstellationResponse {
    txid?: string;
    error?: string | any;
}

export interface CycleData {
    allocationClaimed: number;
    'allocation-claimed'?: number;  // Adding hyphenated version of property
    prize: number;
    'prize-claimed'?: number;       // Adding hyphenated version for prize claimed
    constellationAllocation: number[];
    'constellation-allocation'?: any; // For the nested structure from contract
}

export interface AllocationData {
    claimed: boolean;
    constellationAllocation?: number[];
}

export interface ReferralReward {
    amount: number;
    blockUpdate: number;
}

// New interfaces for cycle user status responses
export interface CycleUserStatus {
    cyclePrize: number;
    cyclePrizeClaimed: number;
    cycleConstellationAllocation: number[];
    cycleAllocationClaimed: number;
    cycleWinningConstellation: number;
    cycleEndBlock: number;
    userConstellationAllocation: number[];
    userClaimed: boolean;
    blockchainStacksHeight: number;
    blockchainTenureHeight: number;
}

export interface CurrentCycleUserStatus extends Omit<CycleUserStatus, 'cycleWinningConstellation'> {
    cycleId: number;
}

// New interface for current cycle data (without user-specific info)
export interface CurrentCycleData {
    cycleId: number;
    cyclePrize: number;
    cyclePrizeClaimed: number;
    cycleConstellationAllocation: number[];
    cycleAllocationClaimed: number;
    cycleEndBlock: number;
    blockchainStacksHeight: number;
    blockchainTenureHeight: number;
}

// Interface for cycle status data (includes winning constellation for completed cycles)
export interface CycleStatus {
    cycleId: number;
    cyclePrize: number;
    cyclePrizeClaimed: number;
    cycleConstellationAllocation: number[];
    cycleAllocationClaimed: number;
    cycleWinningConstellation: number;
    cycleEndBlock: number;
    blockchainStacksHeight: number;
    blockchainTenureHeight: number;
}

@Injectable({
    providedIn: 'root'
})
export class BlockConstellationContractService extends ContractUtil {

    private sbtcTokenService = inject(sBTCTokenService);

    constructor(
        walletService: WalletService,
        transactionInfoService: TransactionInfoService
    ) {
        super(
            environment.gameContract.contractName,
            environment.gameContract.contractAddress,
            walletService,
            transactionInfoService
        );
    }

    getContractAddress(): `${string}.${string}` {
        return `${this.contractAddress}.${this.contractName}`;
    }

    getFee(): number {
        return environment.supportedAsset.sBTC.fee;
    }

    /**
     * Read-only function to get cycle data
     * @param cycleId The ID of the cycle to retrieve data for
     */
    getCycle(cycleId: number): Observable<CycleData> {
        return from(this.callReadOnlyFunction(
            'get-cycle',
            [
                Cl.uint(cycleId)
            ]
        )).pipe(
            map((result: any) => {
                const data = cvToValue(result);
                console.log('Cycle data:', data);
                if (data) {
                    // Extract constellation allocation array
                    let constellationAllocation: number[] = [];
                    if (data['constellation-allocation'] && data['constellation-allocation'].value) {
                        // Extract the array from the nested structure
                        constellationAllocation = data['constellation-allocation'].value.map((allocation: any) => {
                            return parseInt(allocation.value) || 0;
                        });
                    }
                    
                    return {
                        allocationClaimed: cvToValue(data['allocation-claimed']) || 0,
                        'allocation-claimed': cvToValue(data['allocation-claimed']) || 0,
                        prize: cvToValue(data['prize']) || 0,
                        'prize-claimed': cvToValue(data['prize-claimed']) || 0,
                        constellationAllocation: constellationAllocation,
                        'constellation-allocation': data['constellation-allocation']
                    };
                }
                return { allocationClaimed: 0, prize: 0, constellationAllocation: [] };
            })
        );
    }

    /**
     * Read-only function to get user allocation data
     * @param cycleId The ID of the cycle
     * @param userAddress The user's principal address
     */
    getAllocatedByUser(cycleId: number, userAddress: string): Observable<AllocationData> {
        return from(this.callReadOnlyFunction(
            'get-allocated-by-user',
            [
                Cl.uint(cycleId),
                Cl.principal(userAddress)
            ]
        )).pipe(
            map((result: any) => {
                const data = cvToValue(result);
                console.log('User allocation data:', data);
                if (data) {
                    // Extract constellation allocation with proper nested structure
                    let constellationAllocation: number[] = [];
                    if (data['constellation-allocation'] && data['constellation-allocation'].value) {
                        constellationAllocation = data['constellation-allocation'].value.map((allocation: any) => {
                            return parseInt(allocation.value) || 0;
                        });
                    }
                    
                    // Safely extract the claimed status, handling both direct boolean and object with value property
                    let claimedStatus = false;
                    if (data['claimed']) {
                        if (typeof data['claimed'] === 'boolean') {
                            claimedStatus = data['claimed'];
                        } else if (data['claimed'].value !== undefined) {
                            claimedStatus = data['claimed'].value === true;
                        }
                    }
                    
                    return {
                        claimed: claimedStatus,
                        constellationAllocation: constellationAllocation
                    };
                }
                return { claimed: false, constellationAllocation: [] };
            })
        );
    }

    /**
     * Read-only function to get referral reward data
     * @param userAddress The user's principal address
     */
    getReferralReward(userAddress: string): Observable<ReferralReward> {
        return from(this.callReadOnlyFunction(
            'get-referral-reward',
            [
                Cl.principal(userAddress)
            ]
        )).pipe(
            map((result: any) => {
                const data = cvToValue(result);
                if (data) {
                    return {
                        amount: cvToValue(data.value ? data.value.amount : 0) || 0,
                        blockUpdate: cvToValue(data.value ? data.value['block-update'] : 0) || 0
                    };
                }
                return { amount: 0, blockUpdate: 0 };
            })
        );
    }

    /**
     * Read-only function to get the winning constellation for a cycle
     * @param cycleId The ID of the cycle
     */
    getConstellation(cycleId: number): Observable<number> {
        return from(this.callReadOnlyFunction(
            'get-constellation',
            [
                Cl.uint(cycleId)
            ]
        )).pipe(
            map((result: any) => cvToValue(result) || 0)
        );
    }

    /**
     * Read-only function to get cycle status data without user-specific information
     * @param cycleId The ID of the cycle
     */
    getCycleStatus(cycleId: number): Observable<CycleStatus> {
        return from(this.callReadOnlyFunction(
            'get-cycle-status',
            [
                Cl.uint(cycleId)
            ]
        )).pipe(
            map((result: any) => {
                const data = cvToValue(result);
                console.log('Cycle status data:', data);
                
                if (data && data.value) {
                    // Extract constellation allocation array
                    let cycleConstellationAllocation: number[] = [];
                    if (data.value['cycle-constellation-allocation'] && data.value['cycle-constellation-allocation'].value) {
                        cycleConstellationAllocation = data.value['cycle-constellation-allocation'].value.map((allocation: any) => {
                            return parseInt(allocation.value) || 0;
                        });
                    }
                    
                    return {
                        cycleId: parseInt(data.value['cycle-id']?.value) || 0,
                        cyclePrize: parseInt(data.value['cycle-prize']?.value) || 0,
                        cyclePrizeClaimed: parseInt(data.value['cycle-prize-claimed']?.value) || 0,
                        cycleConstellationAllocation: cycleConstellationAllocation,
                        cycleAllocationClaimed: parseInt(data.value['cycle-allocation-claimed']?.value) || 0,
                        cycleWinningConstellation: parseInt(data.value['cycle-winning-constellation']?.value) || 0,
                        cycleEndBlock: parseInt(data.value['cycle-end-block']?.value) || 0,
                        blockchainStacksHeight: parseInt(data.value['blockchain-stacks-height']?.value) || 0,
                        blockchainTenureHeight: parseInt(data.value['blockchain-tenure-height']?.value) || 0
                    };
                }
                
                return {
                    cycleId: 0,
                    cyclePrize: 0,
                    cyclePrizeClaimed: 0,
                    cycleConstellationAllocation: [],
                    cycleAllocationClaimed: 0,
                    cycleWinningConstellation: 0,
                    cycleEndBlock: 0,
                    blockchainStacksHeight: 0,
                    blockchainTenureHeight: 0
                };
            })
        );
    }

    /**
     * Read-only function to get cycle user status data
     * @param cycleId The ID of the cycle
     * @param userAddress The user's principal address
     */
    getCycleUserStatus(cycleId: number, userAddress: string): Observable<CycleUserStatus> {
        return from(this.callReadOnlyFunction(
            'get-cycle-user-status',
            [
                Cl.uint(cycleId),
                Cl.principal(userAddress)
            ]
        )).pipe(
            map((result: any) => {
                const data = cvToValue(result);
                console.log('Cycle user status data:', data);
                
                if (data && data.value) {
                    // Extract constellation allocation array from both cycle and user
                    let cycleConstellationAllocation: number[] = [];
                    if (data.value['cycle-constellation-allocation'] && data.value['cycle-constellation-allocation'].value) {
                        cycleConstellationAllocation = data.value['cycle-constellation-allocation'].value.map((allocation: any) => {
                            return parseInt(allocation.value) || 0;
                        });
                    }
                    
                    let userConstellationAllocation: number[] = [];
                    if (data.value['user-constellation-allocation'] && data.value['user-constellation-allocation'].value) {
                        userConstellationAllocation = data.value['user-constellation-allocation'].value.map((allocation: any) => {
                            return parseInt(allocation.value) || 0;
                        });
                    }
                    
                    return {
                        cyclePrize: parseInt(data.value['cycle-prize']?.value) || 0,
                        cyclePrizeClaimed: parseInt(data.value['cycle-prize-claimed']?.value) || 0,
                        cycleConstellationAllocation: cycleConstellationAllocation,
                        cycleAllocationClaimed: parseInt(data.value['cycle-allocation-claimed']?.value) || 0,
                        cycleWinningConstellation: parseInt(data.value['cycle-winning-constellation']?.value) || 0,
                        cycleEndBlock: parseInt(data.value['cycle-end-block']?.value) || 0,
                        userConstellationAllocation: userConstellationAllocation,
                        userClaimed: data.value['user-claimed'] === true || false,
                        blockchainStacksHeight: parseInt(data.value['blockchain-stacks-height']?.value) || 0,
                        blockchainTenureHeight: parseInt(data.value['blockchain-tenure-height']?.value) || 0
                    };
                }
                
                return {
                    cyclePrize: 0,
                    cyclePrizeClaimed: 0,
                    cycleConstellationAllocation: [],
                    cycleAllocationClaimed: 0,
                    cycleWinningConstellation: 0,
                    cycleEndBlock: 0,
                    userConstellationAllocation: [],
                    userClaimed: false,
                    blockchainStacksHeight: 0,
                    blockchainTenureHeight: 0
                };
            })
        );
    }

    /**
     * Read-only function to get current cycle user status data
     * @param userAddress The user's principal address
     */
    getCurrentCycleUserStatus(userAddress: string): Observable<CurrentCycleUserStatus> {
        return from(this.callReadOnlyFunction(
            'get-current-cycle-user-status',
            [
                Cl.principal(userAddress)
            ]
        )).pipe(
            map((result: any) => {
                const data = cvToValue(result);
                console.log('Current cycle user status data:', data);
                
                if (data && data.value) {
                    // Extract constellation allocation array from both cycle and user
                    let cycleConstellationAllocation: number[] = [];
                    if (data.value['cycle-constellation-allocation'] && data.value['cycle-constellation-allocation'].value) {
                        cycleConstellationAllocation = data.value['cycle-constellation-allocation'].value.map((allocation: any) => {
                            return parseInt(allocation.value) || 0;
                        });
                    }
                    
                    let userConstellationAllocation: number[] = [];
                    if (data.value['user-constellation-allocation'] && data.value['user-constellation-allocation'].value) {
                        userConstellationAllocation = data.value['user-constellation-allocation'].value.map((allocation: any) => {
                            return parseInt(allocation.value) || 0;
                        });
                    }
                    
                    return {
                        cycleId: parseInt(data.value['cycle-id']?.value) || 0,
                        cyclePrize: parseInt(data.value['cycle-prize']?.value) || 0,
                        cyclePrizeClaimed: parseInt(data.value['cycle-prize-claimed']?.value) || 0,
                        cycleConstellationAllocation: cycleConstellationAllocation,
                        cycleAllocationClaimed: parseInt(data.value['cycle-allocation-claimed']?.value) || 0,
                        cycleEndBlock: parseInt(data.value['cycle-end-block']?.value) || 0,
                        userConstellationAllocation: userConstellationAllocation,
                        userClaimed: data.value['user-claimed'] === true || false,
                        blockchainStacksHeight: parseInt(data.value['blockchain-stacks-height']?.value) || 0,
                        blockchainTenureHeight: parseInt(data.value['blockchain-tenure-height']?.value) || 0
                    };
                }
                
                return {
                    cycleId: 0,
                    cyclePrize: 0,
                    cyclePrizeClaimed: 0,
                    cycleConstellationAllocation: [],
                    cycleAllocationClaimed: 0,
                    cycleEndBlock: 0,
                    userConstellationAllocation: [],
                    userClaimed: false,
                    blockchainStacksHeight: 0,
                    blockchainTenureHeight: 0
                };
            })
        );
    }

    /**
     * Read-only function to get current cycle data without user-specific information
     */
    getCurrentCycle(): Observable<CurrentCycleData> {
        return from(this.callReadOnlyFunction(
            'get-current-cycle',
            []
        )).pipe(
            map((result: any) => {
                const data = cvToValue(result);
                console.log('Current cycle data:', data);
                
                if (data && data.value) {
                    // Extract constellation allocation array
                    let cycleConstellationAllocation: number[] = [];
                    if (data.value['cycle-constellation-allocation'] && data.value['cycle-constellation-allocation'].value) {
                        cycleConstellationAllocation = data.value['cycle-constellation-allocation'].value.map((allocation: any) => {
                            return parseInt(allocation.value) || 0;
                        });
                    }
                    
                    return {
                        cycleId: parseInt(data.value['cycle-id']?.value) || 0,
                        cyclePrize: parseInt(data.value['cycle-prize']?.value) || 0,
                        cyclePrizeClaimed: parseInt(data.value['cycle-prize-claimed']?.value) || 0,
                        cycleConstellationAllocation: cycleConstellationAllocation,
                        cycleAllocationClaimed: parseInt(data.value['cycle-allocation-claimed']?.value) || 0,
                        cycleEndBlock: parseInt(data.value['cycle-end-block']?.value) || 0,
                        blockchainStacksHeight: parseInt(data.value['blockchain-stacks-height']?.value) || 0,
                        blockchainTenureHeight: parseInt(data.value['blockchain-tenure-height']?.value) || 0
                    };
                }
                
                return {
                    cycleId: 0,
                    cyclePrize: 0,
                    cyclePrizeClaimed: 0,
                    cycleConstellationAllocation: [],
                    cycleAllocationClaimed: 0,
                    cycleEndBlock: 0,
                    blockchainStacksHeight: 0,
                    blockchainTenureHeight: 0
                };
            })
        );
    }

    /**
     * Read-only function to get the current cycle ID
     */
    getCurrentCycleId(): Observable<number> {
        return from(this.callReadOnlyFunction(
            'get-current-cycle-id',
            []
        )).pipe(
            map((result: any) => {
                const data = cvToValue(result);
                return data ? parseInt(data) : 0;
            })
        );
    }

    /**
     * Public function to claim a reward for a cycle
     * @param cycleId The ID of the cycle to claim reward from
     */
    claimReward(cycleId: number): Observable<BlockConstellationResponse> {

        const ftPostCondition: FungiblePostCondition = {
            type: 'ft-postcondition',
            address: this.getContractAddress(),
            condition: 'gt',
            amount: 0,
            asset: this.sbtcTokenService.getAsset()
        };

        return from(new Promise<BlockConstellationResponse>((resolve, reject) => {
            this.callPublicFunction(
                'claim-reward',
                [
                    Cl.uint(cycleId)
                ],
                (txid: string) => resolve({ txid }),
                reject,
                [ftPostCondition],
                PostConditionMode.Deny
            );
        }));
    }

    /**
     * Public function to allocate tokens to a constellation
     * @param amount The amount of tokens to allocate (in sats)
     * @param constellation The constellation ID (0-23)
     * @param referralUser The optional referral user address
     */
    allocate(amount: number, constellation: number, referralUser?: string): Observable<BlockConstellationResponse> {
        const referralPrincipal = referralUser ? 
            Cl.principal(referralUser) :
            Cl.principal(this.walletService.getSTXAddress());

        const ftPostCondition: FungiblePostCondition = {
            type: 'ft-postcondition',
            address: this.walletService.getSTXAddress(),
            condition: 'eq',
            amount: amount,
            asset: this.sbtcTokenService.getAsset()
        };

        return from(new Promise<BlockConstellationResponse>((resolve, reject) => {
            this.callPublicFunction(
                'allocate',
                [
                    Cl.uint(amount),
                    Cl.uint(constellation),
                    referralPrincipal
                ],
                (txid: string) => resolve({ txid }),
                reject,
                [ftPostCondition],
                PostConditionMode.Deny
            );
        }));
    }

    /**
     * Public function to claim referral rewards
     */
    claimReferralReward(): Observable<BlockConstellationResponse> {
        return from(new Promise<BlockConstellationResponse>((resolve, reject) => {
            this.callPublicFunction(
                'claim-referral-reward',
                [],
                (txid: string) => resolve({ txid }),
                reject,
                [],
                PostConditionMode.Allow
            );
        }));
    }
}
