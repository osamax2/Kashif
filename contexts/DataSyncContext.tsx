import React, { createContext, useCallback, useContext, useState } from 'react';

interface DataSyncContextType {
  refreshKey: number;
  triggerRefresh: () => void;
  reportCreated: () => void;
}

const DataSyncContext = createContext<DataSyncContextType | undefined>(undefined);

export function DataSyncProvider({ children }: { children: React.ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    console.log('🔄 Data sync triggered - all screens will refresh');
  }, []);

  const reportCreated = useCallback(() => {
    console.log('📝 New report created - triggering app-wide refresh');
    triggerRefresh();
  }, [triggerRefresh]);

  return (
    <DataSyncContext.Provider value={{ refreshKey, triggerRefresh, reportCreated }}>
      {children}
    </DataSyncContext.Provider>
  );
}

export function useDataSync() {
  const context = useContext(DataSyncContext);
  if (!context) {
    throw new Error('useDataSync must be used within DataSyncProvider');
  }
  return context;
}
