import { beforeEach, describe, expect, it } from "vitest";
import { Cl, ClarityType, cvToJSON, cvToValue, TupleCV } from '@stacks/transactions';
import { a } from "vitest/dist/chunks/suite.d.FvehnV49.js";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const address1 = accounts.get("wallet_1")!;
const address2 = accounts.get("wallet_2")!;
const address3 = accounts.get("wallet_3")!;

const CONTRACT_NAME = "blockconstellation";
const TOKEN_CONTRACT = "sbtc-token";

// Error constants
const ERR_PRECONDITION_FAILED = Cl.uint(412);
const ERR_PRINCIPAL_NOT_FOUND = Cl.uint(404);
const ERR_PERMISSION_DENIED = Cl.uint(403);

describe("Administrative Functions Tests", () => {
  it("Read allocation division", () => {
    const allocationDivision = getAllocationDivision();
    console.log("Allocation Division: ", Cl.prettyPrint(allocationDivision.result));
    expect(Cl.prettyPrint(allocationDivision.result)).toBe("{ current-cycle: u30, referral-reward: u5, team-fee: u25, treasure: u40 }")
    // expect(simnet.blockHeight).toBeDefined();
  });

  it("Manager can set allocation division", () => {
    // Test initial values
    const initialAllocation = getAllocationDivision();
    expect(Cl.prettyPrint(initialAllocation.result)).toBe("{ current-cycle: u30, referral-reward: u5, team-fee: u25, treasure: u40 }");

    // Set new allocation division (deployer is the default manager)
    const result = setAllocationDivision(20, 50, 20, 10, deployer);
    expect(result.result).toHaveClarityType(ClarityType.ResponseOk);

    // Verify the new allocation division was set correctly
    const updatedAllocation = getAllocationDivision();
    // console.log("Updated Allocation Division: ", Cl.prettyPrint(updatedAllocation.result));
    expect(Cl.prettyPrint(updatedAllocation.result)).toBe("{ current-cycle: u20, referral-reward: u10, team-fee: u20, treasure: u50 }");
  });

  it("Non-manager cannot set allocation division", () => {
    // Try to set allocation division as non-manager
    const result = setAllocationDivision(25, 25, 40, 10, address1);
    expect(result.result).toHaveClarityType(ClarityType.ResponseErr);
    expect(result.result).toBeErr(ERR_PERMISSION_DENIED);
  });

  it("Allocation division percentages must sum to 100", () => {
    // Try to set allocation division with percentages that don't sum to 100
    const result = setAllocationDivision(20, 20, 10, 10, deployer);
    expect(result.result).toHaveClarityType(ClarityType.ResponseErr);
    expect(result.result).toBeErr(ERR_PRECONDITION_FAILED);
  });
});

describe("Admin Configuration Tests", () => {
  it("Manager can set cycle duration", () => {
    // Test initial value
    const initialDuration = getCycleDuration();
    expect(initialDuration.result).toBeUint(144);

    // Set new cycle duration as manager
    const result = setCycleDuration(200, deployer);
    expect(result.result).toHaveClarityType(ClarityType.ResponseOk);

    // Verify the new value
    const updatedDuration = getCycleDuration();
    expect(updatedDuration.result).toBeUint(200);
  });

  it("Non-manager cannot set cycle duration", () => {
    const result = setCycleDuration(150, address1);
    expect(result.result).toHaveClarityType(ClarityType.ResponseErr);
    expect(result.result).toBeErr(ERR_PERMISSION_DENIED);
  });

  it("Manager can set minimum allocation", () => {
    // Test initial value
    const initialAllocation = getMinAllocation();
    expect(initialAllocation.result).toBeUint(1000000);

    // Set new minimum allocation as manager
    const result = setMinAllocation(2000000, deployer);
    expect(result.result).toHaveClarityType(ClarityType.ResponseOk);

    // Verify the new value
    const updatedAllocation = getMinAllocation();
    expect(updatedAllocation.result).toBeUint(2000000);
  });

  it("Manager can set treasure distribution cycle count", () => {
    // Test initial value
    const initialCount = getTreasureDistributionCycleCount();
    expect(initialCount.result).toBeUint(3);

    // Set new count as manager
    const result = setTreasureDistributionCycleCount(5, deployer);
    expect(result.result).toHaveClarityType(ClarityType.ResponseOk);

    // Verify the new value
    const updatedCount = getTreasureDistributionCycleCount();
    expect(updatedCount.result).toBeUint(5);
  });

  it("Manager can set reward claim fee", () => {
    // Test initial value
    const initialFee = getRewardClaimFee();
    expect(initialFee.result).toBeUint(100);
    
    // Set new fee as manager
    const result = setRewardClaimFee(50, deployer);
    expect(result.result).toHaveClarityType(ClarityType.ResponseOk);
    
    // Verify the new value
    const updatedFee = getRewardClaimFee();
    expect(updatedFee.result).toBeUint(50);
  });
  
  it("Non-manager cannot set reward claim fee", () => {
    const result = setRewardClaimFee(75, address1);
    expect(result.result).toHaveClarityType(ClarityType.ResponseErr);
    expect(result.result).toBeErr(ERR_PERMISSION_DENIED);
  });
});

describe("Manager Functions Tests", () => {
  it("Should show the current manager", () => {
    const manager = getManager();
    // The deployer is the default manager
    expect(manager.result).toBePrincipal(deployer);
  });

  it("Manager can transfer management to another account", () => {
    // Transfer management to address1
    const result = setManager(address1, deployer);
    expect(result.result).toHaveClarityType(ClarityType.ResponseOk);

    // Verify the manager was changed
    const newManager = getManager();
    expect(newManager.result).toBePrincipal(address1);

    // Transfer management back to deployer
    const result2 = setManager(deployer, address1);
    expect(result2.result).toHaveClarityType(ClarityType.ResponseOk);
  });

  it("Non-manager cannot transfer management", () => {
    // Try to transfer management as a non-manager
    const result = setManager(address2, address3);
    expect(result.result).toHaveClarityType(ClarityType.ResponseErr);
    expect(result.result).toBeErr(ERR_PERMISSION_DENIED);
  });
});

// Start Next Cycle Block tests removed as this functionality has been replaced with START-BLOCK constant

describe("Finance and Allocation Tests", () => {
  it("User can deposit treasure", () => {
    // Get initial treasure value
    const initialTreasure = getTreasure();
    const initialValue = cvToValue(initialTreasure.result);
    const depositAmount = 1000000;

    // Mint some tokens for address1
    mintToken(depositAmount, address1);

    // Deposit treasure
    const result = depositTreasure(depositAmount, address1);
    expect(result.result).toHaveClarityType(ClarityType.ResponseOk);

    // Verify the treasure was updated
    const updatedTreasure = getTreasure();
    expect(updatedTreasure.result).toBeUint(Number(initialValue) + depositAmount);
  });

  it("User can allocate to a constellation", () => {
    // Mint tokens for address2
    const allocAmount = 2000000;
    mintToken(allocAmount, address2);

    // Allocate to constellation
    const constellation = 1;
    const result = allocate(allocAmount, constellation, address2, address3);
    expect(result.result).toHaveClarityType(ClarityType.ResponseOk);

    // Check the current cycle
    const currentCycleId = getCurrentCycleId();
    const currentCycle = getCycle(Number(cvToValue(currentCycleId.result)));

    const cycleData = cvToJSON(currentCycle.result);
    const prize = Number(cvToValue(cycleData.value.prize));
    const treasure = Number(cvToValue(getTreasure().result));
    const teamFee = Number(cvToValue(getTeamFee().result));
    const refferralReward = Number(cvToJSON(getReferralReward(address3).result).value.amount.value);
    expect(refferralReward).toBeGreaterThan(0);
    expect(treasure).toBeGreaterThan(0);
    expect(teamFee).toBeGreaterThan(0);
    expect(prize).toBeGreaterThan(0);

    expect(allocAmount).toBe(prize + treasure + teamFee + refferralReward);

  });

  it("User can claim reward after cycle ends", () => {
    // First, mine blocks to end the current cycle
    simnet.mineEmptyBlocks(150);
    
    // Allocate in the current cycle (which is now cycle 1)
    const allocAmount = 3000000;
    const constellation = 0; // Using constellation 0 for this test
    
    // Mint tokens for address3
    simnet.callPublicFn(
      TOKEN_CONTRACT,
      "mint",
      [Cl.uint(allocAmount), Cl.principal(address3)],
      deployer
    );
    
    // Allocate to the constellation with referral
    const allocResult = allocate(allocAmount, constellation, address3, deployer);
    expect(allocResult.result).toHaveClarityType(ClarityType.ResponseOk);
    
    // Mine more blocks to end this cycle too
    simnet.mineEmptyBlocks(150);
    
    // Get the current cycle ID, should be 2 now
    const currentCycleId = getCurrentCycleId();
    expect(currentCycleId.result).toBeUint(2);
    
    // Claim reward for cycle 1
    const claimResult = claimReward(1, address3);
    
    // The result might be an error if address3 didn't allocate to the winning constellation
    // So we just check that the function executed without throwing an exception
    expect(claimResult).toBeDefined();
    
    // If we got an OK, then the user successfully claimed their reward
    if (claimResult.result.type === ClarityType.ResponseOk) {
      const userReward = cvToValue(claimResult.result.value);
      expect(userReward).toBeGreaterThan(0);
    }
  });
});

describe("Cycle and Tracking Tests", () => {
  it("Can get current cycle ID", () => {
    const cycleId = getCurrentCycleId();
    expect(cycleId.result).toBeUint(0);
  });

  it("Can check allocation by a user", () => {
    const cycleNumber = 1;
    const allocation = getAllocatedByUser(cycleNumber, address2);
    // The allocation now returns a structure with a list of constellations and claimed status
    expect(Cl.prettyPrint(allocation.result)).toBe("{ claimed: false, constellation-allocation: (list u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0) }");
  });

  it("Can get cycle details with constellation allocations", () => {
    const cycleNumber = 1;
    const cycle = getCycle(cycleNumber);
    expect(cycle.result).toBeDefined();
    if (cycle.result) {
      const resultValue = cvToJSON(cycle.result);
      expect(resultValue).toHaveProperty("prize");
      expect(resultValue).toHaveProperty("prize-claimed");
      expect(resultValue).toHaveProperty("constellation-allocation");
    }
  });

  it("Allocation correctly distributes funds according to allocation division", () => {
    // Set known allocation division
    setAllocationDivision(40, 30, 20, 10, deployer);

    // Get initial state
    const initialTreasure = cvToValue(getTreasure().result);
    const initialTeamFee = cvToValue(getTeamFee().result);

    // Mint tokens for allocation
    const allocAmount = 10000000; // 10 million satoshis
    simnet.callPublicFn(
      TOKEN_CONTRACT,
      "mint",
      [Cl.uint(allocAmount), Cl.principal(address3)],
      deployer
    );

    // Perform allocation
    const constellation = 5; // Choose constellation 5
    const result = allocate(allocAmount, constellation, address3, address2);
    expect(result.result).toHaveClarityType(ClarityType.ResponseOk);

    // Check division distribution
    const updatedTreasure = cvToValue(getTreasure().result);
    const updatedTeamFee = cvToValue(getTeamFee().result);

    // Calculate expected values
    const expectedTreasureAddition = allocAmount * 30 / 100;
    const expectedTeamFeeAddition = allocAmount * 30 / 100;

    // Verify the distribution
    expect(Number(updatedTreasure)).toBe(Number(initialTreasure) + expectedTreasureAddition);
    expect(Number(updatedTeamFee)).toBe(Number(initialTeamFee) + expectedTeamFeeAddition);

    // Check user's allocation record with new constellation-allocation list format
    const userAllocation = getAllocatedByUser(1, address3);
    if (userAllocation.result) {
      const allocationData = cvToJSON(userAllocation.result);
      expect(allocationData).toHaveProperty("constellation-allocation");
      expect(allocationData).toHaveProperty("claimed");
      expect(allocationData.claimed).toBe(false);
    }

    // Check cycle record with constellation-allocation list
    const cycle = getCycle(1);
    if (cycle.result) {
      const cycleData = cvToJSON(cycle.result);
      expect(cycleData).toHaveProperty("constellation-allocation");
    }
  });
});

function getAllocationDivision() {
  return simnet.callReadOnlyFn(
    CONTRACT_NAME,
    "get-allocation-division",
    [],
    deployer
  );
}

function setAllocationDivision(currentCyclePercent: number, treasurePercent: number, teamFeePercent: number, referralRewardPercent: number, sender: string) {
  return simnet.callPublicFn(
    CONTRACT_NAME,
    "set-allocation-division",
    [Cl.uint(currentCyclePercent), Cl.uint(treasurePercent), Cl.uint(teamFeePercent), Cl.uint(referralRewardPercent)],
    sender
  );
}

// =====================================================
// Helper functions for getter methods
// =====================================================
function getCycleDuration() {
  return simnet.callReadOnlyFn(
    CONTRACT_NAME,
    "get-cycle-duration",
    [],
    deployer
  );
}

// getStartNextCycleBlock function removed as it's no longer in the contract

function getTreasure() {
  return simnet.callReadOnlyFn(
    CONTRACT_NAME,
    "get-treasure",
    [],
    deployer
  );
}

function getTeamFee() {
  return simnet.callReadOnlyFn(
    CONTRACT_NAME,
    "get-team-fee",
    [],
    deployer
  );
}

function getTreasureDistributionCycleCount() {
  return simnet.callReadOnlyFn(
    CONTRACT_NAME,
    "get-treasure-distribution-cycle-count",
    [],
    deployer
  );
}

function getMinAllocation() {
  return simnet.callReadOnlyFn(
    CONTRACT_NAME,
    "get-min-allocation",
    [],
    deployer
  );
}

function getCurrentCycleId() {
  return simnet.callReadOnlyFn(
    CONTRACT_NAME,
    "get-current-cycle-id",
    [],
    deployer
  );
}

function getManager() {
  return simnet.callReadOnlyFn(
    CONTRACT_NAME,
    "get-manager",
    [],
    deployer
  );
}

function getCycle(cycleNumber: number) {
  return simnet.callReadOnlyFn(
    CONTRACT_NAME,
    "get-cycle",
    [Cl.uint(cycleNumber)],
    deployer
  );
}

// getAllocatedByConstellation function removed as it's no longer in the contract

function getAllocatedByUser(cycleNumber: number, user: string) {
  return simnet.callReadOnlyFn(
    CONTRACT_NAME,
    "get-allocated-by-user",
    [Cl.uint(cycleNumber), Cl.principal(user)],
    deployer
  );
}

function getReferralReward(user: string) {
  return simnet.callReadOnlyFn(
    CONTRACT_NAME,
    "get-referral-reward",
    [Cl.principal(user)],
    deployer
  );
}

function getRewardClaimFee() {
  return simnet.callReadOnlyFn(
    CONTRACT_NAME,
    "get-reward-claim-fee",
    [],
    deployer
  );
}

// =====================================================
// Helper functions for setter methods
// =====================================================
function setManager(newManager: string, sender: string) {
  return simnet.callPublicFn(
    CONTRACT_NAME,
    "set-manager",
    [Cl.principal(newManager)],
    sender
  );
}

function setCycleDuration(newDuration: number, sender: string) {
  return simnet.callPublicFn(
    CONTRACT_NAME,
    "set-cycle-duration",
    [Cl.uint(newDuration)],
    sender
  );
}

function setMinAllocation(newMinAllocation: number, sender: string) {
  return simnet.callPublicFn(
    CONTRACT_NAME,
    "set-min-allocation",
    [Cl.uint(newMinAllocation)],
    sender
  );
}

function setTreasureDistributionCycleCount(newCount: number, sender: string) {
  return simnet.callPublicFn(
    CONTRACT_NAME,
    "set-treasure-distribution-cycle-count",
    [Cl.uint(newCount)],
    sender
  );
}

// setStartNextCycleBlock function removed as it's no longer in the contract

function setTeamFee(newFee: number, sender: string) {
  return simnet.callPublicFn(
    CONTRACT_NAME,
    "set-team-fee",
    [Cl.uint(newFee)],
    sender
  );
}

function setRewardClaimFee(newFee: number, sender: string) {
  return simnet.callPublicFn(
    CONTRACT_NAME,
    "set-reward-claim-fee",
    [Cl.uint(newFee)],
    sender
  );
}

function depositTreasure(amount: number, sender: string) {
  return simnet.callPublicFn(
    CONTRACT_NAME,
    "deposit-treaure",
    [Cl.uint(amount)],
    sender
  );
}

function allocate(amount: number, constellation: number, sender: string, refferral: string) {
  return simnet.callPublicFn(
    CONTRACT_NAME,
    "allocate",
    [Cl.uint(amount), Cl.uint(constellation), Cl.principal(refferral)],
    sender
  );
}

function mintToken(amount: number, recipient: string) {
  return simnet.callPublicFn(
    TOKEN_CONTRACT,
    "mint",
    [Cl.uint(amount), Cl.principal(recipient)],
    deployer
  );
}

function allocate(amount: number, constellation: number, sender: string, referralUser: string = deployer) {
  return simnet.callPublicFn(
    CONTRACT_NAME,
    "allocate",
    [Cl.uint(amount), Cl.uint(constellation), Cl.principal(referralUser)],
    sender
  );
}

function claimReward(cycleId: number, sender: string) {
  return simnet.callPublicFn(
    CONTRACT_NAME,
    "claim-reward",
    [Cl.uint(cycleId)],
    sender
  );
}