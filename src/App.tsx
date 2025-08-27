import React, { createContext, useContext } from 'react';
import './App.css';
import Canvas from './components/Canvas/Canvas';
import Toolbar from './components/Toolbar/Toolbar';
// import FloatingTutorial from './components/Tutorial/FloatingTutorial';
import InspectorPanel from './components/Inspector/InspectorPanel';
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
  // console.log(store.state.boxes[store.state.selection[0]]);
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
        {/* <div
          className='grid-container absolute top-0 z-40 w-full px-4 pt-4 grid gap-3'
          style={{
            gridTemplateColumns: 'auto 2fr auto',
            gridTemplateRows: 'auto auto auto',
          }}> */}
          <div className='absolute w-fit h-full left-4 top-4 z-40'>
            <FloatingDrawer />
          </div>
          <div className='absolute w-fit h-full right-4 top-4 pb-8 z-40'>
            <InspectorPanel />
          </div>
        {/* </div> */}
        <div className="flex-1 relative">
          <Canvas />
        </div>
        <div className='flex items-center justify-center'>
          <div className=' absolute bottom-4 flex items-start justify-end z-40'>
            <Toolbar />
          </div>
        </div>
      </SchemaProvider>
      {/* <FloatingTutorial /> */}
    </div>
  );
}

export default App;
