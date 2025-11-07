import React, { useState } from 'react';
import type { Comment, UserProfile } from '../types';
import { LoaderIcon } from './icons';

interface CommentsSectionProps {
    comments: Comment[];
    currentUser: UserProfile;
    versionId: string;
    onAddComment: (versionId: string, content: string) => void;
}

export default function CommentsSection({ comments, currentUser, versionId, onAddComment }: CommentsSectionProps) {
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newComment.trim() === '') return;

        setIsSubmitting(true);
        await onAddComment(versionId, newComment);
        setNewComment('');
        setIsSubmitting(false);
    };

    const sortedComments = (comments || []).slice().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Comments</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {sortedComments.length > 0 ? (
                    sortedComments.map(comment => (
                        <div key={comment.id} className="flex items-start space-x-3">
                            <img className="h-8 w-8 rounded-full" src={comment.author.avatarUrl} alt={comment.author.firstName} />
                            <div className="flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                                <div className="flex justify-between items-center">
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{`${comment.author.firstName} ${comment.author.lastName}`}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(comment.createdAt).toLocaleString()}</p>
                                </div>
                                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{comment.content}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No comments on this version yet.</p>
                )}
            </div>
            <form onSubmit={handleSubmit} className="mt-4 flex items-start space-x-3">
                <img className="h-8 w-8 rounded-full" src={currentUser.avatarUrl} alt="You" />
                <div className="flex-1">
                    <textarea
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        rows={2}
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 focus:ring-primary focus:border-primary sm:text-sm"
                    />
                    <div className="mt-2 flex justify-end">
                        <button
                            type="submit"
                            disabled={isSubmitting || !newComment.trim()}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-900 bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                        >
                            {isSubmitting && <LoaderIcon className="w-4 h-4 mr-2" />}
                            Post Comment
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}