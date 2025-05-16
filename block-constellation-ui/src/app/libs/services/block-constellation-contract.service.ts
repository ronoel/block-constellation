import { Injectable, inject } from '@angular/core';
import { from, Observable, map } from 'rxjs';
import { TransactionInfoService } from '../components/transaction-info/transaction-info.service';
import { WalletService } from './wallet.service';
import { environment } from '../../../environments/environment';
import {
    Cl,
    PostConditionMode,
    FungiblePostCondition,
    cvToValue,
} from '@stacks/transactions';
import { ContractUtil } from '../contract.util';
import { sBTCTokenService } from './sbtc-token.service';

export interface BlockConstellationResponse {
    txid?: string;
    error?: string | any;
}

export interface CycleData {
    allocationClaimed: number;
}

export interface AllocationData {
    claimed: boolean;
}

export interface ReferralReward {
    amount: number;
    blockUpdate: number;
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
                    return {
                        allocationClaimed: cvToValue(data['allocation-claimed'])
                    };
                }
                return { allocationClaimed: 0 };
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
                if (data) {
                    return {
                        claimed: cvToValue(data['claimed'])
                    };
                }
                return { claimed: false };
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
                        amount: cvToValue(data.value ? data.value.amount : 0),
                        blockUpdate: cvToValue(data.value ? data.value['block-update'] : 0)
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
            map((result: any) => cvToValue(result))
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
            map((result: any) => cvToValue(result))
        );
    }

    /**
     * Public function to claim a reward for a cycle
     * @param cycleId The ID of the cycle to claim reward from
     */
    claimReward(cycleId: number): Observable<BlockConstellationResponse> {
        return from(new Promise<BlockConstellationResponse>((resolve, reject) => {
            this.callPublicFunction(
                'claim-reward',
                [
                    Cl.uint(cycleId)
                ],
                (txid: string) => resolve({ txid }),
                reject,
                [],
                PostConditionMode.Allow
            );
        }));
    }

    /**
     * Public function to allocate tokens to a constellation
     * @param amount The amount of tokens to allocate (in sats)
     * @param constellation The constellation ID (0-24)
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