import {
    cvToJSON,
    trueCV,
    falseCV,
    noneCV,
    someCV,
    intCV,
    uintCV,
    standardPrincipalCV,
    contractPrincipalCV,
    responseErrorCV,
    responseOkCV,
    listCV,
    tupleCV,
    bufferCV,
    AnchorMode, PostConditionMode, stringUtf8CV, Cl, ClarityType, ClarityValue,
    SomeCV, TupleCV, ResponseOkCV, StringAsciiCV, UIntCV,
    bufferCVFromString,
    // makeContractCall,
    ReadOnlyFunctionOptions,
    // ContractCallOptions,
    SignedContractCallOptions,
} from '@stacks/transactions';

/**
 * Utility class for working with Clarity values.
 */
export class ClarityUtil {

    /**
     * Converts a Clarity unsigned integer value to a JavaScript number.
     * 
     * @param clarityValue - The Clarity value to convert.
     * @returns The converted JavaScript number.
     * @throws Error if the Clarity value format is invalid.
     */
    static convertUIntToNumber(clarityValue: string): number {
        if (clarityValue.startsWith("u")) {
            return parseInt(clarityValue.substring(1), 10);
        }
        throw new Error("Invalid Clarity value format");
    }

    /**
     * Extracts the response value from a Clarity response object.
     * 
     * @param result - The Clarity response object.
     * @returns The extracted response value.
     * @throws Error if the contract call did not return a successful response.
     */
    static extractResponse(result: ClarityValue): SomeCV {
        if (result.type === ClarityType.ResponseOk) {
            const responseOkCV = result as ResponseOkCV;
            return responseOkCV.value as SomeCV;
        } else {
            throw new Error('Contract call did not return a successful response');
        }
    }

    static isValidStacksAddress(address: string): boolean {
        // Check if the address is a string and has the right length
        if (typeof address !== 'string' || address.length !== 40) {
            return false;
        }

        // Check if prefix is valid
        const prefix = address.substring(0, 2);
        const validPrefixes = ['SP', 'SM', 'ST', 'SN'];
        if (!validPrefixes.includes(prefix)) {
            return false;
        }

        // Check if the remaining characters are valid Base58
        const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        const addressBody = address.substring(2);
        for (let i = 0; i < addressBody.length; i++) {
            if (!base58Chars.includes(addressBody[i])) {
                return false;
            }
        }

        return true;
    }
}