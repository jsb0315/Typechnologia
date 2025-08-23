# Typechnologia – TypeScript 타입 & 인터페이스 비주얼 매니저 (Prototype)

TypeScript 타입/인터페이스/enum 구조를 시각적으로 구성·학습·검토할 수 있는 로컬 퍼스트(서버리스) 프로토타입입니다. 초급자는 직관적 UI로 타입 시스템 감을 잡고, 중급 이상은 복잡한 타입 그래프를 설계/리뷰하는 생산성 도구로 확장 가능하도록 설계합니다.

## ✨ 핵심 기능 (Prototype Scope)
- 타입 박스(TypeBox) 생성 (버튼/단축키 N)
- 드래그로 위치 이동 (실시간 Canvas 갱신)
- 선택/선택 해제 (배경 클릭 / Esc)
- Export 버튼 및 콘솔 출력 (그래프 구조 확인)
- 라이트 모드 우선 + 유리감(blur) + 모던 쉐도우 UI

다음 기능은 로드맵에 포함되어 있으며 아직 미구현입니다:
- 관계(Relation) 라인 (extends / reference)
- LocalStorage 자동 저장 & 스냅샷
- JSON / TS Import & Export
- 단축키 튜토리얼 동적 컨텍스트
- 컨텍스트 메뉴, 속성 CRUD, AST 기반 타입 검증

## 🧱 아키텍처 개요
Architecture 상세는 `docs/ARCHITECTURE.md` 참고.

요약:
- 데이터 모델: `SchemaGraph` (boxes + relations) → 현재 relations 미사용
- 상태 관리: 커스텀 훅 `useSchemaGraph` + `SchemaProvider` (향후 Zustand 전환 고려)
- 렌더 구조: `Canvas` (배경 + TypeBox들) / `Toolbar` / `FloatingDrawer` / `FloatingTutorial`
- 퍼포먼스: TypeBox `React.memo` 적용, Provider 범위 최소화

## 📁 주요 폴더
```
src/
  components/
    Canvas/ (Canvas, TypeBox, 향후 RelationLine)
    Toolbar/
    Drawer/
    Tutorial/
    Common/
  hooks/ (useSchemaGraph 등)
  types/ (TypeSchema.ts)
  utils/ (id.ts 등)
  docs/ARCHITECTURE.md
```

## 🧩 데이터 모델 (요약)
```ts
type TypeKind = 'interface' | 'type' | 'enum';
interface Property { id: string; name: string; type: string; optional?: boolean }
interface TypeBoxModel {
  id: string; name: string; kind: TypeKind;
  properties: Property[]; position: { x: number; y: number };
  extends?: string[]; comment?: string; createdAt: number; updatedAt: number;
}
interface SchemaGraph { boxes: Record<string, TypeBoxModel>; order: string[]; version: number; updatedAt: number }
```

## ⌨️ 단축키 (현재 동작)
| Key | 기능 |
|-----|------|
| N | 새 타입 박스 추가 |
| Esc | 선택 해제 |

로드맵: Del(삭제), E(Export Drawer), Cmd+I/O(Import/Export), Cmd+S(스냅샷)

## 🚀 실행
개발 서버 실행:
```bash
npm install
npm run dev
```
브라우저에서 `http://localhost:5173` (기본 Vite 포트) 접속.

## 🛠 기술 스택
- React + TypeScript + Vite
- Tailwind CSS (v4, light-first)

## 🗺 로드맵 (우선순위 순)
1. LocalStorage 자동 저장 & 스냅샷 관리
2. 속성(Property) CRUD + 인라인 편집
3. Relation 라인(SVG) 및 extends 편집 UI
4. Import/Export (JSON) → TS 코드 생성
5. Command Palette / 검색
6. AST 파서 + 타입 유효성 (TS Worker)
7. 다크 모드 / 사용자 설정 Persist
8. 협업(멀티 커서) / CRDT