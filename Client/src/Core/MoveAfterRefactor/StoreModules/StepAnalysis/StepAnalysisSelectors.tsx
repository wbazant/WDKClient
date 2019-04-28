import React, { Fragment } from 'react';

import { createSelector } from 'reselect';
import { RootState } from '../../../State/Types';
import { get, escapeRegExp } from 'lodash';
import { StepAnalysesState, AnalysisPanelState, AnalysisMenuState, UnsavedAnalysisState, UninitializedAnalysisPanelState, SavedAnalysisState } from './StepAnalysisState';
import { transformPanelState } from './StepAnalysisReducer';
import { StepAnalysisStateProps } from '../../Components/StepAnalysis/StepAnalysisView';
import { TabConfig } from 'wdk-client/Core/MoveAfterRefactor/Components/Shared/ResultTabs';
import { StepAnalysisType } from '../../../../Utils/StepAnalysisUtils';
import { locateFormPlugin, locateResultPlugin } from '../../Components/StepAnalysis/StepAnalysisPluginRegistry';
import { Question, SummaryViewPluginField } from 'wdk-client/Utils/WdkModel';
import { ResultPanelState } from 'wdk-client/StoreModules/ResultPanelStoreModule';
import { UserPreferences } from 'wdk-client/Utils/WdkUser';
import { prefSpecs } from 'wdk-client/Utils/UserPreferencesUtils';

type BaseTabConfig = Pick<TabConfig<string>, 'key' | 'display' | 'removable' | 'tooltip'>;

// Props used by selectors... is there a better way to do this?
type Props = { viewId: string, stepId: number, initialTab?: string };

export const webAppUrl = (state: RootState): string => get(state, 'globalData.siteConfig.webAppUrl', '');
export const wdkModelBuildNumber = (state: RootState): number => get(state, 'globalData.config.buildNumber', 0);
export const recordClassDisplayName = (
  { 
    globalData: { recordClasses = [] }, 
    steps: { steps }, 
  }: RootState,
  { stepId }: Props
) => {
  const recordClassName = get(steps[stepId], 'step.recordClassName', '');
  const recordClass = recordClasses.find(({ urlSegment }) => urlSegment === recordClassName);
  return get(recordClass, 'displayName', '');
};
// FIXME This look suspect
export const question = (
  { 
    globalData: { questions = [] }, 
    steps: { steps }, 
  }: RootState,
  { stepId }: Props
) => {
  // FIXME this is a bit dirty and not type safe
  const questionName = get(steps[stepId], 'step.answerSpec.questionName', '');
  const question = questions.find(({ fullName }) => fullName === questionName);
  return question;
};

export const userPreferences = (
  state: RootState
) => state.globalData.preferences;

export const summaryViewPlugins = createSelector<RootState, Props, Question | undefined, SummaryViewPluginField[]>(
  question,
  question => question 
    ? question.summaryViewPlugins
    : []
);
export const defaultSummaryView = createSelector<RootState, Props, UserPreferences | undefined, Question | undefined, string>(
  userPreferences,
  question,
  (userPreferences, question) =>
    userPreferences == null || question == null
      ? ''
      : get(userPreferences, prefSpecs.resultPanelTab(question.fullName), question.defaultSummaryView));

export const resultPanel = ({ resultPanel }: RootState, { viewId }: Props): ResultPanelState | undefined => resultPanel[viewId];

export const questionsLoaded = ({ globalData: { questions }}: RootState) => questions != null;

export const stepLoaded = ({ steps: { steps }}: RootState, { stepId }: Props) => {
  const stepEntry = steps[stepId];
  return stepEntry != null && !stepEntry.isLoading;
}

export const loadingSummaryViewListing = createSelector<RootState, Props, ResultPanelState | undefined, boolean, boolean, boolean>(
  resultPanel,
  questionsLoaded,
  stepLoaded,
  (resultPanel, questionsLoaded, stepLoaded) => resultPanel != null && (!questionsLoaded || !stepLoaded)
);

export const stepAnalyses = ({ stepAnalysis }: RootState) => stepAnalysis;

export const loadingAnalysisChoices = createSelector<RootState, StepAnalysesState, boolean>(
  stepAnalyses,
  stepAnalyses => stepAnalyses.loadingAnalysisChoices
);

export const initialTab = (_: RootState, { initialTab }: Props) => initialTab;

export const activeTab = createSelector<RootState, Props, StepAnalysesState, ResultPanelState | undefined, string, string | undefined, string | number>(
  stepAnalyses,
  resultPanel,
  defaultSummaryView,
  initialTab,
  (stepAnalyses, resultPanel, defaultSummaryView, initialTab) => {
    if (initialTab && stepAnalyses.activeTab === -1 && (resultPanel == null || resultPanel.activeSummaryView == null)) {
      const tabDetail = parseTabSelector(initialTab);
      if (tabDetail == null) return '';
      if (tabDetail.type === SUMMARY_VIEW_TAB_PREFIX) return tabDetail.id;
      if (tabDetail.type === ANALYSIS_TAB_PREFIX) {
        // handle analysis tab selector
        for (const id in stepAnalyses.analysisPanelStates) {
          const state = stepAnalyses.analysisPanelStates[id];
          if (
            state.type === 'ANALYSIS_MENU_STATE' && tabDetail.id === 'menu' ||
            state.type === 'SAVED_ANALYSIS_STATE' && state.analysisConfig.analysisId === Number(tabDetail.id) ||
            state.type === 'UNINITIALIZED_PANEL_STATE' && state.analysisId === Number(tabDetail.id)
          ) return id;
        }
      }
      return '';
    }
    if (stepAnalyses.activeTab === -1) {
      return (resultPanel && resultPanel.activeSummaryView) || defaultSummaryView;
    }

    return stepAnalyses.activeTab;
  }
);
export const analysisPanelOrder = createSelector<RootState, StepAnalysesState, number[]>(
  stepAnalyses,
  stepAnalyses => stepAnalyses.analysisPanelOrder
);
export const analysisPanelStates = createSelector<RootState, StepAnalysesState, Record<number, AnalysisPanelState>>(
  stepAnalyses,
  stepAnalyses => stepAnalyses.analysisPanelStates
);
export const analysisChoices = createSelector<RootState, StepAnalysesState, StepAnalysisType[]>(
  stepAnalyses,
  stepAnalyses => stepAnalyses.analysisChoices
);

export const newAnalysisButtonVisible = createSelector<RootState, number[], Record<number, AnalysisPanelState>, boolean>(
  analysisPanelOrder,
  analysisPanelStates,
  (analysisPanelOrder, analysisPanelStates) => analysisPanelOrder.every(panelId => analysisPanelStates[panelId].type !== 'ANALYSIS_MENU_STATE')
);

export const analysisBaseTabConfigs = createSelector<RootState, number[], Record<number, AnalysisPanelState>, StepAnalysisType[], BaseTabConfig[]>(
  analysisPanelOrder,
  analysisPanelStates,
  analysisChoices,
  (analysisPanelOrder, analysisPanelStates, analysisChoices) => {
    if (analysisChoices.length === 0) {
      return [];
    }

    return analysisPanelOrder.map(panelId => transformPanelState(
      analysisPanelStates[panelId],
      {
        UninitializedPanelState: ({ displayName }) => ({
          key: `${panelId}`,
          display: displayName,
          removable: true
        }),
        AnalysisMenuState: ({ displayName }) => ({
          key: `${panelId}`,
          display: displayName,
          removable: true
        }),
        UnsavedAnalysisState: ({ displayName }) => ({
          key: `${panelId}`,
          display: `${displayName}*`,
          removable: true
        }),
        SavedAnalysisState: ({ analysisConfig: { displayName } }) => ({
          key: `${panelId}`,
          display: displayName,
          removable: true
        })
      }
    ));
  }
);

export const mapAnalysisPanelStateToProps = (
  analysisPanelState: AnalysisPanelState,
  choices: StepAnalysisType[],
  webAppUrl: string,
  wdkModelBuildNumber: number, 
  recordClassDisplayName: string
): StepAnalysisStateProps => transformPanelState(
  analysisPanelState,
  {
    UninitializedPanelState: mapUnitializedPanelStateToProps,
    AnalysisMenuState: panelState => mapAnalysisMenuStateToProps(
      panelState,
      choices,
      webAppUrl,
      wdkModelBuildNumber,
      recordClassDisplayName
    ),
    UnsavedAnalysisState: panelState => mapUnsavedAnalysisStateToProps(panelState, choices),
    SavedAnalysisState: panelState => mapSavedAnalysisStateToProps(panelState, choices, webAppUrl)
  }
);

const mapUnitializedPanelStateToProps = (panelState: UninitializedAnalysisPanelState): StepAnalysisStateProps =>
  panelState.status === 'LOADING_SAVED_ANALYSIS'
    ? ({ type: 'loading-menu-pane' })
    : ({ type: 'unopened-pane' });

const mapAnalysisMenuStateToProps = (
  analysisMenuState: AnalysisMenuState,
  choices: StepAnalysisType[],
  webAppUrl: string,
  wdkModelBuildNumber: number, 
  recordClassDisplayName: string
): StepAnalysisStateProps => ({ 
  type: 'analysis-menu',
  recordClassDisplayName,
  wdkModelBuildNumber,
  webAppUrl,
  choices,
  selectedType: analysisMenuState.selectedAnalysis 
    ? analysisMenuState.selectedAnalysis.name
    : undefined
});

const mapUnsavedAnalysisStateToProps = (
  { 
    analysisName, 
    analysisType: { 
      shortDescription,
      description,
      hasParameters
    },
    panelUiState: {
      descriptionExpanded,
      formExpanded
    },
    paramSpecs,
    paramValues,
    formStatus,
    formUiState,
    formValidationErrors
  }: UnsavedAnalysisState,
  choices: StepAnalysisType[]
): StepAnalysisStateProps => ({
  type: 'selected-analysis',
  analysisName,
  descriptionState: {
    shortDescription,
    description,
    descriptionExpanded
  },
  formSaving: formStatus === 'SAVING_ANALYSIS',
  formState: { 
    hasParameters,
    formExpanded,
    errors: formValidationErrors,
    paramSpecs,
    paramValues,
    formUiState,
  },
  pluginRenderers: {
    formRenderer: locateFormPlugin(displayToType(analysisName, choices)).formRenderer,
    resultRenderer: locateResultPlugin(displayToType(analysisName, choices)).resultRenderer
  }
});

const mapSavedAnalysisStateToProps = (
  { 
    analysisConfig,
    analysisConfigStatus,
    panelUiState: {
      descriptionExpanded,
      formExpanded
    },
    resultContents,
    resultUiState,
    resultErrorMessage,
    paramSpecs,
    paramValues,
    formUiState,
    formStatus,
    formValidationErrors,
    pollCountdown
  }: SavedAnalysisState,
  choices: StepAnalysisType[],
  webAppUrl: string
): StepAnalysisStateProps => ({
  type: 'selected-analysis',
  analysisName: typeToDisplay(analysisConfig.analysisName, choices),
  descriptionState: {
    shortDescription: analysisConfig.shortDescription,
    description: analysisConfig.description,
    descriptionExpanded
  },
  formSaving: formStatus === 'SAVING_ANALYSIS',
  formState: { 
    hasParameters: typeHasParameters(analysisConfig.analysisName, choices),
    formExpanded,
    errors: formValidationErrors,
    paramSpecs,
    paramValues,
    formUiState,
  },
  resultState: analysisConfigStatus === 'COMPLETE' && analysisConfig.status === 'COMPLETE'
    ? {
      type: 'complete-result',
      analysisConfig,
      analysisResult: resultContents,
      resultUiState,
      webAppUrl
    }
    : analysisConfigStatus !== 'ERROR' && (analysisConfig.status === 'PENDING' || analysisConfig.status === 'RUNNING')
    ? {
      type: 'incomplete-result',
      className: 'analysis-pending-pane',
      header: 'Results Pending...',
      reason: (
        <Fragment>
          The results of this analysis are not yet available.<br/>
          We will check again in {pollCountdown} seconds.
        </Fragment>
      )
    }
    : analysisConfigStatus !== 'ERROR' && (analysisConfig.status === 'CREATED' || analysisConfig.status === 'INVALID' || analysisConfig.status === 'COMPLETE')
    ? {
      type: 'incomplete-result',
      className: 'analysis-pending-pane',
      header: '',
      reason: (
        <Fragment></Fragment>
      )
    }
    : analysisConfigStatus !== 'ERROR'
    ? {
      type: 'incomplete-result',
      className: 'analysis-incomplete-pane',
      header: 'Results Unavailable:',
      reason: <Fragment>{reasonTextMap[analysisConfig.status]} </Fragment>
    }
    : {
      type: 'incomplete-result',
      className: 'analysis-incomplete-pane',
      header: 'Results Unavailable:',
      reason: <Fragment>{resultErrorMessage}</Fragment>
    },
  pluginRenderers: {
    formRenderer: locateFormPlugin(analysisConfig.analysisName).formRenderer,
    resultRenderer: locateResultPlugin(analysisConfig.analysisName).resultRenderer
  }
});

const displayToType = (display: string, choices: StepAnalysisType[]) => get(
  choices.find(({ displayName }) => display === displayName),
  'name',
  ''
);

const typeHasParameters = (display: string, choices: StepAnalysisType[]) => get(
  choices.find(({ name }) => display === name),
  'hasParameters',
  false
);

const typeToDisplay = (type: string, choices: StepAnalysisType[]) => get(
  choices.find(({ name }) => type === name),
  'displayName',
  ''
);

const reasonTextMap = {
  'CREATED': '',
  'INVALID': '',
  'COMPLETE': '',
  'PENDING': '',
  'RUNNING': '',
  'ERROR': 'A run of this analysis encountered an error before it could complete.',
  'INTERRUPTED': 'A run of this analysis was interrupted before it could complete',
  'OUT_OF_DATE': (
    'Your previous run\'s results are unavailable and must be ' +
    'regenerated.  Please confirm your parameters above and re-run.'
  ),
  'EXPIRED': (
    'The last run of this analysis took too long to complete and was ' +
    'cancelled.  If this problem persists, please contact us.'
  ),
  'STEP_REVISED': (
    'Your previous analysis results are not available because the result ' +
    'changed when you used the filter table above or revised a search ' +
    'strategy step. Please confirm your analysis parameters and re-run.'
  ),
  'UNKNOWN': ''
};

const SUMMARY_VIEW_TAB_PREFIX = 'summaryView';
const ANALYSIS_TAB_PREFIX = 'stepAnalysis';

interface TabDetail {
  type: typeof SUMMARY_VIEW_TAB_PREFIX | typeof ANALYSIS_TAB_PREFIX;
  id: string;
}

const tabSelectorRegexp = new RegExp(`^(${escapeRegExp(SUMMARY_VIEW_TAB_PREFIX)}|${escapeRegExp(ANALYSIS_TAB_PREFIX)}):(.*)`);
function parseTabSelector(selector: string): TabDetail | undefined {
  const matches = selector.match(tabSelectorRegexp);
  if (matches == null) return;
  const [ , type, id ] = matches;
  return { type, id } as TabDetail;
}
