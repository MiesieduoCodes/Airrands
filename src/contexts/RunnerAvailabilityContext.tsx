import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getProfile, updateAvailability } from '../services/runnerServices';

interface RunnerAvailabilityContextType {
  isAvailable: boolean;
  setAvailability: (value: boolean) => Promise<void>;
  loading: boolean;
}

const RunnerAvailabilityContext = createContext<RunnerAvailabilityContextType | undefined>(undefined);

export const RunnerAvailabilityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, role } = useAuth();
  const [isAvailable, setIsAvailable] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch initial availability when user or role changes
  useEffect(() => {
    const fetchAvailability = async () => {
      if (user?.uid && role === 'runner') {
        setLoading(true);
        try {
          const profile = await getProfile(user.uid);
          const availability = profile.status === 'available';
          setIsAvailable(availability);
          setIsInitialized(true);
        } catch (e) {
          console.error('Error fetching availability:', e);
          setIsAvailable(true); // fallback
          setIsInitialized(true);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchAvailability();
  }, [user?.uid, role]);

  // Update availability in backend and state
  const setAvailability = async (value: boolean) => {
    if (!user?.uid || !isInitialized) return;
    
    // Prevent rapid toggling
    if (loading) return;
    
    setLoading(true);
    try {
      await updateAvailability(user.uid, value);
      setIsAvailable(value);
    } catch (e) {
      console.error('Error updating availability:', e);
      // Don't revert on error to prevent shaking
    } finally {
      setLoading(false);
    }
  };

  return (
    <RunnerAvailabilityContext.Provider value={{ isAvailable, setAvailability, loading }}>
      {children}
    </RunnerAvailabilityContext.Provider>
  );
};

export const useRunnerAvailability = () => {
  const context = useContext(RunnerAvailabilityContext);
  if (context === undefined) {
    throw new Error('useRunnerAvailability must be used within a RunnerAvailabilityProvider');
  }
  return context;
}; 