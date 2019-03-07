import * as React from 'react';
import {
  Answer,
  RecordClass,
  Question,
  PrimaryKey,
  AttributeSortingSpec,
} from 'wdk-client/Utils/WdkModel';
import { CategoryTreeNode } from 'wdk-client/Utils/CategoryUtils';
import { makeClassNameHelper } from 'wdk-client/Utils/ComponentUtils';
import ResultTable, { Action } from 'wdk-client/Views/ResultTableSummaryView/ResultTable';
import ResultTableAddColumnsDialog from 'wdk-client/Views/ResultTableSummaryView/ResultTableAddColumnsDialog';
import Loading from 'wdk-client/Components/Loading/Loading';

import './ResultTableSummaryView.scss';

// Export this for convenience
export { Action };

interface Props {
  answer?: Answer;
  answerLoading: boolean;
  addingStepToBasket: boolean;
  actions?: Action[];
  selectedIds?: string[];
  activeAttributeAnalysisName: string | undefined;
  stepId: number;
  recordClass?: RecordClass;
  question?: Question;
  basketStatusArray?: Array<'yes' | 'no' | 'loading'>;
  columnsDialogIsOpen: boolean;
  columnsDialogSelection?: string[];
  columnsDialogExpandedNodes?: string[];
  columnsTree?: CategoryTreeNode;
  requestSortingUpdate: (
    sorting: AttributeSortingSpec[],
    questionName: string
  ) => void;
  requestColumnsChoiceUpdate: (columns: string[], questionName: string) => void;
  requestUpdateBasket: (
    operation: 'add' | 'remove',
    recordClass: string,
    primaryKeys: PrimaryKey[]
  ) => void;
  requestAddStepToBasket: (
    stepId: number
  ) => void;
  requestPageSizeUpdate: (pageSize: number) => void;
  viewPageNumber: (pageNumber: number) => void;
  showHideAddColumnsDialog: (show: boolean) => void;
  updateColumnsDialogSelection: (attributes: string[]) => void;
  updateColumnsDialogExpandedNodes: (nodes: string[]) => void;
  openAttributeAnalysis: (reporterName: string, stepId: number) => void;
  closeAttributeAnalysis: (reporterName: string, stepId: number) => void;
  updateSelectedIds: (ids: string[]) => void;
}

const cx = makeClassNameHelper('ResultTableSummaryView');

export default function ResultTableSummaryView({
  answer,
  answerLoading,
  addingStepToBasket,
  actions,
  selectedIds,
  activeAttributeAnalysisName,
  stepId,
  recordClass,
  question,
  basketStatusArray,
  requestColumnsChoiceUpdate,
  requestSortingUpdate,
  requestUpdateBasket,
  requestAddStepToBasket,
  requestPageSizeUpdate,
  viewPageNumber,
  showHideAddColumnsDialog,
  columnsDialogExpandedNodes,
  columnsDialogIsOpen,
  columnsDialogSelection,
  columnsTree,
  updateColumnsDialogSelection,
  updateColumnsDialogExpandedNodes,
  openAttributeAnalysis,
  closeAttributeAnalysis,
  updateSelectedIds,
}: Props) {
  return (
    <div className={cx()}>
      {(answerLoading || addingStepToBasket) &&
        <div className={cx('LoadingOverlay')}>
          <Loading className={cx('Loading')}>
            {answerLoading ? 'Loading results...' : 'Updating basket...'}
          </Loading>
        </div>
      }
      {answer && question && columnsTree &&
        <ResultTableAddColumnsDialog
          answer={answer}
          question={question}
          columnsDialogExpandedNodes={columnsDialogExpandedNodes}
          columnsDialogIsOpen={columnsDialogIsOpen}
          columnsDialogSelection={columnsDialogSelection}
          columnsTree={columnsTree}
          showHideAddColumnsDialog={showHideAddColumnsDialog}
          updateColumnsDialogExpandedNodes={updateColumnsDialogExpandedNodes}
          updateColumnsDialogSelection={updateColumnsDialogSelection}
          requestColumnsChoiceUpdate={requestColumnsChoiceUpdate}
        />
      }
      {answer && recordClass && question ? (
        <ResultTable
          answer={answer}
          actions={actions}
          selectedIds={selectedIds}
          activeAttributeAnalysisName={activeAttributeAnalysisName}
          stepId={stepId}
          question={question}
          recordClass={recordClass}
          basketStatusArray={basketStatusArray}
          requestColumnsChoiceUpdate={requestColumnsChoiceUpdate}
          requestSortingUpdate={requestSortingUpdate}
          requestUpdateBasket={requestUpdateBasket}
          requestAddStepToBasket={requestAddStepToBasket}
          requestPageSizeUpdate={requestPageSizeUpdate}
          viewPageNumber={viewPageNumber}
          showHideAddColumnsDialog={showHideAddColumnsDialog}
          openAttributeAnalysis={openAttributeAnalysis}
          closeAttributeAnalysis={closeAttributeAnalysis}
          updateSelectedIds={updateSelectedIds}
        />
      ) : null}
    </div>
  );
}
