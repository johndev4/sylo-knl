import { UserContext } from '@/components/providers/user-provider';
import { useContext } from 'react';

// Custom hook to consume the user in any Client Component
export const useUser = () => useContext(UserContext);
