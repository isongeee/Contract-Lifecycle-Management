import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Comment, UserProfile } from '../types';
import { SparklesIcon, LoaderIcon } from './icons';
import { suggestCommentReply } from '../services/geminiService';

interface CommentsPanelProps {
    comments: Comment[];
    users: UserProfile[];
    currentUser: UserProfile;
    versionId: string;
    contractContent: string;
    onCreateComment: (versionId: string, content: string) => void;
    onResolveComment: (commentId: string, isResolved: boolean) => void;
}

const renderWithMentions = (content: string, users: UserProfile[]) => {
    if (!users || users.length === 0) {
        return [content];
    }

    // Escape special regex characters.
    const escapeRegex = (str: string) => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

    // Create a regex that matches any of the user names.
    // Sort by length descending to match longer names first (e.g., "Nilo test" before "Nilo")
    const userNames = users
        .map(u => `${u.firstName} ${u.lastName}`)
        .sort((a, b) => b.length - a.length);

    // The regex captures the @ and the name. \b ensures we don't match partial names within longer words.
    const regex = new RegExp(`(@(?:${userNames.map(escapeRegex).join('|')}))\\b`, 'gi');
    
    const result: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
        // Add text before the match
        const preMatch = content.substring(lastIndex, match.index);
        if (preMatch) {
            result.push(preMatch);
        }
        
        // Add the styled mention
        result.push(
            <span key={match.index} className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-200 font-semibold rounded px-1 py-0.5 mx-px">
                {match[0]}
            </span>
        );

        lastIndex = regex.lastIndex;
    }

    // Add any remaining text after the last match
    const rest = content.substring(lastIndex);
    if (rest) {
        result.push(rest);
    }

    // If no matches, return the original content
    return result.length > 0 ? result : [content];
};


export default function CommentsPanel({ comments, users, currentUser, versionId, contractContent, onCreateComment, onResolveComment }: CommentsPanelProps) {
    const [newComment, setNewComment] = useState('');
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [showMentions, setShowMentions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const mentionsRef = useRef<HTMLDivElement>(null); // Ref for the mentions dropdown

    const filteredUsers = useMemo(() => {
        if (!mentionQuery) return users;
        return users.filter(user =>
            `${user.firstName} ${user.lastName}`.toLowerCase().includes(mentionQuery.toLowerCase())
        );
    }, [users, mentionQuery]);
    
    // Close mentions dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                textareaRef.current && !textareaRef.current.contains(event.target as Node) &&
                mentionsRef.current && !mentionsRef.current.contains(event.target as Node)
            ) {
                setShowMentions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);


    const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setNewComment(text);

        const cursorPosition = e.target.selectionStart;
        const textBeforeCursor = text.substring(0, cursorPosition);
        // Allow spaces in mention query
        const atMatch = textBeforeCursor.match(/@([\w\s]*)$/);

        if (atMatch) {
            setShowMentions(true);
            setMentionQuery(atMatch[1]);
        } else {
            setShowMentions(false);
        }
    };

    const handleMentionSelect = (user: UserProfile) => {
        const cursorPosition = textareaRef.current!.selectionStart;
        const textBeforeCursor = newComment.substring(0, cursorPosition);
        
        // Find the start of the current @mention query
        const atMatch = textBeforeCursor.match(/@[\w\s]*$/);
        if (!atMatch || typeof atMatch.index === 'undefined') {
            setShowMentions(false);
            return;
        }

        const atMatchIndex = atMatch.index;
        const prefix = newComment.substring(0, atMatchIndex);
        const suffix = newComment.substring(cursorPosition);
        const fullName = `@${user.firstName} ${user.lastName}`;
        
        const newText = `${prefix}${fullName} ${suffix}`;
        setNewComment(newText);
        
        setShowMentions(false);

        // Use a timeout to ensure the state update has rendered before we manipulate the DOM
        setTimeout(() => {
            const newCursorPosition = (prefix + fullName).length + 1; // +1 for the space after
            textareaRef.current?.focus();
            textareaRef.current?.setSelectionRange(newCursorPosition, newCursorPosition);
        }, 0);
    };

    const handlePostComment = () => {
        if (newComment.trim()) {
            onCreateComment(versionId, newComment);
            setNewComment('');
        }
    };

    const handleSuggestReply = async () => {
        setIsSuggesting(true);
        const thread = (comments || []).map(c => ({ author: `${c.author.firstName} ${c.author.lastName}`, content: c.content }));
        const suggestion = await suggestCommentReply(contractContent, thread);
        setNewComment(suggestion);
        setIsSuggesting(false);
    };
    
    const unresolvedComments = (comments || []).filter(c => !c.resolvedAt).sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const resolvedComments = (comments || []).filter(c => c.resolvedAt).sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm h-full flex flex-col">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Comments</h3>
            <div className="flex-grow overflow-y-auto space-y-4 pr-2">
                {unresolvedComments.length === 0 && resolvedComments.length === 0 && (
                     <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No comments on this version yet.</p>
                )}
                {unresolvedComments.map(comment => (
                    <div key={comment.id} className="flex space-x-3">
                        <img src={comment.author.avatarUrl} alt={comment.author.firstName} className="w-8 h-8 rounded-full" />
                        <div className="flex-1">
                            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{`${comment.author.firstName} ${comment.author.lastName}`}</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{renderWithMentions(comment.content, users)}</p>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex space-x-2">
                                <span>{new Date(comment.createdAt).toLocaleString()}</span>
                                <button onClick={() => onResolveComment(comment.id, true)} className="font-semibold hover:underline">Resolve</button>
                            </div>
                        </div>
                    </div>
                ))}
                {resolvedComments.length > 0 && (
                    <details className="pt-4">
                        <summary className="text-sm font-semibold text-gray-500 cursor-pointer">View {resolvedComments.length} resolved comments</summary>
                         <div className="space-y-4 mt-2">
                             {resolvedComments.map(comment => (
                                <div key={comment.id} className="flex space-x-3 opacity-60">
                                    <img src={comment.author.avatarUrl} alt={comment.author.firstName} className="w-8 h-8 rounded-full" />
                                    <div className="flex-1">
                                        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
                                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{`${comment.author.firstName} ${comment.author.lastName}`}</p>
                                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap line-through">{renderWithMentions(comment.content, users)}</p>
                                        </div>
                                         <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex space-x-2">
                                            <span>Resolved on {new Date(comment.resolvedAt!).toLocaleString()}</span>
                                            <button onClick={() => onResolveComment(comment.id, false)} className="font-semibold hover:underline">Unresolve</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </details>
                )}
            </div>
            <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex space-x-3">
                    <img src={currentUser.avatarUrl} alt="You" className="w-8 h-8 rounded-full" />
                    <div className="flex-1 relative">
                        {showMentions && (
                            <div ref={mentionsRef} className="absolute bottom-full mb-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto z-10">
                                {filteredUsers.length > 0 ? filteredUsers.map(user => (
                                    <button
                                        key={user.id}
                                        onClick={() => handleMentionSelect(user)}
                                        className="w-full text-left flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                        <img src={user.avatarUrl} alt={user.firstName} className="w-6 h-6 rounded-full mr-2" />
                                        <span className="text-sm font-medium">{`${user.firstName} ${user.lastName}`}</span>
                                        <span className="text-xs text-gray-500 ml-2">{user.role}</span>
                                    </button>
                                )) : (
                                    <div className="p-2 text-sm text-gray-500">No users found</div>
                                )}
                            </div>
                        )}
                         <textarea 
                            ref={textareaRef}
                            value={newComment}
                            onChange={handleCommentChange}
                            rows={3}
                            placeholder="Add a comment... Type @ to mention a user."
                            className="w-full text-sm p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary focus:border-primary bg-white dark:bg-gray-900"
                        />
                         <div className="mt-2 flex justify-between">
                            <button onClick={handleSuggestReply} disabled={isSuggesting} className="flex items-center text-xs font-semibold text-primary-700 dark:text-primary-300 hover:text-primary-900 disabled:opacity-50">
                                <SparklesIcon className="w-4 h-4 mr-1" />
                                {isSuggesting ? 'Thinking...' : 'Suggest Reply'}
                            </button>
                            <button onClick={handlePostComment} className="px-3 py-1.5 text-xs font-semibold text-white bg-primary-600 rounded-md hover:bg-primary-700">
                                Post
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}