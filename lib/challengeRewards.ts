export const CHALLENGE_REWARDS={
  quiz:{coins:15,cp:10},
  trivia:{coins:12,cp:8},
  riddle:{coins:8,cp:5},
  coin:{coins:10,cp:5},
  rps:{coins:5,cp:3},
  dezfuli:{coins:3,cp:10}
} as const;

export type ChallengeKind=keyof typeof CHALLENGE_REWARDS;
export type RewardPayload={coins:number;cp:number};

export function challengeReward(kind:ChallengeKind):RewardPayload{
  const row=CHALLENGE_REWARDS[kind];
  return {coins:row.coins,cp:row.cp};
}

export function rewardResult(correct:boolean,kind:ChallengeKind,alreadyClaimed=false){
  const reward=correct&&!alreadyClaimed?challengeReward(kind):{coins:0,cp:0};
  return {correct,reward,alreadyClaimed};
}
