'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

interface Runner {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  documents?: string[];
  vehicleInfo?: {
    type: string;
    plateNumber: string;
  };
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  verificationData?: {
    ninImageURL: string;
    submittedAt: string;
    status: 'pending' | 'approved' | 'rejected';
    reviewerNotes?: string;
  };
}

interface VerificationData {
  userId: string;
  userRole: string;
  ninImageURL: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewerNotes?: string;
}

export default function RunnersPage() {
  const [runners, setRunners] = useState<Runner[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedRunner, setSelectedRunner] = useState<Runner | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchRunners();
  }, []);

  const fetchRunners = async () => {
    try {
      // Fetch runners
      const q = query(collection(db, 'runners'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const runnersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Runner[];

      // Fetch verification data
      const verificationSnapshot = await getDocs(
        query(collection(db, 'verification'), where('userRole', '==', 'runner'))
      );
      const verificationData = verificationSnapshot.docs.map(doc => ({
        ...doc.data()
      })) as VerificationData[];

      // Merge verification data with runners
      const runnersWithVerification = runnersData.map(runner => {
        const verification = verificationData.find(v => v.userId === runner.id);
        return {
          ...runner,
          verificationStatus: verification?.status || 'pending',
          verificationData: verification ? {
            ninImageURL: verification.ninImageURL,
            submittedAt: verification.submittedAt,
            status: verification.status,
            reviewerNotes: verification.reviewerNotes
          } : undefined
        };
      });

      setRunners(runnersWithVerification);
    } catch (error) {
      console.error('Error fetching runners:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateRunnerStatus = async (runnerId: string, status: 'approved' | 'rejected') => {
    setIsUpdating(true);
    try {
      // Update runner status
      await updateDoc(doc(db, 'runners', runnerId), {
        status,
        updatedAt: new Date(),
      });

      // Update verification status
      await updateDoc(doc(db, 'verification', `${runnerId}_runner`), {
        status,
        reviewedAt: new Date().toISOString(),
        reviewerNotes: reviewNotes || null,
      });

      // Update user verification status
      await updateDoc(doc(db, 'users', runnerId), {
        verificationStatus: status,
        verificationReviewedAt: new Date().toISOString(),
      });
      
      // Update local state
      setRunners(prev => prev.map(runner => 
        runner.id === runnerId ? {
          ...runner,
          status: status,
          verificationStatus: status,
          verificationData: {
            ...runner.verificationData,
            status: status,
            reviewerNotes: reviewNotes || undefined,
            ninImageURL: runner.verificationData?.ninImageURL || '',
            submittedAt: runner.verificationData?.submittedAt || new Date().toISOString(),
          }
        } : runner
      ));

      setShowVerificationModal(false);
      setSelectedRunner(null);
      setReviewNotes('');
    } catch (error) {
      console.error('Error updating runner status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const openVerificationModal = (runner: Runner) => {
    setSelectedRunner(runner);
    setReviewNotes(runner.verificationData?.reviewerNotes || '');
    setShowVerificationModal(true);
  };

  const filteredRunners = runners.filter(runner => 
    filter === 'all' ? true : runner.verificationStatus === filter
  );

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses[status as keyof typeof statusClasses]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Runners Management</h1>
        <p className="text-gray-600">Manage and verify runner applications</p>
      </div>

      <div className="mb-6">
        <div className="flex space-x-4">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                filter === status
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredRunners.map((runner) => (
            <li key={runner.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {runner.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">{runner.name}</p>
                        <div className="ml-2">{getStatusBadge(runner.verificationStatus || 'pending')}</div>
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <p>{runner.email}</p>
                        <span className="mx-2">•</span>
                        <p>{runner.phone}</p>
                      </div>
                      {runner.vehicleInfo && (
                        <div className="mt-1 text-sm text-gray-500">
                          <p>Vehicle: {runner.vehicleInfo.type} - {runner.vehicleInfo.plateNumber}</p>
                        </div>
                      )}
                      {runner.verificationData && (
                        <div className="mt-1 text-sm text-gray-500">
                          <p>Submitted: {new Date(runner.verificationData.submittedAt).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {runner.verificationStatus === 'pending' && (
                      <>
                        <button
                          onClick={() => openVerificationModal(runner)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Review NIN
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => openVerificationModal(runner)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {filteredRunners.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No runners found.</p>
        </div>
      )}

      {/* Verification Modal */}
      {showVerificationModal && selectedRunner && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Review NIN Verification - {selectedRunner.name}
                </h3>
                <button
                  onClick={() => setShowVerificationModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {selectedRunner.verificationData?.ninImageURL ? (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">NIN Image:</h4>
                  <img
                    src={selectedRunner.verificationData.ninImageURL}
                    alt="NIN Card"
                    className="w-32 h-20 object-cover rounded"
                  />
                </div>
              ) : (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-yellow-800">No NIN image uploaded yet.</p>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review Notes:
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  placeholder="Add review notes (optional)..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowVerificationModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                {selectedRunner.verificationStatus === 'pending' && (
                  <>
                    <button
                      onClick={() => updateRunnerStatus(selectedRunner.id, 'rejected')}
                      disabled={isUpdating}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
                    >
                      {isUpdating ? 'Rejecting...' : 'Reject'}
                    </button>
                    <button
                      onClick={() => updateRunnerStatus(selectedRunner.id, 'approved')}
                      disabled={isUpdating}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50"
                    >
                      {isUpdating ? 'Approving...' : 'Approve'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
