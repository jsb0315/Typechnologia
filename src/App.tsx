import React, { createContext, useContext } from 'react';
import './App.css';
import Canvas from './components/Canvas/Canvas';
import Toolbar from './components/Toolbar/Toolbar';
import FloatingTutorial from './components/Tutorial/FloatingTutorial';
import { useSchemaGraph } from './hooks/useSchemaGraph';
import type { SchemaContextValue } from './types/TypeSchema';

export const SchemaContext = createContext<SchemaContextValue | null>(null);
export const useSchema = () => {
  const ctx = useContext(SchemaContext);
  if (!ctx) throw new Error('SchemaContext missing');
  return ctx;
};

export const SchemaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const schema = useSchemaGraph();
  return <SchemaContext.Provider value={schema}>{children}</SchemaContext.Provider>;
};

function App() {
  console.log('App rendered');
  return (
    <div className="w-screen h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900 relative flex flex-col">
      <SchemaProvider>
        <Toolbar />
        <div className="flex-1 relative">
          <Canvas />
        </div>
      </SchemaProvider>
      <FloatingTutorial />
    </div>
  );
}

export default App;
