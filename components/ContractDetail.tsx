import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { Contract, Clause, Property, ContractStatus as ContractStatusType, ContractVersion, UserProfile, SigningStatus, Comment } from '../types';
import { ContractStatus, ApprovalStatus, SigningStatus as SigningStatusEnum } from '../types';
import StatusTag from './StatusTag';
import { ArrowLeftIcon, SparklesIcon, LoaderIcon, CopyIcon, FileTextIcon, ChevronDownIcon, ArchiveIcon, CheckCircleIcon, XCircleIcon, HomeIcon, ClockIcon, RefreshCwIcon, PenSquareIcon } from './icons';
import { APPROVAL_STATUS_COLORS } from '../constants';
import { summarizeContractRisk, extractClauses } from '../services/geminiService';
import CreateVersionModal from './CreateVersionModal';
import RequestApprovalModal from './RequestApprovalModal';
import ConfirmStatusChangeModal from './ConfirmStatusChangeModal';
import RenewalDecisionModal from './RenewalDecisionModal';
import RenewalWorkspace from './RenewalWorkspace';
import CommentsSection from './CommentsSection';

// Quill and Diff are loaded from CDN in index.html, so we declare them for TypeScript
declare var Quill: any;
declare var Diff: any;

interface ContractDetailProps {
  contract: Contract;
  contracts: Contract[];
  onSelectContract: (contract: Contract) => void;
  users: UserProfile[];
  properties: Property[];
  currentUser: UserProfile;
  onBack: () => void;
  onTransition: (contractId: string, action: ContractStatus | 'APPROVE_STEP' | 'REJECT_STEP', payload?: any) => void;
  onCreateNewVersion: (contractId: string, newVersionData: Omit<ContractVersion, 'id' | 'versionNumber' | 'createdAt' | 'author'>) => void;
  onUpdateVersionContent: (versionId: string, newContent: string) => Promise<void>;
  onCreateComment: (versionId: string, content: string) => Promise<void>;
  onRenewalStatusUpdate: (renewalRequestId: string, newStatus: any) => void;
  onActivateRenewal: (contract: Contract) => void;
  onCreateRenewalRequest: (contract: Contract) => void;
  onRenewalDecision: (renewalRequestId: string, mode: any, notes?: string) => void;
  onFinalizeDraft: (contract: Contract, draftContent: string) => void;
  onUpdateSigningStatus: (contractId: string, status: SigningStatus) => void;
}

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
    <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{value || <span className="text-gray-400 dark:text-gray-500">N/A</span>}</dd>
  </div>
);

const SigningProgressWidget = ({ contract, onUpdateStatus }: { contract: Contract; onUpdateStatus: (contractId: string, status: SigningStatus) => void; }) => {
    const statuses: SigningStatus[] = [
        SigningStatusEnum.AWAITING_INTERNAL,
        SigningStatusEnum.SENT_TO_COUNTERPARTY,
        SigningStatusEnum.VIEWED_BY_COUNTERPARTY,
        SigningStatusEnum.SIGNED_BY_COUNTERPARTY,
    ];

    const currentStatusIndex = contract.signingStatus ? statuses.indexOf(contract.signingStatus) : -1;

    const getNextStatus = () => {
        if (currentStatusIndex >= 0 && currentStatusIndex < statuses.length - 1) {
            return statuses[currentStatusIndex + 1];
        }
        return null;
    };

    const nextStatus = getNextStatus();

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Signing Progress</h3>
            <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-2">
                {statuses.map((status, index) => (
                    <li key={status} className="mb-6 ml-6">
                        <span className={`absolute flex items-center justify-center w-6 h-6 rounded-full -left-3 ring-8 ring-white dark:ring-gray-800 ${index <= currentStatusIndex ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-600'}`}>
                           {index <= currentStatusIndex && <CheckCircleIcon className="w-4 h-4 text-white" />}
                        </span>
                        <h4 className={`font-semibold ${index <= currentStatusIndex ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>{status}</h4>
                    </li>
                ))}
            </ol>
            {nextStatus && (
                <div className="mt-4">
                    <button onClick={() => onUpdateStatus(contract.id, nextStatus)} className="w-full px-4 py-2 text-sm font-semibold text-primary-900 bg-primary rounded-lg hover:bg-primary-600">
                        Advance to: {nextStatus}
                    </button>
                </div>
            )}
        </div>
    );
};

export default function ContractDetail(props: ContractDetailProps) {
  const { contract, onBack, onTransition, onCreateNewVersion, users, properties, onUpdateVersionContent, onCreateComment } = props;
  const [selectedVersionId, setSelectedVersionId] = useState<string>(contract.versions[contract.versions.length - 1]?.id);
  const selectedVersion = useMemo(() => contract.versions.find(v => v.id === selectedVersionId), [contract.versions, selectedVersionId]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ summary?: string; clauses?: Clause[] } | null>(null);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [isRequestingApproval, setIsRequestingApproval] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ContractStatus | 'APPROVE_STEP' | 'REJECT_STEP' | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isRenewalWorkspaceOpen, setIsRenewalWorkspaceOpen] = useState(false);
  const [renewalDecisionMode, setRenewalDecisionMode] = useState<boolean>(false);

  useEffect(() => {
    setSelectedVersionId(contract.versions[contract.versions.length - 1]?.id);
    setAnalysisResult(null);
    setShowCompare(false);
    setIsEditing(false);
    setEditedContent(null);
  }, [contract]);
  
  const quillRef = React.useRef<any>(null);
  const quillEditorRef = React.useRef<any>(null);
  
  useEffect(() => {
    if (selectedVersion && quillRef.current) {
      const isReadOnly = contract.status !== ContractStatus.DRAFT;
      
      if (!quillEditorRef.current) {
        quillEditorRef.current = new Quill(quillRef.current, {
          theme: 'snow',
          readOnly: isReadOnly,
          modules: { toolbar: isReadOnly ? false : [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{'list': 'ordered'}, {'list': 'bullet'}],
            ['link'], ['clean']
          ]},
        });
      } else {
        quillEditorRef.current.enable(!isReadOnly);
      }
      
      if (editedContent === null) {
        quillEditorRef.current.clipboard.dangerouslyPasteHTML(0, selectedVersion.content);
        setEditedContent(selectedVersion.content);
      }
      
      quillEditorRef.current.on('text-change', () => {
        setEditedContent(quillEditorRef.current.root.innerHTML);
      });
    }
  }, [selectedVersion, contract.status, editedContent]);
  

  const handleAnalyze = useCallback(async () => {
    if (!selectedVersion?.content) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const [summary, clauses] = await Promise.all([
        summarizeContractRisk(selectedVersion.content),
        extractClauses(selectedVersion.content),
      ]);
      setAnalysisResult({ summary, clauses });
    } catch (error) {
      console.error("Analysis failed:", error);
      setAnalysisResult({ summary: "Error during analysis." });
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedVersion]);
  
  const handleSaveChanges = async () => {
    if (selectedVersion && editedContent !== null) {
      setIsSaving(true);
      await onUpdateVersionContent(selectedVersion.id, editedContent);
      setIsSaving(false);
      setIsEditing(false);
    }
  };

  const versionToCompare = useMemo(() => {
    if (showCompare && selectedVersion) {
      const currentIndex = contract.versions.findIndex(v => v.id === selectedVersion.id);
      return currentIndex > 0 ? contract.versions[currentIndex - 1] : null;
    }
    return null;
  }, [showCompare, selectedVersion, contract.versions]);
  
  const redlineContent = useMemo(() => {
    if (!versionToCompare || !selectedVersion) return null;
    const diff = Diff.diffWords(versionToCompare.content, selectedVersion.content);
    let html = '';
    diff.forEach((part: any) => {
      const color = part.added ? 'ins' : part.removed ? 'del' : 'span';
      html += `<${color}>${part.value}</${color}>`;
    });
    return html;
  }, [versionToCompare, selectedVersion]);

  const renderContent = () => {
    if (showCompare && redlineContent) {
      return <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-md prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: redlineContent }} />;
    }
    return <div ref={quillRef} />;
  };
  
  const canCreateNewVersion = contract.status !== ContractStatus.DRAFT;
  const canRequestApproval = contract.status === ContractStatus.DRAFT || contract.status === ContractStatus.IN_REVIEW;

  if (isRenewalWorkspaceOpen) {
    return <RenewalWorkspace contract={contract} onSendForApproval={(draft) => { props.onFinalizeDraft(contract, draft); setIsRenewalWorkspaceOpen(false); }} onBack={() => setIsRenewalWorkspaceOpen(false)} />;
  }

  return (
    <div>
      <button onClick={onBack} className="flex items-center text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 mb-4">
        <ArrowLeftIcon className="w-4 h-4 mr-2" />
        Back to all contracts
      </button>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm mb-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{contract.title}</h1>
              <StatusTag type="contract" status={contract.status} />
            </div>
            <p className="text-md text-gray-600 dark:text-gray-400 mt-1">vs. {contract.counterparty.name}</p>
          </div>
          <div className="flex items-center space-x-2">
            {canCreateNewVersion && <button onClick={() => setIsCreatingVersion(true)} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Create New Version</button>}
            {canRequestApproval && <button onClick={() => setIsRequestingApproval(true)} className="px-4 py-2 text-sm font-semibold text-primary-900 bg-primary rounded-lg shadow-sm hover:bg-primary-600">Request Approval</button>}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Contract Content</h3>
                <div className="flex items-center space-x-3">
                    {versionToCompare && (
                        <label className="flex items-center space-x-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={showCompare} onChange={e => setShowCompare(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"/>
                            <span>Compare w/ v{versionToCompare.versionNumber}</span>
                        </label>
                    )}
                    {contract.status === ContractStatus.DRAFT && (
                      isEditing ? (
                        <>
                          <button onClick={() => { setIsEditing(false); setEditedContent(selectedVersion?.content || null); }} className="px-3 py-1 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                          <button onClick={handleSaveChanges} disabled={isSaving} className="px-3 py-1 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center">
                            {isSaving && <LoaderIcon className="w-4 h-4 mr-2" />} Save Changes
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setIsEditing(true)} className="px-3 py-1 text-sm font-semibold text-primary-900 bg-primary rounded-md hover:bg-primary-600">Edit</button>
                      )
                    )}
                </div>
            </div>
            {renderContent()}
          </div>
          {selectedVersion && <CommentsSection comments={selectedVersion.comments || []} currentUser={props.currentUser} versionId={selectedVersion.id} onAddComment={onCreateComment} />}
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Details</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
              <DetailItem label="Value" value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(contract.value)} />
              <DetailItem label="Risk Level" value={<StatusTag type="risk" status={contract.riskLevel} />} />
              <DetailItem label="Effective Date" value={contract.effectiveDate} />
              <DetailItem label="End Date" value={contract.endDate} />
              <DetailItem label="Owner" value={`${contract.owner.firstName} ${contract.owner.lastName}`} />
              <DetailItem label="Contract Type" value={contract.type} />
              {contract.property && <DetailItem label="Property" value={contract.property.name} />}
            </dl>
          </div>
          
          {contract.status === ContractStatus.SENT_FOR_SIGNATURE && (
              <SigningProgressWidget contract={contract} onUpdateStatus={props.onUpdateSigningStatus} />
          )}

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Version History</h3>
              <select value={selectedVersionId} onChange={e => setSelectedVersionId(e.target.value)} className="text-sm rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 focus:ring-primary focus:border-primary">
                {contract.versions.slice().reverse().map(v => (
                  <option key={v.id} value={v.id}>Version {v.versionNumber} ({v.createdAt})</option>
                ))}
              </select>
            </div>
            {/* Version details can go here if needed */}
          </div>
          
           {contract.approvalSteps.length > 0 && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Approval Status</h3>
              <ul>
                {contract.approvalSteps.map(step => (
                  <li key={step.id} className="flex items-start space-x-3 mb-3">
                    <div className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center ${APPROVAL_STATUS_COLORS[step.status]}`}>
                        <CheckCircleIcon className="w-3 h-3 text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold">{step.approver.firstName} {step.approver.lastName}</p>
                        <p className={`text-xs font-semibold ${APPROVAL_STATUS_COLORS[step.status]}`}>{step.status}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Gemini AI Analysis</h3>
              <button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full flex items-center justify-center px-4 py-2 text-sm font-semibold text-primary-900 bg-primary rounded-lg shadow-sm hover:bg-primary-600 disabled:opacity-50">
                {isAnalyzing ? <LoaderIcon className="w-5 h-5 mr-2" /> : <SparklesIcon className="w-5 h-5 mr-2" />}
                {isAnalyzing ? 'Analyzing...' : 'Analyze for Risks & Clauses'}
              </button>
              {analysisResult && (
                <div className="mt-4 space-y-4">
                  <div>
                    <h4 className="font-semibold">Risk Summary</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{analysisResult.summary}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold">Extracted Clauses</h4>
                    <ul className="space-y-2 mt-2">
                    {analysisResult.clauses?.map(clause => (
                      <li key={clause.id} className="text-sm p-2 bg-gray-50 rounded-md">
                        <strong className="block">{clause.title}</strong>
                        {clause.summary}
                      </li>
                    ))}
                    </ul>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
      {isCreatingVersion && <CreateVersionModal contract={contract} properties={properties} onClose={() => setIsCreatingVersion(false)} onSave={(data) => { onCreateNewVersion(contract.id, data); setIsCreatingVersion(false); }} />}
      {isRequestingApproval && <RequestApprovalModal contract={contract} users={users} onClose={() => setIsRequestingApproval(false)} onSave={(approvers, versionId) => { onTransition(contract.id, ContractStatus.PENDING_APPROVAL, { approvers, versionId }); setIsRequestingApproval(false); }} />}
      {confirmAction && <ConfirmStatusChangeModal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} onConfirm={() => { onTransition(contract.id, confirmAction!); setConfirmAction(null); }} contractTitle={contract.title} currentStatus={contract.status} action={confirmAction} />}
      {renewalDecisionMode && <RenewalDecisionModal contract={contract} contracts={props.contracts} onClose={() => setRenewalDecisionMode(false)} onConfirm={(mode, notes) => { props.onRenewalDecision(contract.renewalRequest!.id, mode, notes); setRenewalDecisionMode(false); }} />}
    </div>
  );
}
