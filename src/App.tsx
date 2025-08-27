import React, { createContext, useContext } from 'react';
import './App.css';
import Canvas from './components/Canvas/Canvas';
import Toolbar from './components/Toolbar/Toolbar';
import FloatingTutorial from './components/Tutorial/FloatingTutorial';
import { useSchemaGraph } from './hooks/useSchemaGraph';
import FloatingDrawer from './components/Drawer/FloatingDrawer';
import type { SchemaStore, SchemaStateValue, SchemaActionsValue } from './types/TypeSchema';

// Backward compatibility combined context (optional usage)
interface CombinedContext extends SchemaStateValue, SchemaActionsValue {}

export const SchemaStateContext = createContext<SchemaStateValue | null>(null);
export const SchemaActionsContext = createContext<SchemaActionsValue | null>(null);
export const SchemaCombinedContext = createContext<CombinedContext | null>(null);

export const useSchemaState = () => {
  const ctx = useContext(SchemaStateContext);
  if (!ctx) throw new Error('SchemaStateContext missing');
  return ctx;
};
export const useSchemaActions = () => {
  const ctx = useContext(SchemaActionsContext);
  if (!ctx) throw new Error('SchemaActionsContext missing');
  return ctx;
};
export const useSchema = () => {
  const ctx = useContext(SchemaCombinedContext);
  if (!ctx) throw new Error('SchemaCombinedContext missing (use useSchemaState / useSchemaActions)');
  return ctx;
};

export const SchemaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store: SchemaStore = useSchemaGraph();
  const combined: CombinedContext = { ...store.state, ...store.actions };
  return (
    <SchemaStateContext.Provider value={store.state}>
      <SchemaActionsContext.Provider value={store.actions}>
        <SchemaCombinedContext.Provider value={combined}>{children}</SchemaCombinedContext.Provider>
      </SchemaActionsContext.Provider>
    </SchemaStateContext.Provider>
  );
};

function App() {
  console.log('App rendered');
  return (
    <div className="w-screen h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900 relative flex flex-col">
      <SchemaProvider>
        <div
          className='grid-container absolute top-0 z-40 w-full px-4 pt-4 grid gap-3'
          style={{
            gridTemplateColumns: 'auto 2fr auto',
            gridTemplateRows: 'auto auto auto',
          }}
        >
          {/* a: div1 (row1 col1) */}
          {/* <div
            className="px-4 py-2 rounded-2xl bg-white/60 backdrop-blur border border-slate-200 text-sm font-semibold text-slate-700 flex items-center justify-center shadow-sm"
            style={{ boxShadow: '0 2px 8px rgba(135,135,135,0.12)', 
              textShadow: '0 0px 10px rgba(135, 135, 135, 0.5)'
             }}
          >
            Typechnologia
          </div> */}
          {/* b: Toolbar (row1 col2) aligned right */}
          {/* c: FloatingDrawer (row2 col1) */}
            <FloatingDrawer />
            <div
            className="col-start-3 row-start-2 row-span-2 px-4 py-2 rounded-2xl bg-white/60 backdrop-blur border border-slate-200 text-sm font-semibold tracking-tight text-slate-700 flex items-center justify-center shadow-sm"
            style={{ boxShadow: '0 2px 8px rgba(135,135,135,0.12)' }}
            >
            Typechnologia
            </div>
        </div>
        <div className="flex-1 relative">
          <Canvas />
        </div>
        <div className='flex items-center justify-center'>
          <div className=' absolute bottom-4 flex items-start justify-end z-40'>
            <Toolbar />
          </div>
        </div>
      </SchemaProvider>
      <FloatingTutorial />
    </div>
  );
}

export default App;
