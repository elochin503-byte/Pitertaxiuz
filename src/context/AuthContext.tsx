import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Driver, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  driver: Driver | null;
  role: UserRole | 'GUEST';
  allUsers: User[];
  allDrivers: Driver[];
  isLoading: boolean;
  switchPersona: (role: UserRole, customUserId?: string) => Promise<void>;
  loginWithCredentials: (user: User) => void;
  registerClient: (user: User) => void;
  logout: () => void;
  updateUser: (updated: Partial<User>) => void;
  updateDriver: (updated: Partial<Driver>) => void;
  loginWithTelegram: (tgData: { id: number; first_name: string; username?: string; phone?: string }) => Promise<void>;
  refreshAuth: (targetUserId?: string) => Promise<void>;
  deleteUserById: (userId: string) => Promise<boolean>;
  deleteDriverById: (driverId: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('piter_taxi_saved_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [driver, setDriver] = useState<Driver | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allDrivers, setAllDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchUsersAndDrivers = async () => {
    try {
      const [uRes, dRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/drivers')
      ]);
      if (uRes.ok) {
        const uList = await uRes.json();
        setAllUsers(uList);
      }
      if (dRes.ok) {
        const dList = await dRes.json();
        setAllDrivers(dList);
      }
    } catch (e) {
      console.warn('Failed fetching users/drivers:', e);
    }
  };

  const refreshAuth = async (targetUserId?: string) => {
    const idToFetch = targetUserId || user?.id;
    if (!idToFetch) {
      await fetchUsersAndDrivers();
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/auth/me?userId=${idToFetch}`);
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          localStorage.setItem('piter_taxi_saved_user', JSON.stringify(data.user));
          setDriver(data.driver || null);
        } else {
          // User was removed/not found
          setUser(null);
          setDriver(null);
          localStorage.removeItem('piter_taxi_saved_user');
        }
      }
      await fetchUsersAndDrivers();
    } catch (e) {
      console.warn('Refresh auth error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('piter_taxi_saved_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.id) {
          refreshAuth(parsed.id);
          return;
        }
      } catch (e) {}
    }
    fetchUsersAndDrivers().finally(() => setIsLoading(false));
  }, []);

  const loginWithCredentials = (loggedUser: User) => {
    setUser(loggedUser);
    localStorage.setItem('piter_taxi_saved_user', JSON.stringify(loggedUser));
    const matchDriver = allDrivers.find(d => d.userId === loggedUser.id);
    setDriver(matchDriver || null);
    refreshAuth(loggedUser.id);
  };

  const registerClient = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('piter_taxi_saved_user', JSON.stringify(newUser));
    setDriver(null);
    refreshAuth(newUser.id);
  };

  const logout = () => {
    localStorage.removeItem('piter_taxi_saved_user');
    setUser(null);
    setDriver(null);
  };

  const switchPersona = async (targetRole: UserRole, customUserId?: string) => {
    setIsLoading(true);
    let targetUser: User | undefined;

    if (customUserId) {
      targetUser = allUsers.find(u => u.id === customUserId);
    } else {
      if (targetRole === 'SUPERADMIN' || targetRole === 'ADMIN') {
        targetUser = allUsers.find(u => u.role === 'SUPERADMIN' || u.role === 'ADMIN');
      } else if (targetRole === 'DRIVER') {
        targetUser = allUsers.find(u => u.role === 'DRIVER');
      } else {
        targetUser = allUsers.find(u => u.role === 'CLIENT');
      }
    }

    if (targetUser) {
      setUser(targetUser);
      localStorage.setItem('piter_taxi_saved_user', JSON.stringify(targetUser));
      const matchDriver = allDrivers.find(d => d.userId === targetUser!.id);
      setDriver(matchDriver || null);
      await refreshAuth(targetUser.id);
    }
    setIsLoading(false);
  };

  const loginWithTelegram = async (tgData: { id: number; first_name: string; username?: string; phone?: string }) => {
    try {
      const res = await fetch('/api/auth/telegram-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: tgData.id,
          username: tgData.username,
          fullName: tgData.first_name,
          phone: tgData.phone || '+7 900 123 4567',
          role: 'CLIENT'
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          localStorage.setItem('piter_taxi_saved_user', JSON.stringify(data.user));
        }
        setDriver(data.driver || null);
        await fetchUsersAndDrivers();
      }
    } catch (e) {
      console.error('Telegram login error:', e);
    }
  };

  const updateUser = (updated: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const n = { ...prev, ...updated };
      localStorage.setItem('piter_taxi_saved_user', JSON.stringify(n));
      return n;
    });
  };

  const updateDriver = (updated: Partial<Driver>) => {
    setDriver(prev => (prev ? { ...prev, ...updated } : null));
  };

  const deleteUserById = async (userId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        setAllUsers(prev => prev.filter(u => u.id !== userId));
        setAllDrivers(prev => prev.filter(d => d.userId !== userId && d.id !== userId));
        if (user?.id === userId) {
          logout();
        }
        return true;
      }
    } catch (e) {
      console.error('Failed to delete user:', e);
    }
    return false;
  };

  const deleteDriverById = async (driverId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/drivers/${driverId}`, { method: 'DELETE' });
      if (res.ok) {
        setAllDrivers(prev => prev.filter(d => d.id !== driverId && d.userId !== driverId));
        setAllUsers(prev => prev.filter(u => u.id !== driverId));
        if (driver?.id === driverId || user?.id === driverId) {
          logout();
        }
        return true;
      }
    } catch (e) {
      console.error('Failed to delete driver:', e);
    }
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        driver,
        role: user ? user.role : 'GUEST',
        allUsers,
        allDrivers,
        isLoading,
        switchPersona,
        loginWithCredentials,
        registerClient,
        logout,
        updateUser,
        updateDriver,
        loginWithTelegram,
        refreshAuth,
        deleteUserById,
        deleteDriverById
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
