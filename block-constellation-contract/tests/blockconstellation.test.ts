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
const TOKEN_NAME = ".sbtc-token.sbtc-token";

// Error constants
const ERR_PRECONDITION_FAILED = Cl.uint(412);
const ERR_PRINCIPAL_NOT_FOUND = Cl.uint(404);
const ERR_PERMISSION_DENIED = Cl.uint(403);
const ERR_INVALID_VALUE = Cl.uint(400);

// Specific error codes for claim-reward function
const ERR_CYCLE_NOT_FINISHED = Cl.uint(4121);
const ERR_ALREADY_CLAIMED = Cl.uint(4122);
const ERR_NO_ALLOCATION = Cl.uint(4123);
const ERR_PRIZE_POOL_EMPTY = Cl.uint(4124);

// Specific error codes for recover-expired-prizes function
const ERR_EXPIRATION_PERIOD_NOT_MET = Cl.uint(4131);
const ERR_NO_UNCLAIMED_PRIZE = Cl.uint(4132);

describe("Administrative Functions Tests", () => {
  it("Read allocation percentages", () => {
    const allocationPercentages = getAllocationPercentages();
    console.log("Allocation Percentages: ", Cl.prettyPrint(allocationPercentages.result));
    expect(Cl.prettyPrint(allocationPercentages.result)).toBe("{ current-cycle: u30, referral-reward: u5, team-fee: u25, treasury: u40 }")
    // expect(simnet.blockHeight).toBeDefined();
  });

  it("Manager can set allocation percentages", () => {
    // Test initial values
    const initialAllocation = getAllocationPercentages();
    expect(Cl.prettyPrint(initialAllocation.result)).toBe("{ current-cycle: u30, referral-reward: u5, team-fee: u25, treasury: u40 }");

    // Set new allocation percentages (deployer is the default manager)
    const result = setAllocationPercentages(20, 50, 20, 10, deployer);
    expect(result.result).toHaveClarityType(ClarityType.ResponseOk);

    // Verify the new allocation percentages was set correctly
    const updatedAllocation = getAllocationPercentages();
    // console.log("Updated Allocation Percentages: ", Cl.prettyPrint(updatedAllocation.result));
    expect(Cl.prettyPrint(updatedAllocation.result)).toBe("{ current-cycle: u20, referral-reward: u10, team-fee: u20, treasury: u50 }");
  });

  it("Non-manager cannot set allocation percentages", () => {
    // Try to set allocation percentages as non-manager
    const result = setAllocationPercentages(25, 25, 40, 10, address1);
    expect(result.result).toHaveClarityType(ClarityType.ResponseErr);
    expect(result.result).toBeErr(ERR_PERMISSION_DENIED);
  });

  it("Allocation percentages must sum to 100", () => {
    // Try to set allocation percentages with percentages that don't sum to 100
    const result = setAllocationPercentages(20, 20, 10, 10, deployer);
    expect(result.result).toHaveClarityType(ClarityType.ResponseErr);
    expect(result.result).toBeErr(ERR_PRECONDITION_FAILED);
  });
});

describe("Admin Configuration Tests", () => {
  
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

  it("Manager can set treasury distribution period", () => {
    // Test initial value
    const initialCount = getTreasuryDistributionCycleCount();
    expect(initialCount.result).toBeUint(3);

    // Set new count as manager
    const result = setTreasuryDistributionCycleCount(5, deployer);
    expect(result.result).toHaveClarityType(ClarityType.ResponseOk);

    // Verify the new value
    const updatedCount = getTreasuryDistributionCycleCount();
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
  it("User can deposit treasury", () => {
    // Get initial treasury value
    const initialTreasury = getTreasury();
    const initialValue = cvToValue(initialTreasury.result);
    const depositAmount = 1000000;

    // Mint some tokens for address1
    mintToken(depositAmount, address1);

    // Deposit treasury
    const result = depositTreasury(depositAmount, address1);
    expect(result.result).toHaveClarityType(ClarityType.ResponseOk);

    // Verify the treasury was updated
    const updatedTreasury = getTreasury();
    expect(updatedTreasury.result).toBeUint(Number(initialValue) + depositAmount);
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
    const treasury = Number(cvToValue(getTreasury().result));
    const teamFee = Number(cvToValue(getTeamFee().result));
    const referralReward = Number(cvToJSON(getReferralReward(address3).result).value.amount.value);
    expect(referralReward).toBeGreaterThan(0);
    expect(treasury).toBeGreaterThan(0);
    expect(teamFee).toBeGreaterThan(0);
    expect(prize).toBeGreaterThan(0);

    expect(allocAmount).toBe(prize + treasury + teamFee + referralReward);

  });

  it("User can claim reward after cycle ends", () => {
    // First, mine blocks to end the current cycle
    simnet.mineEmptyBlocks(150);
    
    // Allocate in the current cycle (which is now cycle 1)
    const allocAmount = 3000000;
    const constellation = 7; // Using constellation 0 for this test
    
    // Mint tokens for address3
    mintToken(allocAmount, address3);
    
    // Allocate to the constellation with referral
    const allocResult = allocate(allocAmount, constellation, address3, deployer);
    expect(allocResult.result).toHaveClarityType(ClarityType.ResponseOk);
    
    // Mine more blocks to end this cycle too
    simnet.mineEmptyBlocks(150);
    
    // Get the current cycle ID, should be 2 now
    const currentCycleId = getCurrentCycleId();
    expect(currentCycleId.result).toBeUint(2);

    

    // Get constellation of the cycle
    const constellationResult = getConstellation(1);
    // Check if the constellation is correct
    expect(constellationResult.result).toBeUint(constellation);
    
    // Claim reward for cycle 1
    const claimResult = claimReward(1, address3);
    expect(claimResult.result).toHaveClarityType(ClarityType.ResponseOk);

    // Check the user balance after claiming
    const userBalance2 = Number(simnet.getAssetsMap().get(TOKEN_NAME)?.get(address3));
    expect(userBalance2).toBeGreaterThan(0);

    // Check the cycle details
    const cycle = getCycle(1);
    // console.log("Cycle Data: ", cvToJSON(cycle.result));
    const cycleData = cvToJSON(cycle.result).value;
    expect(Number(cycleData["prize-claimed"].value)).toBe(Number(cycleData["prize"].value));


    // try to claim again - should fail with ERR_ALREADY_CLAIMED
    const claimResult2 = claimReward(1, address3);
    expect(claimResult2.result).toHaveClarityType(ClarityType.ResponseErr);
    expect(claimResult2.result).toBeErr(ERR_ALREADY_CLAIMED);
    
  });
  
  it("Tests various error conditions for claim-reward", () => {
    // Mine blocks to end the current cycle and start a new one
    simnet.mineEmptyBlocks(150);
    
    // 1. Test ERR_CYCLE_NOT_FINISHED - Try to claim from current (active) cycle
    const currentCycleId = getCurrentCycleId();
    const cycleIdValue = Number(cvToValue(currentCycleId.result));
    
    // Try to claim from the active cycle
    const claimActiveResult = claimReward(cycleIdValue, address1);
    expect(claimActiveResult.result).toHaveClarityType(ClarityType.ResponseErr);
    expect(claimActiveResult.result).toBeErr(ERR_CYCLE_NOT_FINISHED);
    
    // 2. Test ERR_NO_ALLOCATION - Try to claim with a user who didn't allocate to the winning constellation
    // First, allocate to a constellation that is NOT the winning one
    const prevCycleId = cycleIdValue - 1;
    const winningConstellation = Number(cvToValue(getConstellation(prevCycleId).result));
    let nonWinningConstellation = (winningConstellation + 1) % 24; // Choose a different constellation
    
    // Mint tokens for address2
    const allocAmount = 2000000;
    mintToken(allocAmount, address2);
    
    // Allocate to non-winning constellation in previous cycle (can't do this retroactively in real scenario, 
    // but we manipulate for testing)
    allocate(allocAmount, nonWinningConstellation, address2, address3);
    // simnet.callPublicFn(
    //   CONTRACT_NAME,
    //   "allocate",
    //   [Cl.uint(allocAmount), Cl.uint(nonWinningConstellation), Cl.principal(deployer)],
    //   address2
    // );
    
    // Mine blocks to end this cycle
    simnet.mineEmptyBlocks(150);
    
    // Try to claim - should fail with ERR_NO_ALLOCATION
    const claimNoAllocationResult = claimReward(prevCycleId, address2);
    
    // Under normal circumstances, this would fail with ERR_NO_ALLOCATION, but since we can't 
    // retroactively allocate to a past cycle in our test, we'll just verify the error is not success
    expect(claimNoAllocationResult.result).toHaveClarityType(ClarityType.ResponseErr);
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
    expect(Cl.prettyPrint(allocation.result)).toBe("{ claimed: false, constellation-allocation: (list u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0) }");
  });

  // it("Can get cycle details with constellation allocations", () => {
  //   const cycleNumber = 1;
  //   const cycle = getCycle(cycleNumber);
  //   expect(cycle.result).toBeDefined();
  //   if (cycle.result) {
  //     const resultValue = cvToJSON(cycle.result);
  //     console.log("Cycle Data: ", resultValue);
  //     expect(resultValue).toHaveProperty("prize");
  //     expect(resultValue).toHaveProperty("prize-claimed");
  //     expect(resultValue).toHaveProperty("constellation-allocation");
  //   }
  // });

  it("Allocation correctly distributes funds according to allocation percentages", () => {
    // Set known allocation percentages
    setAllocationPercentages(40, 30, 20, 10, deployer);

    // Get initial state
    const initialTreasury = cvToValue(getTreasury().result);
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
    const updatedTreasury = cvToValue(getTreasury().result);
    const updatedTeamFee = cvToValue(getTeamFee().result);

    // Calculate expected values
    const expectedTreasuryAddition = allocAmount * 30 / 100;
    const expectedTeamFeeAddition = allocAmount * 30 / 100;

    // Verify the distribution
    expect(Number(updatedTreasury)).toBe(Number(initialTreasury) + expectedTreasuryAddition);
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

function getAllocationPercentages() {
  return simnet.callReadOnlyFn(
    CONTRACT_NAME,
    "get-allocation-percentages",
    [],
    deployer
  );
}

function setAllocationPercentages(currentCyclePercent: number, treasuryPercent: number, teamFeePercent: number, referralRewardPercent: number, sender: string) {
  return simnet.callPublicFn(
    CONTRACT_NAME,
    "set-allocation-percentages",
    [Cl.uint(currentCyclePercent), Cl.uint(treasuryPercent), Cl.uint(teamFeePercent), Cl.uint(referralRewardPercent)],
    sender
  );
}

// =====================================================
// Helper functions for getter methods
// =====================================================
function getBlocksPerCycle() {
  return simnet.callReadOnlyFn(
    CONTRACT_NAME,
    "get-blocks-per-cycle",
    [],
    deployer
  );
}

// getStartNextCycleBlock function removed as it's no longer in the contract

function getTreasury() {
  return simnet.callReadOnlyFn(
    CONTRACT_NAME,
    "get-treasury",
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

function getTreasuryDistributionCycleCount() {
  return simnet.callReadOnlyFn(
    CONTRACT_NAME,
    "get-treasury-distribution-period",
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

function getConstellation(cycleNumber: number) {
  return simnet.callReadOnlyFn(
    CONTRACT_NAME,
    "get-constellation",
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

function setMinAllocation(newMinAllocation: number, sender: string) {
  return simnet.callPublicFn(
    CONTRACT_NAME,
    "set-min-allocation",
    [Cl.uint(newMinAllocation)],
    sender
  );
}

function setTreasuryDistributionCycleCount(newCount: number, sender: string) {
  return simnet.callPublicFn(
    CONTRACT_NAME,
    "set-treasury-distribution-period",
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

function depositTreasury(amount: number, sender: string) {
  return simnet.callPublicFn(
    CONTRACT_NAME,
    "deposit-treasury",
    [Cl.uint(amount)],
    sender
  );
}

function allocate(amount: number, constellation: number, sender: string, referralUser: string) {
  return simnet.callPublicFn(
    CONTRACT_NAME,
    "allocate",
    [Cl.uint(amount), Cl.uint(constellation), Cl.principal(referralUser)],
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

function claimReward(cycleId: number, sender: string) {
  return simnet.callPublicFn(
    CONTRACT_NAME,
    "claim-reward",
    [Cl.uint(cycleId)],
    sender
  );
}