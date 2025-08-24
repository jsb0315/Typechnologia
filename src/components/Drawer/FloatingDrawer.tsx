import React, { useState, useCallback } from 'react';
import { useSchema } from '../../App';
import { boxToTypeScript, parseBoxFromCode } from '../../utils/typeCodegen';

type Mode = 'idle' | 'export' | 'import';

// 간단 멀티 블록 파서: interface/type 선언 단위로 분리하여 parseBoxFromCode 시도
function parseMultipleBoxes(src: string) {
  const blocks: string[] = [];
  const lines = src.split(/\r?\n/);
  let current: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(interface|type)\s+[A-Za-z_$][\w$]*/.test(line) && current.length) {
      blocks.push(current.join('\n').trim());
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current.join('\n').trim());
  // /** 주석이 바로 위에 붙어 있는 경우 블록 분리 개선: 주석이 interface/type 이전 블록 끝에 잘렸을 수 있으므로 합치기
  for (let i = 0; i < blocks.length - 1; i++) {
    if (/\/\*\*/.test(blocks[i]) && !/\*\//.test(blocks[i])) { // 열린 주석이 닫히지 않은 경우 다음 블록과 결합
      blocks[i] = blocks[i] + '\n' + blocks[i + 1];
      blocks.splice(i + 1, 1); i--; // 재검사
    }
  }
  return blocks
    .map(b => parseBoxFromCode(b))
    .filter(Boolean) as any[];
}

const FloatingDrawer: React.FC = () => {
  const schema = useSchema();
  const [mode, setMode] = useState<Mode>('idle');
  const [exportCode, setExportCode] = useState('');
  const [importCode, setImportCode] = useState('');
  const [importResult, setImportResult] = useState<string | null>(null);

  const handleExport = useCallback(() => {
    const ids = schema.selection.length ? schema.selection : schema.order; // 선택 없으면 전체
    if (!ids.length) {
      setExportCode('// 내보낼 타입이 없습니다.');
      setMode('export');
      return;
    }
    const code = ids.map(id => boxToTypeScript(schema.boxes[id])).join('\n\n');
    setExportCode(code);
    setMode('export');
  }, [schema]);

  const handleImport = useCallback(() => {
    setMode(m => (m === 'import' ? 'idle' : 'import'));
    setImportResult(null);
  }, []);

  const performImport = useCallback(() => {
    const raw = importCode.trim();
    if (!raw) { setImportResult('코드가 비어 있습니다.'); return; }
    const parsed = parseMultipleBoxes(raw);
    if (!parsed.length) { setImportResult('유효한 interface/type 선언을 찾지 못했습니다.'); return; }
    let created = 0;
    parsed.forEach(p => {
      try {
        // 1단계: 기본 addType
        const model = schema.addType({ name: (p as any).name, kind: (p as any).kind, properties: (p as any).properties });
        // 2단계: 확장 필드 업데이트 (union/intersection/extends/comment)
        const patch: any = {};
        if ((p as any).unionTypes) patch.unionTypes = (p as any).unionTypes;
        if ((p as any).intersectionTypes) patch.intersectionTypes = (p as any).intersectionTypes;
        if ((p as any).extends) patch.extends = (p as any).extends;
        if ((p as any).comment) patch.comment = (p as any).comment;
        if (Object.keys(patch).length) {
          schema.updateBox(model.id, patch);
        }
        created++;
      } catch (e) {
        // swallow individual errors, continue
      }
    });
    setImportResult(`${created}개 타입 생성`);
    if (created) {
      setImportCode('');
      setMode('idle');
    }
  }, [importCode, schema]);

  const copyExport = useCallback(() => {
    if (!exportCode) return;
    navigator.clipboard.writeText(exportCode).catch(() => {});
  }, [exportCode]);

  return (
    <div className="absolute right-6 top-5 w-80 rounded-2xl border border-slate-200 bg-white/90 backdrop-blur shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-5 z-50 space-y-3">
      <div className="font-semibold text-slate-700">Import / Export Hub</div>
      <div className="flex gap-2">
        <button onClick={handleImport} className={`flex-1 h-10 text-base rounded-xl font-medium shadow transition ${mode==='import' ? 'bg-slate-700 text-white' : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-[.97]'}`}>Import</button>
        <button onClick={handleExport} className="flex-1 h-10 text-base rounded-xl bg-indigo-600 text-white font-medium shadow hover:bg-indigo-500 active:scale-[.97] transition">Export</button>
      </div>
      {mode === 'export' && (
        <div className="space-y-2">
          <textarea className="w-full h-60 text-lg font-mono p-2 rounded-lg border border-slate-300 bg-white/70 focus:outline-none focus:ring-2 focus:ring-indigo-400" readOnly value={exportCode} />
          <div className="flex gap-2">
            <button onClick={() => setMode('idle')} className="flex-1 h-9 text-lg rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium">닫기</button>
            <button onClick={copyExport} className="flex-1 h-9 text-lg rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium">복사</button>
          </div>
          <p className="text-sm text-slate-500">선택된 타입(없으면 전체)을 TS 코드로 출력합니다.</p>
        </div>
      )}
      {mode === 'import' && (
        <div className="space-y-2">
          <textarea placeholder={`interface User {\n  id: string;\n}\n\n// 혹은 type Alias = A | B`} value={importCode} onChange={e => setImportCode(e.target.value)} className="w-full h-56 text-lg font-mono p-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400" />
          {importResult && <div className="text-[11px] text-slate-600">{importResult}</div>}
          <div className="flex gap-2">
            <button onClick={() => { setMode('idle'); setImportResult(null); }} className="flex-1 h-9 text-sm rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium">취소</button>
            <button onClick={performImport} className="flex-1 h-9 text-sm rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium">생성</button>
          </div>
          <p className="text-sm text-slate-500">여러 interface/type 선언을 붙여넣으면 각각 TypeBox로 생성합니다.</p>
        </div>
      )}
      {mode === 'idle' && (
        <div className="pt-2 border-t border-slate-200 text-sm text-slate-500">선택 Export / 붙여넣기 Import 지원</div>
      )}
    </div>
  );
};

export default FloatingDrawer;
