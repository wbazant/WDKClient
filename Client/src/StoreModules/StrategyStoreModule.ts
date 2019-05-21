import { EpicDependencies } from 'wdk-client/Core/Store';
import { InferAction } from 'wdk-client/Utils/ActionCreatorUtils';
import { Action } from 'wdk-client/Actions';
import { stubTrue } from 'lodash/fp';
import { mergeMapRequestActionsToEpic as mrate } from 'wdk-client/Utils/ActionCreatorUtils';
import { combineEpics, StateObservable } from 'redux-observable';
import { Step, StrategyDetails } from 'wdk-client/Utils/WdkUser';
import {
requestCreateStrategy,
fulfillCreateStrategy,
requestDeleteStrategy,
fulfillDeleteStrategy,
requestDeleteOrRestoreStrategies,
requestDuplicateStrategy,
fulfillDuplicateStrategy,
requestStrategy,
fulfillStrategy,
requestPatchStrategyProperties,
requestPutStrategyStepTree,
requestCreateStep,
fulfillCreateStep,
requestUpdateStepProperties,
requestDeleteStep,
requestUpdateStepSearchConfig,
} from 'wdk-client/Actions/StrategyActions';
import { RootState } from 'wdk-client/Core/State/Types';

export const key = 'strategies';

export type StrategyEntry =
  | { status: 'pending', isLoading: boolean }
  | { status: 'success', isLoading: boolean, strategy: StrategyDetails }

export type State = {
  strategies: Record<number, StrategyEntry|undefined>;
};

const initialState: State = {
  strategies: {}
};

function reqStrat(state: State, strategyId: number) {
  const entry = state.strategies[strategyId];
  if (entry != null) return state;
  return updateStrategyEntry(state, strategyId, prevEntry => ({
    status: 'pending',
    ...prevEntry,
    isLoading: true
  }));  
}

// TODO: why are the action variables "any" type?
export function reduce(state: State = initialState, action: Action): State {
  switch (action.type) {

  case requestStrategy.type:
  case requestPatchStrategyProperties.type:
  case requestPutStrategyStepTree.type:
  case requestDeleteStrategy.type:
  case requestPutStrategyStepTree.type:
  case requestUpdateStepProperties.type:
  case requestDeleteStep.type:  
  case requestUpdateStepSearchConfig.type:
    {
     const strategyId  = action.payload.strategyId;
     return reqStrat(state, strategyId);
   }

  case fulfillStrategy.type:{
    const strategy = action.payload.strategy;
    const entry = state.strategies[strategy.strategyId];
    if (entry == null || entry.status !== 'success') {
      return updateStrategyEntry(state, strategy.strategyId, {
        status: 'success',
        isLoading: false,
        strategy
      });
    }
    
    return state;
  }

  case fulfillDeleteStrategy.type: {
    const strategyId = action.payload.strategyId;
    return {
      ...state,
      strategies: {
        [strategyId]: undefined
      }
    }
  }

  default: {
      return state;
    }
  }
}

function updateStrategyEntry(
    state: State,
    strategyId: number,
    entry: StrategyEntry | ((prevEntry?: StrategyEntry) => StrategyEntry)
  ) {
    return {
      ...state,
      strategies: {
        ...state.strategies,
        [strategyId]: typeof entry === 'function' ? entry(state.strategies[strategyId]) : entry
      }
    };
  }

  async function getFulfillStrategy(
    [requestAction]: [InferAction<typeof requestStrategy>],
    state$: StateObservable<RootState>,
    { wdkService }: EpicDependencies
  ): Promise<InferAction<typeof fulfillStrategy>> {
    const strategyId  = requestAction.payload.strategyId;
      let strategy = await wdkService.getStrategy(strategyId);
      return fulfillStrategy(strategy);
  }

  async function getFulfillStrategy_PutStepTree(
    [requestAction]: [InferAction<typeof requestPutStrategyStepTree>],
    state$: StateObservable<RootState>,
    { wdkService }: EpicDependencies
  ): Promise<InferAction<typeof fulfillStrategy>> {
    const {strategyId, newStrategySpec }  = requestAction.payload;
    await wdkService.putStrategyStepTree(strategyId, newStrategySpec);
    let strategy = await wdkService.getStrategy(strategyId);
    return fulfillStrategy(strategy);
  }

  async function getFulfillStrategy_PatchStratProps(
    [requestAction]: [InferAction<typeof requestPatchStrategyProperties>],
    state$: StateObservable<RootState>,
    { wdkService }: EpicDependencies
  ): Promise<InferAction<typeof fulfillStrategy>> {
    const {strategyId, strategyProperties }  = requestAction.payload;
    await wdkService.patchStrategyProperties(strategyId, strategyProperties);
    let strategy = await wdkService.getStrategy(strategyId);
    return fulfillStrategy(strategy);
  }

  // we read the strat back in to memory to facilitate undo of delete (i guess?)
  async function getFulfillStrategyDelete(
    [requestAction]: [InferAction<typeof requestDeleteStrategy>],
    state$: StateObservable<RootState>,
    { wdkService }: EpicDependencies
  ): Promise<InferAction<typeof fulfillDeleteStrategy>> {
    const {strategyId }  = requestAction.payload;
    await wdkService.deleteStrategy(strategyId);
    return fulfillDeleteStrategy(strategyId);
  }

  async function getFulfillStrategy_PostStepSearchConfig(
    [requestAction]: [InferAction<typeof requestUpdateStepSearchConfig>],
    state$: StateObservable<RootState>,
    { wdkService }: EpicDependencies
  ): Promise<InferAction<typeof fulfillStrategy>> {
    const {strategyId, stepId, answerSpec }  = requestAction.payload;
    await wdkService.updateStepSearchConfig(stepId, answerSpec);
    let strategy = await wdkService.getStrategy(strategyId);
    return fulfillStrategy(strategy);
  }

  async function getFulfillDuplicateStrategy(
    [requestAction]: [InferAction<typeof requestDuplicateStrategy>],
    state$: StateObservable<RootState>,
    { wdkService }: EpicDependencies
  ): Promise<InferAction<typeof fulfillDuplicateStrategy>> {
    const {copyStepSpec, requestTimestamp }  = requestAction.payload;
      let strategy = await wdkService.duplicateStrategy(copyStepSpec);
      return fulfillDuplicateStrategy(strategy.id, requestTimestamp);
  }

  async function getFulfillCreateStrategy(
    [requestAction]: [InferAction<typeof requestCreateStrategy>],
    state$: StateObservable<RootState>,
    { wdkService }: EpicDependencies
  ): Promise<InferAction<typeof fulfillCreateStrategy>> {
    const { newStrategySpec, requestTimestamp } = requestAction.payload;
    let identifier = await wdkService.createStrategy(newStrategySpec);
  
    return fulfillCreateStrategy(identifier.id, requestTimestamp);
  }

  
async function getFulfillCreateStep(
  [requestAction]: [InferAction<typeof requestCreateStep>],
  state$: StateObservable<RootState>,
  { wdkService }: EpicDependencies
): Promise<InferAction<typeof fulfillCreateStep>> {
  const { newStepSpec, requestTimestamp } = requestAction.payload;
  let identifier = await wdkService.createStep(newStepSpec);

  return fulfillCreateStep(identifier.id, requestTimestamp);
}
  
  export const observe = combineEpics(
    mrate([requestStrategy], getFulfillStrategy, {
      areActionsNew: stubTrue
    }),
    mrate([requestPutStrategyStepTree], getFulfillStrategy_PutStepTree),
    mrate([requestPatchStrategyProperties], getFulfillStrategy_PatchStratProps),
    mrate([requestUpdateStepSearchConfig], getFulfillStrategy_PostStepSearchConfig),
    mrate([requestCreateStrategy], getFulfillCreateStrategy),
    mrate([requestDeleteStrategy], getFulfillStrategyDelete),
    mrate([requestDuplicateStrategy], getFulfillDuplicateStrategy),
    mrate([requestCreateStep], getFulfillCreateStep),
  );
/*
requestUpdateStepProperties,
requestDeleteStep,
*/